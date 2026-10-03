import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesktopApp from '../desktop/DesktopApp.jsx';
import MobileApp from '../mobile/MobileApp.jsx';
import { reiniciarSite } from '../shared/site.js';

jest.mock('../lib/api', () => ({
  listarEventos: jest.fn().mockResolvedValue({ eventos: [] }),
  listarCategorias: jest.fn().mockResolvedValue([]),
  obterFaq: jest.fn(),
  obterSite: jest.fn(),
  obterAgenda: jest.fn(),
  obterProximas: jest.fn(),
  perguntarAoAssistente: jest.fn(),
}));
const api = require('../lib/api');

const TIPOS = [{ id: 'missa', nome: 'Missa' }];
const FAQ = {
  temas: [{ id: 'comprar', nome: 'Comprar fotos' }],
  perguntas: [{ id: 'f1', tema: 'comprar', pergunta: 'Como compro uma foto?', resposta: 'Escolha e pague.', passos: [], imagem: '', imagemLegenda: '', video: '', videoTitulo: '' }],
  whatsapp: '5599988887777',
  assistenteAtivo: true,
};
const OCORRENCIA = {
  id: 'a', titulo: 'Missa dominical', data: '2026-10-04', hora: '08:00', horaFim: '', local: 'Matriz', tipo: 'missa', descricao: '', recorrencia: 'semanal',
};

function irPara(caminho) {
  window.history.pushState({}, '', caminho);
}

beforeEach(() => {
  reiniciarSite();
  api.obterSite.mockReset().mockResolvedValue({ whatsapp: '5599988887777', assistenteAtivo: true, modulos: {} });
  api.obterFaq.mockReset().mockResolvedValue(FAQ);
  api.obterAgenda.mockReset().mockResolvedValue({ mes: '2026-10', hoje: '2026-10-03', tipos: TIPOS, ocorrencias: [OCORRENCIA] });
  api.obterProximas.mockReset().mockResolvedValue({ hoje: '2026-10-03', tipos: TIPOS, ocorrencias: [OCORRENCIA] });
});

describe.each([
  ['desktop', DesktopApp],
  ['mobile', MobileApp],
])('rotas de ajuda e agenda no %s', (_nome, App) => {
  it('/ajuda mostra a Central de Ajuda com o assistente e o WhatsApp da configuração', async () => {
    irPara('/ajuda');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Central de Ajuda' })).toBeInTheDocument();
    // a pergunta da FAQ (o assistente também sugere o mesmo texto num botão)
    expect(await screen.findByText('Como compro uma foto?', { selector: 'summary' })).toBeInTheDocument();
    const naoResolveu = screen.getByRole('heading', { name: 'Não resolveu?' }).parentElement;
    expect(within(naoResolveu).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5599988887777');
    // o botão flutuante não se repete dentro da própria Central de Ajuda
    expect(screen.queryByRole('button', { name: 'Assistente' })).not.toBeInTheDocument();
  });

  it('/agenda mostra o calendário com os compromissos do mês pedido', async () => {
    irPara('/agenda?mes=2026-10');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Agenda da paróquia' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'domingo, 4 de outubro, 1 compromisso' })).toBeInTheDocument();
    expect(api.obterAgenda).toHaveBeenCalledWith('2026-10');
  });

  it('nas telas comuns o botão do assistente aparece e abre o chat', async () => {
    irPara('/privacidade');
    render(<App />);
    const botao = await screen.findByRole('button', { name: /assistente/i });
    await userEvent.click(botao);
    expect(screen.getByRole('dialog', { name: 'Assistente' })).toBeInTheDocument();
  });
});

describe('contato da secretaria vem da configuração', () => {
  it('desktop: o rodapé usa o WhatsApp configurado no painel, formatado', async () => {
    irPara('/privacidade');
    render(<DesktopApp />);
    const telefone = await screen.findByRole('link', { name: '(99) 98888-7777' });
    expect(telefone).toHaveAttribute('href', 'https://wa.me/5599988887777');
    expect(screen.getByRole('link', { name: /falar no whatsapp/i })).toHaveAttribute('href', 'https://wa.me/5599988887777');
  });

  it('mobile: o perfil abre agenda e ajuda e fala com a secretaria no número configurado', async () => {
    irPara('/perfil');
    render(<MobileApp />);
    expect(await screen.findByRole('button', { name: /agenda da paróquia/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /central de ajuda e assistente/i })).toBeInTheDocument();
    const zap = await screen.findByRole('link', { name: /falar com a secretaria/i });
    await waitFor(() => expect(zap).toHaveAttribute('href', 'https://wa.me/5599988887777'));
  });
});

describe('agenda real nas páginas iniciais', () => {
  it('desktop: "Próximas Atividades" lê a agenda e leva para ela', async () => {
    irPara('/');
    render(<DesktopApp />);
    const item = await screen.findByRole('link', { name: 'Ver na agenda: Missa dominical' });
    expect(item).toHaveAttribute('href', '/agenda?mes=2026-10&dia=2026-10-04');
    expect(screen.getByRole('link', { name: /ver a agenda completa/i })).toHaveAttribute('href', '/agenda');
    expect(api.obterProximas).toHaveBeenCalledWith(4);
  });

  it('mobile: a Home mostra os compromissos reais, não a lista fixa antiga', async () => {
    irPara('/');
    render(<MobileApp />);
    expect(await screen.findByText('Missa dominical')).toBeInTheDocument();
    expect(screen.queryByText('Festa de Corpus Christi')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver a agenda completa/i })).toBeInTheDocument();
  });

  it('mobile: sem compromissos (ou com a API fora), a Home diz isso em vez de inventar datas', async () => {
    api.obterProximas.mockResolvedValue({ hoje: '2026-10-03', tipos: TIPOS, ocorrencias: [] });
    irPara('/');
    render(<MobileApp />);
    expect(await screen.findByText('Nenhuma atividade na agenda por enquanto.')).toBeInTheDocument();
  });
});
