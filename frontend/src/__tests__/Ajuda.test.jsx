import { render as renderRTL, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import AjudaPage from '../pages/Ajuda.jsx';
import AssistenteChat from '../components/AssistenteChat.jsx';

jest.mock('../lib/api', () => ({ obterFaq: jest.fn(), perguntarAoAssistente: jest.fn() }));
const { obterFaq, perguntarAoAssistente } = require('../lib/api');

// A página usa a URL (?pergunta=): precisa de um roteador.
const render = (ui, url = '/ajuda') => renderRTL(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>);

const DADOS = {
  temas: [
    { id: 'comprar', nome: 'Comprar fotos' },
    { id: 'pagar', nome: 'Pagamento' },
    { id: 'prazo', nome: 'Prazos' },
  ],
  perguntas: [
    { id: 'a', tema: 'comprar', pergunta: 'Como compro uma foto?', resposta: 'Escolha e pague.', passos: ['Escolha as fotos', 'Pague'], imagem: '', imagemLegenda: '', video: '', videoTitulo: '' },
    { id: 'b', tema: 'pagar', pergunta: 'O pagamento é seguro?', resposta: 'Os dados do cartão vão direto para a Stripe.', passos: [], imagem: 'https://x.com/p.png', imagemLegenda: 'Tela de pagamento', video: 'https://youtu.be/abc', videoTitulo: 'Como pagar' },
  ],
  whatsapp: '5599988887777',
  assistenteAtivo: true,
};

beforeEach(() => {
  obterFaq.mockReset().mockResolvedValue(DADOS);
  perguntarAoAssistente.mockReset();
});

describe('Central de Ajuda', () => {
  it('lista as perguntas e os temas que têm pergunta (tema sem pergunta não aparece)', async () => {
    render(<AjudaPage />);
    expect(await screen.findByText('Como compro uma foto?', { selector: 'summary' })).toBeInTheDocument();
    const filtro = screen.getByRole('group', { name: 'Filtrar por assunto' });
    expect(within(filtro).getByRole('button', { name: 'Pagamento' })).toBeInTheDocument();
    expect(within(filtro).queryByRole('button', { name: 'Prazos' })).not.toBeInTheDocument();
  });

  it('abre a pergunta com resposta, passo a passo numerado, imagem com legenda e vídeo seguro', async () => {
    render(<AjudaPage />);
    await userEvent.click(await screen.findByText('Como compro uma foto?', { selector: 'summary' }));
    expect(screen.getByText('Escolha e pague.')).toBeVisible();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(expect.arrayContaining(['Escolha as fotos', 'Pague']));

    await userEvent.click(screen.getByText('O pagamento é seguro?'));
    expect(screen.getByRole('img', { name: 'Tela de pagamento' })).toHaveAttribute('src', 'https://x.com/p.png');
    const video = screen.getByRole('link', { name: /Assistir ao vídeo: Como pagar/ });
    expect(video).toHaveAttribute('href', 'https://youtu.be/abc');
    expect(video).toHaveAttribute('target', '_blank');
    expect(video).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('filtra por tema', async () => {
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    await userEvent.click(screen.getByRole('button', { name: 'Pagamento' }));
    expect(screen.queryByText('Como compro uma foto?', { selector: 'summary' })).not.toBeInTheDocument();
    expect(screen.getByText('O pagamento é seguro?')).toBeInTheDocument();
  });

  it('busca ignorando acento e caixa, também dentro da resposta e dos passos', async () => {
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    await userEvent.type(screen.getByRole('searchbox'), 'ESTRIPE');
    expect(screen.queryByText('O pagamento é seguro?')).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'segurO');
    expect(screen.getByText('O pagamento é seguro?')).toBeInTheDocument();
    expect(screen.queryByText('Como compro uma foto?', { selector: 'summary' })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.type(screen.getByRole('searchbox'), 'escolha as fotos');
    expect(screen.getByText('Como compro uma foto?', { selector: 'summary' })).toBeInTheDocument();
  });

  it('sem resultado, sugere outra palavra ou o assistente', async () => {
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    await userEvent.type(screen.getByRole('searchbox'), 'zzzz');
    expect(screen.getByText(/Nenhuma pergunta encontrada/)).toBeInTheDocument();
  });

  it('WhatsApp aparece como canal secundário, no final, com link wa.me', async () => {
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    expect(screen.getByText('Não resolveu?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/5599988887777');
  });

  it('sem WhatsApp configurado, orienta a procurar a secretaria (sem link quebrado)', async () => {
    obterFaq.mockResolvedValue({ ...DADOS, whatsapp: '' });
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    expect(screen.queryByRole('link', { name: 'WhatsApp' })).not.toBeInTheDocument();
    expect(screen.getByText(/Procure a secretaria/)).toBeInTheDocument();
  });

  it('assistente desligado no painel: não mostra o chat', async () => {
    obterFaq.mockResolvedValue({ ...DADOS, assistenteAtivo: false });
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    expect(screen.queryByText('Pergunte ao assistente')).not.toBeInTheDocument();
  });

  it('erro de carga mostra aviso amigável', async () => {
    obterFaq.mockRejectedValue(new Error('x'));
    render(<AjudaPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a ajuda');
  });
});

describe('abrir uma pergunta pela URL', () => {
  it('?pergunta=<id> já abre aquela pergunta (links da página inicial)', async () => {
    render(<AjudaPage />, '/ajuda?pergunta=b');
    await screen.findByText('O pagamento é seguro?', { selector: 'summary' });
    expect(document.getElementById('faq-b')).toHaveAttribute('open');
    expect(document.getElementById('faq-a')).not.toHaveAttribute('open');
  });
});

describe('AssistenteChat', () => {
  it('mostra sugestões; clicar numa envia a pergunta e mostra a resposta com a fonte', async () => {
    perguntarAoAssistente.mockResolvedValue({ tipo: 'faq', resposta: 'Cada foto custa R$ 5,00.', fonte: 'FAQ · Quanto custa cada foto?', relacionadas: [] });
    render(<AssistenteChat />);
    await userEvent.click(screen.getByRole('button', { name: 'Quanto custa uma foto?' }));
    expect(await screen.findByText('Cada foto custa R$ 5,00.')).toBeInTheDocument();
    expect(screen.getByText('FAQ · Quanto custa cada foto?')).toBeInTheDocument();
    expect(perguntarAoAssistente).toHaveBeenCalledWith('Quanto custa uma foto?');
  });

  it('envia o que foi digitado e limpa o campo; botão desabilitado com texto curto', async () => {
    perguntarAoAssistente.mockResolvedValue({ tipo: 'fora', resposta: 'Só consigo ajudar com o site.', fonte: 'Fora do escopo', relacionadas: [] });
    render(<AssistenteChat />);
    const enviar = screen.getByRole('button', { name: 'Enviar' });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Sua pergunta'), 'capital da França');
    expect(enviar).toBeEnabled();
    await userEvent.click(enviar);
    expect(await screen.findByText('Só consigo ajudar com o site.')).toBeInTheDocument();
    expect(screen.getByLabelText('Sua pergunta')).toHaveValue('');
    expect(screen.getByText('Fora do escopo')).toBeInTheDocument();
  });

  it('limite de mensagens ou assistente desligado: mostra o aviso do servidor', async () => {
    perguntarAoAssistente.mockRejectedValue(Object.assign(new Error('Você fez muitas perguntas seguidas.'), { status: 429 }));
    render(<AssistenteChat />);
    await userEvent.type(screen.getByLabelText('Sua pergunta'), 'oi tudo bem');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Você fez muitas perguntas seguidas.')).toBeInTheDocument();
  });

  it('perguntas relacionadas abrem a pergunta da FAQ', async () => {
    const abrir = jest.fn();
    perguntarAoAssistente.mockResolvedValue({ tipo: 'faq', resposta: 'R', fonte: 'FAQ', relacionadas: [{ id: 'b', pergunta: 'O pagamento é seguro?' }] });
    render(<AssistenteChat onAbrirPergunta={abrir} />);
    await userEvent.click(screen.getByRole('button', { name: 'Como compro uma foto?' }));
    await userEvent.click(await screen.findByRole('button', { name: 'O pagamento é seguro?' }));
    expect(abrir).toHaveBeenCalledWith('b');
  });

  it('o campo limita a 300 caracteres e a conversa não é guardada (some ao recarregar)', async () => {
    render(<AssistenteChat />);
    expect(screen.getByLabelText('Sua pergunta')).toHaveAttribute('maxlength', '300');
    expect(window.localStorage.length).toBe(0);
  });

  it('a conversa é uma região com aria-live para leitores de tela', () => {
    render(<AssistenteChat />);
    expect(screen.getByRole('log', { name: 'Conversa com o assistente' })).toHaveAttribute('aria-live', 'polite');
  });
});

describe('perguntas relacionadas na página', () => {
  it('clicar numa relacionada abre a pergunta e limpa a busca', async () => {
    perguntarAoAssistente.mockResolvedValue({ tipo: 'faq', resposta: 'R', fonte: 'FAQ', relacionadas: [{ id: 'b', pergunta: 'O pagamento é seguro?' }] });
    render(<AjudaPage />);
    await screen.findByText('Como compro uma foto?', { selector: 'summary' });
    await userEvent.click(screen.getByRole('button', { name: 'Como compro uma foto?' }));
    const relacionada = await screen.findByRole('button', { name: 'O pagamento é seguro?' });
    await userEvent.click(relacionada);
    await waitFor(() => expect(document.getElementById('faq-b')).toHaveAttribute('open'));
  });
});
