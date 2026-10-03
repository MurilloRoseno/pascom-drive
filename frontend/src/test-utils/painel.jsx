/* eslint-env jest */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PainelProvider } from '../painel/PainelContext.jsx';
import { ToastProvider } from '../painel/ui.jsx';

export const TODAS = [
  'eventos.ver', 'eventos.criar', 'eventos.editar', 'eventos.excluir',
  'agenda.ver', 'agenda.criar', 'agenda.editar', 'agenda.excluir',
  'categorias.ver', 'categorias.criar', 'categorias.editar', 'categorias.excluir',
  'ajuda.ver', 'ajuda.criar', 'ajuda.editar', 'ajuda.excluir',
  'pagamentos.ver', 'pagamentos.editar', 'seguranca.ver', 'seguranca.editar',
  'acessos.gerenciar', 'modulos.gerenciar', 'conteudo.ver', 'conteudo.editar',
];

/** Resposta simulada do fetch. */
export const resposta = (status, corpo) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(corpo) });

/**
 * Renderiza uma tela do painel com sessão falsa e fetch controlado.
 * @param {import('react').ReactElement} ui
 * @param {{permissoes?: string[], rotas?: (url: string, opcoes: RequestInit) => Promise<unknown>, chamarSensivel?: Function}} [config]
 */
export function renderPainel(ui, { permissoes = TODAS, rotas, chamarSensivel } = {}) {
  globalThis.fetch = jest.fn((url, opcoes) => rotas(String(url), opcoes || {}));
  const membro = { email: 'ana@pascom.org', nome: 'Ana', role: 'admin', permissoes };
  return render(
    <MemoryRouter>
      <PainelProvider membro={membro} obterToken={async () => 'tok'} chamarSensivel={chamarSensivel}>
        <ToastProvider>{ui}</ToastProvider>
      </PainelProvider>
    </MemoryRouter>,
  );
}

/** Chamadas feitas ao fetch para um caminho, ignorando a query (e método opcional). */
export function chamadas(caminho, metodo) {
  return globalThis.fetch.mock.calls.filter(([url, o]) =>
    String(url).split('?')[0].endsWith(caminho) && (!metodo || (o?.method || 'GET') === metodo));
}
