// Cliente HTTP do painel. O token do Clerk vai no cabeçalho Authorization; o
// servidor revalida tudo (login, equipe e permissão) a cada chamada.

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * @param {string} caminho ex.: '/api/pascom/me'
 * @param {() => Promise<string|null>} obterToken
 * @param {{method?: string, body?: unknown, signal?: AbortSignal, aceitarDica?: boolean}} [opcoes]
 *   aceitarDica: em vez de lançar erro, devolve o corpo quando o servidor pede reautenticação
 *   (formato do Clerk), para o useReverification abrir o desafio e repetir a chamada.
 */
export async function chamarPainel(caminho, obterToken, opcoes = {}) {
  const token = await obterToken();
  const headers = { Authorization: `Bearer ${token}` };
  if (opcoes.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${caminho}`, {
    method: opcoes.method || 'GET',
    headers,
    body: opcoes.body !== undefined ? JSON.stringify(opcoes.body) : undefined,
    signal: opcoes.signal,
  });

  let dados = null;
  try {
    dados = await res.json();
  } catch {
    // resposta sem corpo JSON: cai na mensagem genérica abaixo
  }
  if (res.status === 403 && opcoes.aceitarDica && dados && dados.clerk_error) return dados;
  if (!res.ok) {
    const erro = new Error(dados?.error || `Erro HTTP ${res.status}`);
    erro.status = res.status;
    throw erro;
  }
  return dados;
}
