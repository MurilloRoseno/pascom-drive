const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function request(url, options) {
  const res = await fetch(`${BASE}${url}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Erro HTTP ${res.status}`);
  return data;
}

function bearer(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function listarEventos({ q = '', categoria = '' } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (categoria) params.set('categoria', categoria);
  return request(`/api/eventos?${params.toString()}`);
}

export function listarCategorias() {
  return request('/api/categorias');
}

/** GET /api/faq: Central de Ajuda (perguntas publicadas, WhatsApp da secretaria e se o assistente está ligado). */
export function obterFaq() {
  return request('/api/faq');
}

/** GET /api/agenda?mes=AAAA-MM: compromissos do mês e dos dias vizinhos que a grade mostra. */
export function obterAgenda(mes) {
  return request(`/api/agenda?mes=${encodeURIComponent(mes)}`);
}

/** GET /api/agenda?proximas=N: os próximos N compromissos a partir de hoje. */
export function obterProximas(n) {
  return request(`/api/agenda?proximas=${encodeURIComponent(n)}`);
}

/** POST /api/assistente: responde só com o que a paróquia escreveu (FAQ, agenda, eventos publicados). */
export function perguntarAoAssistente(mensagem) {
  return request('/api/assistente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem }),
  });
}

export function obterEvento(eventoId) {
  return request(`/api/eventos/${encodeURIComponent(eventoId)}`);
}

export function obterEventoPorSlug(slug) {
  return request(`/api/e/${encodeURIComponent(slug)}`);
}

export function listarFotosEvento(eventoId, token = '') {
  const headers = token ? { 'x-gallery-token': token } : undefined;
  return request(`/api/eventos/${encodeURIComponent(eventoId)}/fotos`, { headers });
}

export function listarOfertasEvento(eventoId) {
  return request(`/api/eventos/${encodeURIComponent(eventoId)}/ofertas`);
}

export function validarAcessoGaleria(eventoId, code) {
  return request(`/api/eventos/${encodeURIComponent(eventoId)}/acesso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

export function cotarCheckout(payload) {
  return request('/api/checkout/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function criarPagamento(payload) {
  return request('/api/checkout/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function statusPagamento(pedidoId) {
  return request(`/api/status-pagamento?pedidoId=${encodeURIComponent(pedidoId)}`);
}

export function recuperarPedido(payload) {
  return request('/api/pedidos/recuperar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function pascomMe(token) {
  return request('/api/pascom/me', { headers: bearer(token) });
}

export function pascomDashboard(token) {
  return request('/api/pascom/dashboard', { headers: bearer(token) });
}

export function pascomPedidos(token, filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request(`/api/pascom/pedidos?${params.toString()}`, { headers: bearer(token) });
}

export function pascomPedidoDetalhe(token, pedidoId) {
  return request(`/api/pascom/pedidos/${encodeURIComponent(pedidoId)}`, { headers: bearer(token) });
}

export function pascomRegenerarDownloads(token, pedidoId) {
  return request(`/api/pascom/pedidos/${encodeURIComponent(pedidoId)}/regenerar-downloads`, {
    method: 'POST',
    headers: bearer(token),
  });
}
