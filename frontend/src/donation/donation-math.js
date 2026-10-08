// Previa do valor no navegador. O servidor recalcula tudo antes de cobrar
// (backend/lib/donations.js); as tarifas chegam de /api/doacoes/config.

export function brl(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

// Aceita "50", "50,5", "1.250,00" e devolve numero ou NaN.
export function parseAmount(text) {
  const clean = String(text || '').trim().replace(/\s|R\$/g, '');
  if (!clean) return Number.NaN;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function amountError(amount, limites) {
  if (!Number.isFinite(amount)) return 'Informe o valor da oferta.';
  if (amount < limites.min) return `O valor mínimo é ${brl(limites.min)}.`;
  if (amount > limites.max) return `O valor máximo por doação é ${brl(limites.max)}.`;
  return '';
}

export function resumoDoacao({ amount, method, coverFees, tarifas }) {
  const oferta = Number.isFinite(amount) ? round(amount) : 0;
  const tarifa = tarifas && tarifas[method];
  if (!coverFees || !tarifa || oferta <= 0) return { amount: oferta, fee: 0, total: oferta };
  const total = round((oferta + tarifa.fixed) / (1 - tarifa.percentage / 100));
  return { amount: oferta, fee: round(total - oferta), total };
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' }).format(new Date(iso));
}
