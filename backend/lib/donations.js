// donations.js — Regras da doacao online: destinos, limites e calculo.
// A doacao e livre e separada da venda de fotos; aqui nao existe preco.

const crypto = require('crypto');
const { STRIPE_FEES, chargedTotal, roundMoney } = require('./pricing');
const { signToken, verifyToken } = require('./jwt-utils');

const TOKEN_PURPOSE = 'doacao-assinatura';
const TOKEN_TTL_MS = 2 * 365 * 24 * 60 * 60 * 1000;

const DESTINOS = [
  { id: 'dizimo', label: 'Dízimo' },
  { id: 'obras', label: 'Obras da Matriz' },
  { id: 'pastoral-social', label: 'Pastoral Social' },
  { id: 'onde-mais-precisar', label: 'Onde mais precisar' },
];
const FREQUENCIAS = ['unica', 'mensal'];
const VALORES_SUGERIDOS = [20, 50, 100, 200];
const LIMITES = { min: 5, max: 10000 };

function destinoPorId(id) {
  return DESTINOS.find((destino) => destino.id === id) || null;
}

function novaDoacaoId() {
  return `DOA_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Calcula o que sera cobrado. Sem cobertura, o doador paga exatamente a oferta.
 * Com cobertura, a taxa do Stripe e somada para a oferta chegar inteira.
 * @param {{amount: number, method: 'pix'|'credit_card', coverFees: boolean}} input
 * @returns {{amount: number, fee: number, total: number, method: string, coverFees: boolean}}
 */
function calcularDoacao({ amount, method, coverFees }) {
  const fee = STRIPE_FEES[method];
  if (!fee) throw new Error('Meio de pagamento inválido.');
  const oferta = roundMoney(amount);
  if (!Number.isFinite(oferta) || oferta < LIMITES.min || oferta > LIMITES.max) {
    throw new Error(`O valor da doação deve ficar entre R$ ${LIMITES.min.toLocaleString('pt-BR')} e R$ ${LIMITES.max.toLocaleString('pt-BR')}.`);
  }
  const total = coverFees ? chargedTotal(oferta, fee) : oferta;
  return { amount: oferta, fee: roundMoney(total - oferta), total, method, coverFees: Boolean(coverFees) };
}

// Link de "gerenciar doacao mensal" enviado por e-mail: identifica a assinatura
// sem exigir login. Reaproveita o segredo dos links de download.
function criarTokenAssinatura(subscriptionId) {
  const secret = process.env.DOWNLOAD_JWT_SECRET;
  if (!secret || !subscriptionId) return '';
  return signToken({ purpose: TOKEN_PURPOSE, subscriptionId, exp: Date.now() + TOKEN_TTL_MS }, secret);
}

function lerTokenAssinatura(token) {
  const secret = process.env.DOWNLOAD_JWT_SECRET;
  if (!secret) return null;
  try {
    const payload = verifyToken(String(token || ''), secret);
    if (payload.purpose !== TOKEN_PURPOSE || !payload.subscriptionId || payload.exp <= Date.now()) return null;
    return payload.subscriptionId;
  } catch (_error) {
    return null;
  }
}

function configPublica() {
  return {
    destinos: DESTINOS,
    frequencias: FREQUENCIAS,
    valoresSugeridos: VALORES_SUGERIDOS,
    limites: LIMITES,
    tarifas: STRIPE_FEES,
  };
}

module.exports = {
  DESTINOS, FREQUENCIAS, VALORES_SUGERIDOS, LIMITES,
  calcularDoacao, configPublica, criarTokenAssinatura, destinoPorId, lerTokenAssinatura, novaDoacaoId,
};
