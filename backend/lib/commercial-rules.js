const { rows, yes, fotoFromRow } = require('./google-sheets.shared');
const { calculatePricing } = require('./pricing');
const { precosBase } = require('./tarifas');

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase();
}

function active(row) {
  return yes(row.get('Ativo'));
}

function withinDateWindow(start, end, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return (!start || String(start) <= date) && (!end || String(end) >= date);
}

function couponFromRow(row) {
  return {
    code: normalizeCode(row.get('Codigo')),
    eventId: row.get('EventoID') || '',
    type: row.get('TipoDesconto') || '',
    value: Number(row.get('Valor') || 0),
    active: active(row),
    validFrom: row.get('ValidoDe') || '',
    validUntil: row.get('ValidoAte') || '',
    maxUses: Number(row.get('UsoMaximo') || 0),
    uses: Number(row.get('Usos') || 0),
    description: row.get('Descricao') || '',
  };
}

function packageFromRow(row) {
  return {
    id: row.get('PacoteID') || '',
    eventId: row.get('EventoID') || '',
    type: row.get('Tipo') || '',
    minQuantity: Number(row.get('QuantidadeMinima') || 0),
    packagePrice: Number(row.get('PrecoPacote') || 0),
    percentage: Number(row.get('PercentualDesconto') || 0),
    active: active(row),
    description: row.get('Descricao') || '',
  };
}

function couponIsUsable(coupon, items) {
  if (!coupon || !coupon.active || !withinDateWindow(coupon.validFrom, coupon.validUntil)) return false;
  if (coupon.maxUses > 0 && coupon.uses >= coupon.maxUses) return false;
  if (coupon.eventId && items.some(({ foto }) => foto.eventoId !== coupon.eventId)) return false;
  return ['percentual', 'valor_fixo'].includes(coupon.type) && coupon.value > 0;
}

function couponDiscount(coupon, subtotal) {
  if (coupon.type === 'percentual') return money(subtotal * (coupon.value / 100));
  return money(coupon.value);
}

async function availablePhotosCount(eventId) {
  const photos = (await rows('Fotos')).map(fotoFromRow);
  return photos.filter((foto) =>
    foto.eventoId === eventId &&
    foto.type !== 'capa' &&
    foto.status === 'Processada' &&
    foto.availableForSale
  ).length;
}

async function packageIsUsable(pkg, items) {
  if (!pkg || !pkg.active || !pkg.id) return false;
  if (pkg.eventId && items.some(({ foto }) => foto.eventoId !== pkg.eventId)) return false;
  if (pkg.type === 'all_event_photos') {
    if (!pkg.eventId) return false;
    const available = await availablePhotosCount(pkg.eventId);
    return available > 0 && items.length >= available;
  }
  return ['quantity_bundle', 'family_combo'].includes(pkg.type) && items.length >= Math.max(1, pkg.minQuantity);
}

function packageDiscount(pkg, subtotal) {
  if (pkg.packagePrice > 0 && pkg.packagePrice < subtotal) return money(subtotal - pkg.packagePrice);
  if (pkg.percentage > 0) return money(subtotal * (pkg.percentage / 100));
  return 0;
}

async function listarCupons() {
  return (await rows('Cupons')).map(couponFromRow);
}

async function listarPacotes() {
  return (await rows('Pacotes')).map(packageFromRow);
}

async function listarOfertasEvento(eventoId) {
  const [coupons, packages] = await Promise.all([listarCupons(), listarPacotes()]);
  return {
    coupons: coupons
      .filter((coupon) => coupon.active && (!coupon.eventId || coupon.eventId === eventoId) && withinDateWindow(coupon.validFrom, coupon.validUntil))
      .filter((coupon) => coupon.maxUses <= 0 || coupon.uses < coupon.maxUses)
      .map((coupon) => ({
        code: coupon.code,
        type: coupon.type,
        description: coupon.description || (coupon.type === 'percentual' ? `${coupon.value}% de desconto` : `R$ ${coupon.value.toFixed(2)} de desconto`),
      })),
    packages: packages
      .filter((pkg) => pkg.active && (!pkg.eventId || pkg.eventId === eventoId))
      .map((pkg) => ({
        id: pkg.id,
        type: pkg.type,
        minQuantity: pkg.minQuantity,
        description: pkg.description || 'Pacote pastoral',
      })),
  };
}

async function calcularComercial({ items, paymentMethod, paymentRules, couponCode = '', packageId = '' }) {
  // Preço da foto e taxas fixas: sempre os da configuração do servidor, nunca algo vindo do navegador.
  const base = await precosBase();
  const subtotal = money(items.length * base.unitPrice);
  const [coupons, packages] = await Promise.all([listarCupons(), listarPacotes()]);
  const coupon = normalizeCode(couponCode)
    ? coupons.find((item) => item.code === normalizeCode(couponCode))
    : null;
  const pkg = packageId
    ? packages.find((item) => item.id === packageId)
    : null;

  const candidates = [];
  if (coupon) {
    if (!couponIsUsable(coupon, items)) throw new Error('Cupom invalido ou indisponivel para este carrinho.');
    candidates.push({
      source: 'coupon',
      discount: couponDiscount(coupon, subtotal),
      couponApplied: { code: coupon.code, description: coupon.description, type: coupon.type },
    });
  }
  if (pkg) {
    if (!await packageIsUsable(pkg, items)) throw new Error('Pacote invalido ou indisponivel para este carrinho.');
    candidates.push({
      source: 'package',
      discount: packageDiscount(pkg, subtotal),
      packageApplied: { id: pkg.id, type: pkg.type, description: pkg.description },
    });
  }

  const winner = candidates.sort((a, b) => b.discount - a.discount)[0] || { discount: 0 };
  const discountTotal = Math.min(subtotal, money(winner.discount || 0));
  return calculatePricing(items.length, paymentMethod, paymentRules, {
    discountTotal,
    discounts: {
      coupon: winner.source === 'coupon' ? discountTotal : 0,
      package: winner.source === 'package' ? discountTotal : 0,
      total: discountTotal,
    },
    couponApplied: winner.couponApplied || null,
    packageApplied: winner.packageApplied || null,
  }, base);
}

async function incrementarUsoCupom(couponCode) {
  const code = normalizeCode(couponCode);
  if (!code) return false;
  const match = (await rows('Cupons')).find((row) => normalizeCode(row.get('Codigo')) === code);
  if (!match) return false;
  match.set('Usos', Number(match.get('Usos') || 0) + 1);
  await match.save();
  return true;
}

module.exports = {
  calcularComercial,
  incrementarUsoCupom,
  listarCupons,
  listarOfertasEvento,
  listarPacotes,
  normalizeCode,
};
