import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  CATEGORIAS_PADRAO, carregarCategorias, categoryLabel, reiniciarCategorias, useCategorias,
} from '../shared/categorias.js';
import { SacramentoChips } from '../mobile/referenceUtils.jsx';

jest.mock('../lib/api.js', () => ({ listarCategorias: jest.fn() }));
const { listarCategorias } = require('../lib/api.js');

function Lista() {
  const lista = useCategorias();
  return <ul>{lista.map((c) => <li key={c.id}>{c.label}</li>)}</ul>;
}

const DO_PAINEL = [
  { id: 'batismo', nome: 'Batismo', tipo: 'sacramento' },
  { id: 'profissao-de-fe', nome: 'Profissão de Fé', tipo: 'sacramento' },
];

beforeEach(() => {
  jest.clearAllMocks();
  reiniciarCategorias();
});

describe('categorias do site', () => {
  it('antes de a lista chegar mostra a de reserva, e depois troca pela do painel', async () => {
    let responder;
    listarCategorias.mockReturnValue(new Promise((resolve) => { responder = resolve; }));
    render(<Lista />);
    expect(screen.getByText('Unção dos Enfermos')).toBeInTheDocument();
    await act(async () => { responder(DO_PAINEL); });
    expect(screen.getByText('Profissão de Fé')).toBeInTheDocument();
    expect(screen.queryByText('Unção dos Enfermos')).not.toBeInTheDocument();
  });

  it('se o servidor falhar, a lista de reserva continua e a próxima tela tenta de novo', async () => {
    listarCategorias.mockRejectedValueOnce(new Error('fora do ar')).mockResolvedValue(DO_PAINEL);
    const { unmount } = render(<Lista />);
    await act(async () => { await carregarCategorias(); });
    expect(screen.getAllByRole('listitem')).toHaveLength(CATEGORIAS_PADRAO.length);
    unmount();
    render(<Lista />);
    await act(async () => { await carregarCategorias(); });
    expect(screen.getByText('Profissão de Fé')).toBeInTheDocument();
  });

  it('resposta vazia ou inválida não apaga a lista', async () => {
    listarCategorias.mockResolvedValue([]);
    render(<Lista />);
    await act(async () => { await carregarCategorias(); });
    expect(screen.getAllByRole('listitem')).toHaveLength(CATEGORIAS_PADRAO.length);
  });

  it('só busca no servidor uma vez, por mais telas que usem a lista', async () => {
    listarCategorias.mockResolvedValue(DO_PAINEL);
    render(<><Lista /><Lista /></>);
    await act(async () => { await carregarCategorias(); });
    expect(listarCategorias).toHaveBeenCalledTimes(1);
  });

  it('categoryLabel: usa a lista do painel, a de reserva e, para categoria ocultada, o id legível', async () => {
    listarCategorias.mockResolvedValue(DO_PAINEL);
    render(<Lista />);
    await act(async () => { await carregarCategorias(); });
    expect(categoryLabel('profissao-de-fe')).toBe('Profissão de Fé');
    expect(categoryLabel('crisma')).toBe('Crisma'); // ocultada no painel, mas ainda é nome conhecido
    expect(categoryLabel('retiro-de-jovens')).toBe('Retiro de jovens');
    expect(categoryLabel('')).toBe('Celebrações');
  });

  it('o mobile mostra "Todos" e as categorias do painel, com ícone genérico nas novas', async () => {
    listarCategorias.mockResolvedValue(DO_PAINEL);
    const onChange = jest.fn();
    render(<MemoryRouter><SacramentoChips value="todos" onChange={onChange} /></MemoryRouter>);
    await act(async () => { await carregarCategorias(); });
    expect(screen.getAllByRole('button').map((b) => b.textContent.trim())).toEqual(['Todos', 'Batismo', 'Profissão de Fé']);
  });
});
