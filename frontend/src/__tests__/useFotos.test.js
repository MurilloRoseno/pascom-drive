import { renderHook, waitFor } from '@testing-library/react';
import { useFotos } from '../hooks/useFotos';

// Mock the api module
jest.mock('../lib/api', () => ({
  listarFotos: jest.fn(),
}));

const { listarFotos } = require('../lib/api');

const FOTOS_MOCK = [
  { id: 'F1', event: 'Missa de Páscoa', url: 'http://x/1.jpg', price: 25 },
  { id: 'F2', event: 'Missa de Páscoa', url: 'http://x/2.jpg', price: 25 },
  { id: 'F3', event: 'Batismo', url: 'http://x/3.jpg', price: 30 },
];

beforeEach(() => {
  listarFotos.mockReset();
});

describe('useFotos', () => {
  it('starts with isLoading true and empty fotos', () => {
    listarFotos.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useFotos());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.fotos).toEqual([]);
  });

  it('returns all fotos when no filter', async () => {
    listarFotos.mockResolvedValueOnce(FOTOS_MOCK);
    const { result } = renderHook(() => useFotos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fotos).toHaveLength(3);
  });

  it('filters by event when eventoSelecionado is provided', async () => {
    listarFotos.mockResolvedValueOnce(FOTOS_MOCK);
    const { result } = renderHook(() => useFotos('Batismo'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fotos).toHaveLength(1);
    expect(result.current.fotos[0].id).toBe('F3');
  });

  it('returns unique eventos list', async () => {
    listarFotos.mockResolvedValueOnce(FOTOS_MOCK);
    const { result } = renderHook(() => useFotos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eventos).toEqual(['Missa de Páscoa', 'Batismo']);
  });

  it('sets error on API failure', async () => {
    listarFotos.mockRejectedValueOnce(new Error('Sem conexão'));
    const { result } = renderHook(() => useFotos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Sem conexão');
    expect(result.current.fotos).toEqual([]);
  });
});
