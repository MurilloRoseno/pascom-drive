// donation-webhook.js — Eventos do Stripe que pertencem a doacoes.
// Fluxo separado do pedido de fotos: confirma a oferta, envia o comprovante
// e registra cada cobranca mensal como uma nova linha.

const {
  registrarWebhookSeNovo, finalizarWebhook, buscarDoacaoById, atualizarDoacao, registrarDoacao,
} = require('./google-sheets');
const { destinoPorId, novaDoacaoId, criarTokenAssinatura } = require('./donations');
const { doacaoEmail } = require('./email-templates');
const { enviarEmail } = require('./delivery');

const SESSION_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
];

// A API atual guarda a assinatura em parent.subscription_details; versoes
// anteriores usavam campos na raiz da fatura.
function invoiceSubscription(invoice) {
  const details = (invoice.parent && invoice.parent.subscription_details) || invoice.subscription_details || {};
  const subscription = details.subscription || invoice.subscription || '';
  return { id: String((subscription && subscription.id) || subscription || ''), metadata: details.metadata || {} };
}

function eventoDeDoacao(event) {
  const object = (event.data && event.data.object) || {};
  if (SESSION_EVENTS.includes(event.type)) return Boolean(object.metadata && object.metadata.tipo === 'doacao');
  if (event.type === 'invoice.paid') return invoiceSubscription(object).metadata.tipo === 'doacao';
  return false;
}

function sessionStatus(type, session) {
  if (type === 'checkout.session.async_payment_succeeded') return 'approved';
  if (type === 'checkout.session.completed') return session.payment_status === 'paid' ? 'approved' : 'pending';
  if (type === 'checkout.session.async_payment_failed') return 'rejected';
  return 'expired';
}

function manageUrl(subscriptionId) {
  const token = criarTokenAssinatura(subscriptionId);
  if (!token) return '';
  const base = String(process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app').replace(/\/$/, '');
  return `${base}/doar/gerenciar?token=${encodeURIComponent(token)}`;
}

function done(body = {}, status = 200) {
  return { status, body: { ok: true, ...body } };
}

async function processarSessao(event) {
  const session = event.data.object;
  const eventKey = String(event.id);
  const paymentId = String(session.payment_intent || session.invoice || session.id);
  if (!(await registrarWebhookSeNovo(eventKey, paymentId, event.type))) return done({ duplicate: true });

  const doacaoId = session.client_reference_id || session.metadata.doacao_id;
  const doacao = doacaoId ? await buscarDoacaoById(doacaoId) : null;
  if (!doacao) {
    await finalizarWebhook(eventKey, 'DoacaoNaoEncontrada');
    return done({ unmatched: true }, 202);
  }

  const status = sessionStatus(event.type, session);
  if (status !== 'approved' || doacao.status === 'Confirmada') {
    if (doacao.status !== 'Confirmada' && status !== 'pending' && status !== 'approved') {
      await atualizarDoacao(doacao.id, { Status: status === 'expired' ? 'Expirada' : 'Falhou' });
    }
    await finalizarWebhook(eventKey, 'Processado');
    return done();
  }

  const paidAmount = Number(session.amount_total || 0) / 100;
  const currency = String(session.currency || '').toUpperCase();
  if (currency !== 'BRL' || Math.abs(paidAmount - doacao.total) > 0.01) {
    console.warn(JSON.stringify({
      event: 'donation_amount_mismatch',
      severity: 'critical',
      doacaoId: doacao.id,
      paymentId,
      expectedTotal: doacao.total,
      paidAmount,
      currency,
      ts: new Date().toISOString(),
    }));
    await atualizarDoacao(doacao.id, { Status: 'Divergente', PaymentID: paymentId });
    await finalizarWebhook(eventKey, 'DoacaoDivergente');
    return done({ divergent: true }, 202);
  }

  const paidAt = new Date().toISOString();
  const subscriptionId = String(session.subscription || '');
  const destino = destinoPorId(doacao.destino);
  const message = doacaoEmail({
    doacao: { ...doacao, destinoLabel: destino ? destino.label : doacao.destino, paidAt },
    manageUrl: subscriptionId ? manageUrl(subscriptionId) : '',
  });
  // O e-mail digitado no formulario tem prioridade; sem ele, usa o informado ao Stripe.
  const to = doacao.email || (session.customer_details && session.customer_details.email) || '';
  const emailResult = await enviarEmail({ to, ...message });
  await atualizarDoacao(doacao.id, {
    Status: 'Confirmada',
    PaymentID: paymentId,
    AssinaturaID: subscriptionId,
    ClienteID: String(session.customer || ''),
    DataPagamento: paidAt,
    EmailStatus: emailResult.status,
  });
  await finalizarWebhook(eventKey, 'Processado');
  return done();
}

// Cobrancas mensais seguintes. A primeira ja chega por checkout.session.completed.
async function processarFatura(event) {
  const invoice = event.data.object;
  if (invoice.billing_reason !== 'subscription_cycle') return done({ ignored: true });
  const eventKey = String(event.id);
  if (!(await registrarWebhookSeNovo(eventKey, String(invoice.id), event.type))) return done({ duplicate: true });

  const subscription = invoiceSubscription(invoice);
  const destino = destinoPorId(subscription.metadata.destino);
  const total = Number(invoice.amount_paid || 0) / 100;
  const fee = Number(subscription.metadata.taxa) || 0;
  const amount = Number(subscription.metadata.valor) || 0;
  const split = Math.abs(amount + fee - total) <= 0.01 ? { amount, fee } : { amount: total, fee: 0 };
  const paidAt = new Date().toISOString();
  const doacao = {
    id: novaDoacaoId(),
    paymentId: String(invoice.id),
    subscriptionId: subscription.id,
    customerId: String(invoice.customer || ''),
    status: 'Confirmada',
    destino: destino ? destino.id : String(subscription.metadata.destino || ''),
    frequency: 'mensal',
    method: 'credit_card',
    ...split,
    total,
    paidAt,
  };
  const message = doacaoEmail({
    doacao: { ...doacao, destinoLabel: destino ? destino.label : 'Paróquia São Rafael' },
    manageUrl: manageUrl(subscription.id),
  });
  const emailResult = await enviarEmail({ to: invoice.customer_email || '', ...message });
  await registrarDoacao({ ...doacao, emailStatus: emailResult.status });
  await finalizarWebhook(eventKey, 'Processado');
  return done();
}

async function processarEventoDoacao(event) {
  return event.type === 'invoice.paid' ? processarFatura(event) : processarSessao(event);
}

module.exports = { eventoDeDoacao, processarEventoDoacao };
