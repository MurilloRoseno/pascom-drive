import { render, screen, waitFor, within } from '@testing-library/react';
import DesktopApp from '../desktop/DesktopApp.jsx';
import MobileApp from '../mobile/MobileApp.jsx';
import { reiniciarSite } from '../shared/site.js';

jest.mock('../lib/api', () => ({
  listarEventos: jest.fn(),
  listarCategorias: jest.fn().mockResolvedValue([]),
  obterSite: jest.fn(),
  obterFaq: jest.fn().mockResolvedValue({ temas: [], perguntas: [], whatsapp: '', assistenteAtivo: false }),
  obterAgenda: jest.fn().mockResolvedValue({ mes: '2026-10', hoje: '2026-10-03', tipos: [], ocorrencias: [] }),
  obterProximas: jest.fn(),
  perguntarAoAssistente: jest.fn(),
  obterEvento: jest.fn().mockResolvedValue({ event: null }),
  listarFotosEvento: jest.fn().mockResolvedValue({ event: {}, photos: [] }),
  listarOfertasEvento: jest.fn().mockResolvedValue({ offers: { coupons: [], packages: [] } }),
}));
const api = require('../lib/api');

const EVENTO = {
  eventoId: 'EVT_1', title: 'Missa de Páscoa', date: '2026-04-05', location: 'Matriz', visibility: 'publica', totalFotos: 12,
};
const BLOCOS = [
  { id: 'categorias', titulo: 'Sacramentos e celebrações' },
  { id: 'eventos', titulo: 'Eventos recentes' },
  { id: 'missao', titulo: 'Nossa missão' },
  { id: 'agenda', titulo: 'Próximas atividades' },
  { id: 'contato', titulo: 'Estamos aqui para acolher sua família.' },
];
const SITE = {
  nome: 'Paróquia São Rafael',
  cidade: 'Açailândia – MA',
  lema: '',
  email: 'secretaria@exemplo.org',
  whatsapp: '5599988887777',
  endereco: 'Rua Nova, 10, Centro, Açailândia - MA',
  horario: 'Segunda a sexta: 9h às 12h',
  instagram: 'https://www.instagram.com/paroquia/',
  facebook: '',
  youtube: 'https://www.youtube.com/@paroquia',
  versiculo: 'O Senhor é o meu pastor.',
  referencia: 'Salmo 23',
  missao: null,
  numeros: [],
  depoimentos: [],
  assistenteAtivo: true,
  home: { blocos: BLOCOS, destaque: null },
  modulos: {},
  precos: { foto: 7.5, taxaServico: 3, taxaComodidade: 1.5 },
};
const ligado = { ligado: true, recado: 'ok' };
const desligado = (recado) => ({ ligado: false, recado });

function irPara(caminho) {
  window.history.pushState({}, '', caminho);
}
const comSite = (extra) => api.obterSite.mockResolvedValue({ ...SITE, ...extra });

beforeEach(() => {
  reiniciarSite();
  jest.clearAllMocks();
  api.listarEventos.mockResolvedValue({ eventos: [EVENTO] });
  api.obterProximas.mockResolvedValue({ hoje: '2026-10-03', tipos: [], ocorrencias: [] });
  comSite({});
});

