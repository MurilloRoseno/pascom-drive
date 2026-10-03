import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Categorias from '../painel/pages/Categorias.jsx';
import {
  renderPainel, resposta, chamadas, TODAS,
} from '../test-utils/painel.jsx';

const LISTA = [
  { id: 'celebracoes', nome: 'Celebrações', tipo: 'celebracao', ordem: 1, ativo: true, padrao: true, eventos: 5 },
  { id: 'batismo', nome: 'Batismo', tipo: 'sacramento', ordem: 2, ativo: true, padrao: false, eventos: 2 },
  { id: 'crisma', nome: 'Crisma', tipo: 'sacramento', ordem: 3, ativo: true, padrao: false, eventos: 0 },
  { id: 'ordem', nome: 'Ordem', tipo: 'sacramento', ordem: 4, ativo: false, padrao: false, eventos: 0 },
];

function rotas(extra = {}) {
  return (url, opcoes) => {
    const chave = `${opcoes.method || 'GET'} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (extra[chave]) return extra[chave](opcoes);
    if (chave === 'GET /api/pascom/categorias') return resposta(200, { categorias: LISTA });
    return resposta(404, { error: `sem rota: ${chave}` });
  };
}

const corpo = (o) => JSON.parse(o.body);
const carregada = () => screen.findByRole('heading', { name: 'Sacramentos' });
// o nome também aparece na prévia do site: pega a ocorrência dentro da lista (li)
const linha = (nome) => screen.getAllByText(nome).map((e) => e.closest('li')).find(Boolean);

describe('tela Categorias', () => {
  it('separa sacramentos e celebrações e mostra slug, eventos e padrão', async () => {
    renderPainel(<Categorias />, { rotas: rotas() });
    expect(await carregada()).toBeInTheDocument();
    expect(screen.getByText('/celebracoes · 5 eventos · padrão')).toBeInTheDocument();
    expect(screen.getByText('/crisma · 0 eventos')).toBeInTheDocument();
    expect(screen.getByText('/batismo · 2 eventos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sacramentos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Celebrações' })).toBeInTheDocument();
  });

  it('o botão muda conforme o caso: Fixa, Ocultar ou Remover', async () => {
    renderPainel(<Categorias />, { rotas: rotas() });
    await carregada();
    expect(within(linha('Celebrações')).getByRole('button', { name: 'Fixa Celebrações' })).toBeDisabled();
    expect(within(linha('Batismo')).getByRole('button', { name: 'Ocultar Batismo' })).toBeEnabled();
    expect(within(linha('Crisma')).getByRole('button', { name: 'Remover Crisma' })).toBeEnabled();
  });

  it('a categoria padrão não pode ser ocultada pelo interruptor', async () => {
    renderPainel(<Categorias />, { rotas: rotas() });
    await carregada();
    expect(within(linha('Celebrações')).getByRole('switch')).toBeDisabled();
  });

  it('adiciona uma categoria com nome e tipo', async () => {
    const post = jest.fn(() => resposta(201, { id: 'profissao-de-fe', nome: 'Profissão de Fé', tipo: 'sacramento' }));
    renderPainel(<Categorias />, { rotas: rotas({ 'POST /api/pascom/categorias': post }) });
    await carregada();
    await userEvent.type(screen.getByLabelText('Nome'), 'Profissão de Fé');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à lista' }));
    expect(await screen.findByText('“Profissão de Fé” adicionada.')).toBeInTheDocument();
    expect(corpo(post.mock.calls[0][0])).toEqual({ nome: 'Profissão de Fé', tipo: 'sacramento' });
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('nome vazio mostra o erro sem chamar a API', async () => {
    renderPainel(<Categorias />, { rotas: rotas() });
    await carregada();
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à lista' }));
    expect(await screen.findByText('Informe o nome da categoria.')).toBeInTheDocument();
    expect(chamadas('/api/pascom/categorias', 'POST')).toHaveLength(0);
  });

  it('mostra o erro do servidor, como categoria repetida', async () => {
    const post = jest.fn(() => resposta(400, { error: 'Essa categoria já existe.' }));
    renderPainel(<Categorias />, { rotas: rotas({ 'POST /api/pascom/categorias': post }) });
    await carregada();
    await userEvent.type(screen.getByLabelText('Nome'), 'Batismo');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à lista' }));
    expect(await screen.findByText('Essa categoria já existe.')).toBeInTheDocument();
  });

  it('oculta pelo interruptor, move e remove usando a API', async () => {
    const patch = jest.fn(() => resposta(200, {}));
    const mover = jest.fn(() => resposta(200, { moveu: true }));
    const del = jest.fn(() => resposta(200, { resultado: 'removida' }));
    renderPainel(<Categorias />, {
      rotas: rotas({
        'PATCH /api/pascom/categorias/batismo': patch,
        'POST /api/pascom/categorias/crisma/mover': mover,
        'DELETE /api/pascom/categorias/crisma': del,
      }),
    });
    await carregada();

    await userEvent.click(within(linha('Batismo')).getByRole('switch'));
    expect(corpo(patch.mock.calls[0][0])).toEqual({ ativo: false });
    expect(await screen.findByText('“Batismo” ficou oculta.')).toBeInTheDocument();

    await userEvent.click(within(linha('Crisma')).getByRole('button', { name: 'Subir Crisma' }));
    expect(corpo(mover.mock.calls[0][0])).toEqual({ direcao: 'subir' });

    await userEvent.click(within(linha('Crisma')).getByRole('button', { name: 'Remover Crisma' }));
    expect(await screen.findByText('“Crisma” removida.')).toBeInTheDocument();
  });

  it('remover categoria com eventos avisa que só ficou oculta', async () => {
    const del = jest.fn(() => resposta(200, { resultado: 'ocultada' }));
    renderPainel(<Categorias />, { rotas: rotas({ 'DELETE /api/pascom/categorias/batismo': del }) });
    await carregada();
    await userEvent.click(within(linha('Batismo')).getByRole('button', { name: 'Ocultar Batismo' }));
    expect(await screen.findByText('Tem eventos: ficou oculta.')).toBeInTheDocument();
  });

  it('só quem pode criar vê o formulário; só quem pode excluir vê os botões de remover', async () => {
    renderPainel(<Categorias />, {
      rotas: rotas(),
      permissoes: TODAS.filter((p) => !['categorias.criar', 'categorias.excluir', 'categorias.editar'].includes(p)),
    });
    await carregada();
    expect(screen.queryByRole('button', { name: 'Adicionar à lista' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover|Ocultar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subir/ })).not.toBeInTheDocument();
  });

  it('a prévia do site lista só as categorias visíveis', async () => {
    renderPainel(<Categorias />, { rotas: rotas() });
    await carregada();
    const previa = screen.getByRole('heading', { name: 'Como aparece no site' }).closest('section');
    expect(within(previa).getByText('Todos')).toBeInTheDocument();
    expect(within(previa).getByText('Crisma')).toBeInTheDocument();
    expect(within(previa).queryByText('Ordem')).not.toBeInTheDocument();
  });
});
