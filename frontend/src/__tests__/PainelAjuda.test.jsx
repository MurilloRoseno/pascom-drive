import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Ajuda from '../painel/pages/Ajuda.jsx';
import { renderPainel, resposta, chamadas, TODAS } from '../test-utils/painel.jsx';

const TEMAS = [
  { id: 'comprar', nome: 'Comprar fotos' },
  { id: 'pagar', nome: 'Pagamento' },
  { id: 'problemas', nome: 'Problemas' },
];
const base = { passos: [], imagem: '', imagemLegenda: '', video: '', videoTitulo: '', ordem: 1 };
const PERGUNTAS = [
  { ...base, id: 'f1', tema: 'comprar', pergunta: 'Como compro uma foto?', resposta: 'Escolha e pague.', passos: ['Escolha', 'Pague'], publicada: true },
  { ...base, id: 'f2', tema: 'pagar', pergunta: 'Aceitam débito?', resposta: '', publicada: false },
];

function rotas(extra = {}, dados = {}) {
  return (url, opcoes) => {
    const chave = `${opcoes.method || 'GET'} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (extra[chave]) return extra[chave](opcoes);
    if (chave === 'GET /api/pascom/faq') return resposta(200, { temas: TEMAS, perguntas: PERGUNTAS, semResposta: ['Posso pagar em dinheiro?'], ...dados });
    return resposta(404, { error: `sem rota: ${chave}` });
  };
}

const corpo = (o) => JSON.parse(o.body);
const aberta = () => screen.findByRole('heading', { name: 'Cobertura por tema' });

describe('painel — Central de Ajuda', () => {
  it('mostra a cobertura por tema contando só as respostas publicadas', async () => {
    renderPainel(<Ajuda />, { rotas: rotas() });
    const cobertura = (await aberta()).closest('section');
    expect(within(cobertura).getByText('Comprar fotos').nextSibling.nextSibling).toHaveTextContent('1 resp.');
    expect(within(cobertura).getByText('Pagamento').nextSibling.nextSibling).toHaveTextContent('0 resp.');
  });

  it('lista as perguntas com estado e filtra por tema, com contagem', async () => {
    renderPainel(<Ajuda />, { rotas: rotas() });
    await aberta();
    const lista = screen.getByRole('heading', { name: 'Perguntas' }).closest('section');
    expect(within(lista).getByText('Publicada')).toBeInTheDocument();
    expect(within(lista).getByText('Rascunho')).toBeInTheDocument();
    await userEvent.click(within(lista).getByRole('button', { name: 'Pagamento · 1' }));
    expect(within(lista).queryByText('Como compro uma foto?')).not.toBeInTheDocument();
    expect(within(lista).getByText('Aceitam débito?')).toBeInTheDocument();
    expect(within(lista).getByRole('button', { name: 'Todas · 2' })).toBeInTheDocument();
  });

  it('"Criar FAQ" transforma a pergunta sem resposta em rascunho e marca como resolvida', async () => {
    const post = jest.fn(() => resposta(201, { ...base, id: 'f9', tema: 'problemas', pergunta: 'Posso pagar em dinheiro?', resposta: '', publicada: false }));
    renderPainel(<Ajuda />, { rotas: rotas({ 'POST /api/pascom/faq': post }) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: 'Criar FAQ para: Posso pagar em dinheiro?' }));
    expect(await screen.findByText('Rascunho criado: escreva a resposta.')).toBeInTheDocument();
    expect(corpo(post.mock.calls[0][0])).toEqual({ tema: 'problemas', pergunta: 'Posso pagar em dinheiro?', daPergunta: 'Posso pagar em dinheiro?' });
  });

  it('nova pergunta: abre o formulário, valida no servidor e cria rascunho', async () => {
    const post = jest.fn()
      .mockReturnValueOnce(resposta(400, { error: 'Dados inválidos' }))
      .mockReturnValueOnce(resposta(201, { ...base, id: 'f8', tema: 'pagar', pergunta: 'Posso parcelar?', resposta: '', publicada: false }));
    renderPainel(<Ajuda />, { rotas: rotas({ 'POST /api/pascom/faq': post }) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: '+ Nova pergunta' }));
    await userEvent.selectOptions(screen.getByLabelText('Tema', { selector: '#nova-tema' }), 'pagar');
    await userEvent.type(screen.getByLabelText('Pergunta', { selector: '#nova-pergunta' }), 'Oi');
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Dados inválidos', { selector: 'p[role=alert]' })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Pergunta', { selector: '#nova-pergunta' }));
    await userEvent.type(screen.getByLabelText('Pergunta', { selector: '#nova-pergunta' }), 'Posso parcelar?');
    await userEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }));
    expect(await screen.findByText('Rascunho criado: escreva a resposta.')).toBeInTheDocument();
    expect(corpo(post.mock.calls[1][0])).toEqual({ tema: 'pagar', pergunta: 'Posso parcelar?' });
  });

  it('editor: salva texto, passo a passo em lista (uma linha por passo) e links', async () => {
    const patch = jest.fn(() => resposta(200, { ...PERGUNTAS[0] }));
    renderPainel(<Ajuda />, { rotas: rotas({ 'PATCH /api/pascom/faq/f1': patch }) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /Como compro uma foto\?/ }));
    const passos = screen.getByLabelText('Passo a passo (um passo por linha)');
    await userEvent.clear(passos);
    await userEvent.type(passos, 'Primeiro{enter}Segundo{enter}');
    await userEvent.type(screen.getByLabelText('Vídeo (endereço https)'), 'https://youtu.be/abc');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Pergunta salva.')).toBeInTheDocument();
    expect(corpo(patch.mock.calls[0][0])).toMatchObject({ passos: ['Primeiro', 'Segundo'], video: 'https://youtu.be/abc', tema: 'comprar' });
  });

  it('publicar manda o texto junto com publicada:true; erro do servidor aparece e nada muda', async () => {
    const patch = jest.fn()
      .mockReturnValueOnce(resposta(400, { error: 'Escreva a resposta antes de publicar.' }))
      .mockReturnValueOnce(resposta(200, { ...PERGUNTAS[1], resposta: 'Aceitamos só crédito.', publicada: true }));
    renderPainel(<Ajuda />, { rotas: rotas({ 'PATCH /api/pascom/faq/f2': patch }) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /Aceitam débito\?/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar no site' }));
    expect(await screen.findByText('Escreva a resposta antes de publicar.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^Resposta/), 'Aceitamos só crédito.');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar no site' }));
    expect(await screen.findByText('Publicada na Central de Ajuda.')).toBeInTheDocument();
    expect(corpo(patch.mock.calls[1][0])).toMatchObject({ resposta: 'Aceitamos só crédito.', publicada: true });
    expect(await screen.findByRole('button', { name: 'Despublicar' })).toBeInTheDocument();
  });

  it('excluir pede confirmação antes de chamar a API', async () => {
    const del = jest.fn(() => resposta(200, { ok: true }));
    renderPainel(<Ajuda />, { rotas: rotas({ 'DELETE /api/pascom/faq/f2': del }) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /Aceitam débito\?/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(del).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(await screen.findByText('Pergunta excluída.')).toBeInTheDocument();
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('atendimento (sem ajuda.excluir) não vê o botão de excluir; só-leitura não edita', async () => {
    renderPainel(<Ajuda />, { rotas: rotas(), permissoes: TODAS.filter((p) => p !== 'ajuda.excluir') });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /Aceitam débito\?/ }));
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar no site' })).toBeInTheDocument();
  });

  it('só-leitura: campos desabilitados e nenhum botão de ação', async () => {
    renderPainel(<Ajuda />, { rotas: rotas(), permissoes: ['ajuda.ver'] });
    await aberta();
    expect(screen.queryByRole('button', { name: '+ Nova pergunta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar FAQ para/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Aceitam débito\?/ }));
    expect(screen.getByLabelText('Pergunta', { selector: '#faq-pergunta' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('erro de carga oferece tentar de novo', async () => {
    let falhou = true;
    renderPainel(<Ajuda />, {
      rotas: (url, o) => {
        if (url.endsWith('/api/pascom/faq') && falhou) { falhou = false; return resposta(500, { error: 'Planilha indisponível' }); }
        return rotas()(url, o);
      },
    });
    expect(await screen.findByText('Planilha indisponível')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await aberta()).toBeInTheDocument();
    expect(chamadas('/api/pascom/faq', 'GET').length).toBe(2);
  });
});