describe('módulo desligado no painel: o site explica em vez de quebrar (desktop e mobile)', () => {
  describe.each([['desktop', DesktopApp], ['mobile', MobileApp]])('%s', (_n, App) => {
    it.each([
      ['/agenda', 'agenda', 'Agenda em reforma.'],
      ['/ajuda', 'ajuda', 'Ajuda volta amanhã.'],
      ['/buscar', 'busca', 'Galerias em manutenção.'],
      ['/checkout', 'checkout', 'Vendas pausadas.'],
    ])('%s com o módulo %s fora do ar mostra o recado e o caminho de volta', async (rota, modulo, recado) => {
      comSite({ modulos: { [modulo]: desligado(recado) } });
      irPara(rota);
      render(<App />);
      expect(await screen.findByText(recado)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Em manutenção');
      expect(screen.getByRole('link', { name: 'Voltar à página inicial' })).toHaveAttribute('href', '/');
    });

    it('a página de um módulo ligado continua normal', async () => {
      comSite({ modulos: { agenda: ligado, ajuda: desligado('x') } });
      irPara('/agenda?mes=2026-10');
      render(<App />);
      expect(await screen.findByRole('heading', { name: 'Agenda da paróquia' })).toBeInTheDocument();
    });

    it('recuperar pedido e a política de privacidade nunca saem do ar', async () => {
      comSite({ modulos: { busca: desligado('x'), checkout: desligado('x'), agenda: desligado('x'), ajuda: desligado('x') } });
      irPara('/privacidade');
      render(<App />);
      expect(await screen.findByText(/Política de Privacidade/i, { selector: 'h1, h2' })).toBeInTheDocument();
      expect(screen.queryByText('Em manutenção')).not.toBeInTheDocument();
    });
  });
});

describe('desktop: navegação, rodapé e conteúdo vêm do painel', () => {
  it('o cabeçalho e o rodapé escondem os links dos módulos desligados', async () => {
    comSite({ modulos: { agenda: desligado('x'), ajuda: desligado('x') } });
    irPara('/privacidade');
    render(<DesktopApp />);
    const nav = await screen.findByRole('navigation', { name: 'Navegação principal' });
    await screen.findAllByText(SITE.endereco);
    expect(within(nav).queryByRole('link', { name: 'Agenda' })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Ajuda' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Eventos' })).toBeInTheDocument();
    const rodape = document.querySelector('footer.institutional-footer');
    expect(within(rodape).queryByRole('link', { name: 'Central de ajuda' })).not.toBeInTheDocument();
    expect(within(rodape).queryByRole('link', { name: 'Agenda' })).not.toBeInTheDocument();
    expect(within(rodape).getByRole('link', { name: 'Eventos' })).toBeInTheDocument();
  });

  it('o rodapé mostra endereço, horário, e-mail, redes e versículo configurados; rede vazia não aparece', async () => {
    irPara('/privacidade');
    render(<DesktopApp />);
    await screen.findAllByText(SITE.endereco);
    const rodape = document.querySelector('footer.institutional-footer');
    expect(await within(rodape).findByText(SITE.horario)).toBeInTheDocument();
    expect(within(rodape).getByRole('link', { name: SITE.email })).toHaveAttribute('href', `mailto:${SITE.email}`);
    expect(within(rodape).getByText('(99) 98888-7777')).toBeInTheDocument();
    expect(within(rodape).getByText('“O Senhor é o meu pastor.”')).toBeInTheDocument();
    expect(within(rodape).getByText('Salmo 23')).toBeInTheDocument();
    expect(within(rodape).getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', SITE.instagram);
    expect(within(rodape).getByRole('link', { name: 'YouTube' })).toHaveAttribute('href', SITE.youtube);
    expect(within(rodape).queryByRole('link', { name: 'Facebook' })).not.toBeInTheDocument();
  });

  it('campos apagados no painel somem do rodapé (WhatsApp, e-mail e horário)', async () => {
    comSite({ whatsapp: '', email: '', horario: '', versiculo: '' });
    irPara('/privacidade');
    render(<DesktopApp />);
    await screen.findAllByText(SITE.endereco);
    const rodape = document.querySelector('footer.institutional-footer');
    await waitFor(() => expect(within(rodape).queryByRole('link', { name: /Falar no WhatsApp/ })).not.toBeInTheDocument());
    expect(within(rodape).queryByRole('link', { name: /Enviar e-mail/ })).not.toBeInTheDocument();
    expect(within(rodape).queryByText('Horário da secretaria')).not.toBeInTheDocument();
    expect(within(rodape).queryByText(/Tudo posso/)).not.toBeInTheDocument();
  });

  it('a política de privacidade usa o nome e o e-mail do site, e nunca fica sem contato', async () => {
    comSite({ email: '' });
    irPara('/privacidade');
    render(<DesktopApp />);
    expect((await screen.findAllByRole('link', { name: 'paroquiasaorafael@hotmail.com' })).length).toBeGreaterThan(0);
  });
});

describe('desktop: página inicial em blocos', () => {
  const titulos = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

  it('sem configuração, a Home continua como era: sem depoimentos nem números inventados', async () => {
    irPara('/');
    render(<DesktopApp />);
    expect(await screen.findByRole('heading', { name: 'Eventos recentes' })).toBeInTheDocument();
    expect(titulos()).toEqual(expect.arrayContaining(['Sacramentos e celebrações', 'Eventos recentes', 'Próximas atividades']));
    expect(screen.queryByText(/O que dizem/i)).not.toBeInTheDocument();
    expect(screen.queryByText('2.000+')).not.toBeInTheDocument();
    expect(screen.getByText(/Há décadas servindo à comunidade/)).toBeInTheDocument();
  });

  it('segue a ordem e os títulos do painel e ignora blocos que o computador não tem', async () => {
    comSite({
      home: {
        blocos: [
          { id: 'agenda', titulo: 'Próximas missas' },
          { id: 'contato', titulo: 'Fale conosco' },
          { id: 'eventos', titulo: 'Fotos recentes' },
        ],
        destaque: null,
      },
    });
    irPara('/');
    render(<DesktopApp />);
    await screen.findByRole('heading', { name: 'Fotos recentes' });
    const ordem = titulos().filter((t) => ['Próximas missas', 'Fotos recentes'].includes(t));
    expect(ordem).toEqual(['Próximas missas', 'Fotos recentes']);
    expect(screen.queryByText('Fale conosco')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sacramentos e celebrações' })).not.toBeInTheDocument();
  });

  it('mostra o evento em destaque com link para a galeria', async () => {
    comSite({ home: { blocos: [{ id: 'destaque', titulo: 'Em destaque' }, ...BLOCOS], destaque: { eventoId: 'EVT_1', nome: 'Missa de Páscoa' } } });
    irPara('/');
    render(<DesktopApp />);
    const secao = (await screen.findByRole('heading', { name: 'Em destaque' })).closest('section');
    expect(within(secao).getByRole('link', { name: /Missa de Páscoa/ })).toHaveAttribute('href', '/evento/EVT_1');
  });

  it('missão, números e depoimentos cadastrados no painel aparecem; sem números a faixa some', async () => {
    comSite({
      missao: { titulo: 'Servir em comunhão', paragrafos: ['Primeiro parágrafo.', 'Segundo parágrafo.'] },
      numeros: [{ valor: '40+', rotulo: 'anos de história' }],
      depoimentos: [{ autor: 'Ana Lima', funcao: 'Coral', texto: 'Muito bom.' }],
      home: { blocos: [...BLOCOS, { id: 'depoimentos', titulo: 'Quem já passou por aqui' }], destaque: null },
    });
    irPara('/');
    render(<DesktopApp />);
    expect(await screen.findByRole('heading', { name: 'Servir em comunhão' })).toBeInTheDocument();
    expect(screen.getByText('Segundo parágrafo.')).toBeInTheDocument();
    expect(screen.getByText('40+')).toBeInTheDocument();
    expect(screen.getByText('anos de história')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quem já passou por aqui' })).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Muito bom.')).toBeInTheDocument();
    expect(screen.queryByText(/Há décadas servindo/)).not.toBeInTheDocument();
  });
});

