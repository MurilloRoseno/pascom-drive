import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AssistenteFlutuante from '../components/AssistenteFlutuante.jsx';
import { reiniciarContato, WHATSAPP_PADRAO, carregarContato } from '../shared/contato.js';

jest.mock('../lib/api', () => ({ obterFaq: jest.fn(), perguntarAoAssistente: jest.fn() }));
const { obterFaq, perguntarAoAssistente } = require('../lib/api');

const ligado = { temas: [], perguntas: [], whatsapp: '5599988887777', assistenteAtivo: true };

function renderFab(url = '/', props = {}) {
  return render(<MemoryRouter initialEntries={[url]}><AssistenteFlutuante {...props} /></MemoryRouter>);
}

beforeEach(() => {
  reiniciarContato();
  obterFaq.mockReset().mockResolvedValue(ligado);
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
    obterFaq.mockResolvedValue({ ...ligado, assistenteAtivo: false });
    renderFab();
    await waitFor(() => expect(obterFaq).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });

  it('não aparece se a API falhar (o site segue funcionando sem ele)', async () => {
    obterFaq.mockRejectedValue(new Error('fora do ar'));
    renderFab();
    await waitFor(() => expect(obterFaq).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });

  it.each(['/ajuda', '/checkout', '/pagamento/sucesso', '/evento/e1?view=foto&idx=0'])('some em %s', async (url) => {
    renderFab(url);
    await waitFor(() => expect(obterFaq).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /assistente/i })).not.toBeInTheDocument();
  });

  it('no mobile usa as classes do app e sobe quando a barra do carrinho aparece', async () => {
    renderFab('/', { mobile: true, acima: true });
    const botao = await screen.findByRole('button', { name: /assistente/i });
    expect(botao).toHaveClass('aa-fab--mobile', 'aa-fab--acima');
  });
});

describe('contato compartilhado', () => {
  it('usa o WhatsApp da configuração e, se vier vazio, o número que já existia no site', async () => {
    expect((await carregarContato()).whatsapp).toBe('5599988887777');
    reiniciarContato();
    obterFaq.mockResolvedValue({ ...ligado, whatsapp: '' });
    expect((await carregarContato()).whatsapp).toBe(WHATSAPP_PADRAO);
  });

  it('carrega uma vez só por visita', async () => {
    await carregarContato();
    await carregarContato();
    expect(obterFaq).toHaveBeenCalledTimes(1);
  });
});
