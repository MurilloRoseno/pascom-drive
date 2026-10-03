import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AssistenteFlutuante from '../components/AssistenteFlutuante.jsx';
import { reiniciarSite, WHATSAPP_PADRAO, carregarSite } from '../shared/site.js';

jest.mock('../lib/api', () => ({ obterSite: jest.fn(), perguntarAoAssistente: jest.fn() }));
const { obterSite, perguntarAoAssistente } = require('../lib/api');

const ligado = { whatsapp: '5599988887777', assistenteAtivo: true, modulos: {} };

function renderFab(url = '/', props = {}) {
  return render(<MemoryRouter initialEntries={[url]}><AssistenteFlutuante {...props} /></MemoryRouter>);
}

beforeEach(() => {
  reiniciarSite();
  obterSite.mockReset().mockResolvedValue(ligado);
  perguntarAoAssistente.mockReset();
});

describe('AssistenteFlutuante', () => {
  it('aparece quando o assistente está ligado e abre o chat numa janela', async () => {
    renderFab();
    const botao = await screen.findByRole('button', { name: /assistente/i });
    expect(botao).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(botao);
    expect(screen.getByRole('dialog', { name: 'Assistente' })).toBeInTheDocument();
    expect(screen.getByLabelText('Sua pergunta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /central de ajuda/i })).toHaveAttribute('href', '/ajuda');
  });

  it('responde pelo assistente e mostra a fonte', async () => {
    perguntarAoAssistente.mockResolvedValue({ tipo: 'faq', resposta: 'Cada foto custa R$ 5,00.', fonte: 'FAQ · Quanto custa cada foto?', relacionadas: [] });
    renderFab();
    await userEvent.click(await screen.findByRole('button', { name: /assistente/i }));
    await userEvent.type(screen.getByLabelText('Sua pergunta'), 'Quanto custa?');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Cada foto custa R$ 5,00.')).toBeInTheDocument();
    expect(screen.getByText('FAQ · Quanto custa cada foto?')).toBeInTheDocument();
  });

  it('Escape fecha a janela', async () => {
    renderFab();
    await userEvent.click(await screen.findByRole('button', { name: /assistente/i }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não aparece com o assistente desligado no painel', async () => {
    obterSite.mockResolvedValue({ ...ligado, assistenteAtivo: false });
    renderFab();
    await waitFor(() => expect(obterSite).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });

  it('não aparece se a API falhar (o site segue funcionando sem ele)', async () => {
    obterSite.mockRejectedValue(new Error('fora do ar'));
    renderFab();
    await waitFor(() => expect(obterSite).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });

  it.each(['/ajuda', '/checkout', '/pagamento/sucesso', '/evento/e1?view=foto&idx=0'])('some em %s', async (url) => {
    renderFab(url);
    await waitFor(() => expect(obterSite).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });

  it('no mobile usa as classes do app e sobe quando a barra do carrinho aparece', async () => {
    renderFab('/', { mobile: true, acima: true });
    const botao = await screen.findByRole('button', { name: /assistente/i });
    expect(botao).toHaveClass('aa-fab--mobile', 'aa-fab--acima');
  });
});

describe('conteúdo do site compartilhado', () => {
  it('usa o WhatsApp da configuração; vazio quer dizer "não mostrar" (não volta ao número antigo)', async () => {
    expect((await carregarSite()).whatsapp).toBe('5599988887777');
    reiniciarSite();
    obterSite.mockResolvedValue({ ...ligado, whatsapp: '' });
    expect((await carregarSite()).whatsapp).toBe('');
  });

  it('se a API falhar, o site segue com o número e os textos de sempre', async () => {
    obterSite.mockRejectedValue(new Error('fora do ar'));
    const s = await carregarSite();
    expect(s.whatsapp).toBe(WHATSAPP_PADRAO);
    expect(s.nome).toBe('Paróquia São Rafael');
  });

  it('carrega uma vez só por visita', async () => {
    await carregarSite();
    await carregarSite();
    expect(obterSite).toHaveBeenCalledTimes(1);
  });
});

describe('assistente e módulo de ajuda', () => {
  it('módulo de ajuda fora do ar esconde o botão, mesmo com o assistente ligado', async () => {
    obterSite.mockResolvedValue({ ...ligado, modulos: { ajuda: { ligado: false, recado: 'x' } } });
    renderFab();
    await waitFor(() => expect(obterSite).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });
});