describe('mobile: página inicial, navegação e preço', () => {
  it('o menu de baixo esconde Galerias e Calendário quando as galerias e a agenda estão fora do ar', async () => {
    comSite({ modulos: { busca: desligado('x'), agenda: desligado('x') } });
    irPara('/perfil');
    render(<MobileApp />);
    await screen.findByText('Sua área');
    const menu = screen.getByRole('navigation');
    await waitFor(() => expect(within(menu).queryByText('Galerias')).not.toBeInTheDocument());
    expect(within(menu).queryByText('Calendário')).not.toBeInTheDocument();
    expect(within(menu).getByText('Início')).toBeInTheDocument();
    expect(within(menu).getByText('Perfil')).toBeInTheDocument();
  });

  it('só com a agenda no ar, o item "Calendário" do menu leva para a agenda', async () => {
    comSite({ modulos: { busca: desligado('x') } });
    irPara('/perfil');
    render(<MobileApp />);
    await screen.findByText('Sua área');
    await waitFor(() => expect(within(screen.getByRole('navigation')).queryByText('Galerias')).not.toBeInTheDocument());
    expect(within(screen.getByRole('navigation')).getByText('Calendário')).toBeInTheDocument();
  });

  it('sem checkout no ar o carrinho some da barra de cima', async () => {
    comSite({ modulos: { checkout: desligado('x') } });
    irPara('/');
    render(<MobileApp />);
    await screen.findByText('Missa de Páscoa');
    expect(screen.queryByTitle('Carrinho')).not.toBeInTheDocument();
  });

  it('com o checkout no ar o carrinho aparece', async () => {
    irPara('/');
    render(<MobileApp />);
    await screen.findByText('Missa de Páscoa');
    expect(screen.getByTitle('Carrinho')).toBeInTheDocument();
  });

  it('o preço dos cartões vem do painel (R$ 7,50), nunca o R$ 10 antigo', async () => {
    irPara('/');
    render(<MobileApp />);
    expect(await screen.findByText(/12 fotos · R\$ 7,50 cada/)).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 10,00/)).not.toBeInTheDocument();
  });

  it('o nome do app e a cidade vêm do site', async () => {
    comSite({ nome: 'Paróquia Santa Luzia', cidade: 'Imperatriz – MA' });
    irPara('/');
    render(<MobileApp />);
    expect(await screen.findByText('Imperatriz – MA')).toBeInTheDocument();
    expect(screen.getByText('Santa Luzia')).toBeInTheDocument();
  });

  it('a Home segue a ordem do painel e esconde blocos desligados por módulo', async () => {
    comSite({
      modulos: { agenda: desligado('x') },
      home: { blocos: [{ id: 'contato', titulo: 'Fale conosco' }, { id: 'agenda', titulo: 'Próximas atividades' }, { id: 'eventos', titulo: 'Eventos recentes' }], destaque: null },
    });
    irPara('/');
    render(<MobileApp />);
    expect(await screen.findByRole('heading', { name: 'Fale conosco' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Próximas atividades' })).not.toBeInTheDocument());
    const ordem = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(ordem.indexOf('Fale conosco')).toBeLessThan(ordem.indexOf('Eventos recentes'));
  });

  it('a seção de contato esconde o botão do WhatsApp se o número foi apagado', async () => {
    comSite({ whatsapp: '' });
    irPara('/');
    render(<MobileApp />);
    await screen.findByRole('heading', { name: 'Estamos aqui para acolher sua família.' });
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /E-mail/ })).toHaveAttribute('href', `mailto:${SITE.email}`);
  });
});
