const {
  registrarWebhookSeNovo, finalizarWebhook, atualizarPedidoPagamento,
  buscarPedidoByPreferenceOrPayment, registrarEntrega, marcarPedidoDivergente, contarDownloadsPedido,
} = require('../../lib/google-sheets');
const { construirEvento, tarifaReal, centavos } = require('../../lib/stripe-gateway');
const { criarDownloadsDoPedido, enviarEmailEntrega, criarMensagemWhatsApp } = require('../../lib/delivery');

// Única fonte de confirmação de pagamento: o evento assinado pela Stripe. A página de
// retorno do navegador (/pagamento/sucesso) nunca libera nada.
const PAGO = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);
const FALHOU = new Set(['checkout.session.async_payment_failed']);
const EXPIROU = new Set(['checkout.session.expired']);
const TIPOS = new Set([...PAGO, ...FALHOU, ...EXPIROU]);

function alertar(evento, dados) {
  console.warn(JSON.stringify({ event: evento, severity: 'critical', ...dados, ts: new Date().toISOString() }));
}

async function entregar(pedido) {
  const downloads = await criarDownloadsDoPedido(pedido);
  const emailResult = await enviarEmailEntrega(pedido, downloads);
  const digits = String(pedido.whatsapp || '').replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;
  const whatsappLink = `https://wa.me/${number}?text=${encodeURIComponent(criarMensagemWhatsApp(downloads))}`;
  await registrarEntrega(pedido.id, { emailResult, whatsappLink });
}

module.exports = async function handler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.status(500).json({ error: 'Configuracao de servidor invalida' });

  let evento;
  try {
    evento = construirEvento(req.rawBody, req.headers['stripe-signature']);
  } catch (_erro) {
    alertar('webhook_signature_invalid', { gateway: 'stripe', ip: req.ip || req.headers['x-forwarded-for'] || '' });
    return res.status(401).json({ error: 'Assinatura invalida' });
  }
  if (!TIPOS.has(evento.type)) return res.status(200).json({ ok: true, ignored: true });

  const sessao = evento.data.object;
  const pedidoId = String(sessao.client_reference_id || (sessao.metadata && sessao.metadata.pedido_id) || '');
  const paymentIntent = String(sessao.payment_intent || '');
  try {
    if (!(await registrarWebhookSeNovo(evento.id, paymentIntent || sessao.id, evento.type))) {
      return res.status(200).json({ ok: true, duplicate: true });
    }
    const stored = pedidoId ? await buscarPedidoByPreferenceOrPayment(pedidoId) : null;
    // O pedido precisa existir e ser o dono desta sessão (PreferenceID guarda o id da sessão).
    if (!stored || stored.row.get('PreferenceID') !== sessao.id) {
      await finalizarWebhook(evento.id, 'PedidoNaoEncontrado');
      return res.status(202).json({ ok: true, unmatched: true });
    }
    const confirmado = stored.status === 'Pagamento Confirmado';

    if (EXPIROU.has(evento.type) || FALHOU.has(evento.type)) {
      if (!confirmado) {
        await atualizarPedidoPagamento(stored.id, { id: paymentIntent || sessao.id, status: EXPIROU.has(evento.type) ? 'cancelled' : 'rejected' });
      }
      await finalizarWebhook(evento.id, 'Processado');
      return res.json({ ok: true });
    }

    // completed com payment_status "unpaid" é Pix aguardando: o aviso de pagamento vem depois.
    if (sessao.payment_status !== 'paid') {
      await finalizarWebhook(evento.id, 'Processado');
      return res.json({ ok: true, pending: true });
    }

    if (sessao.currency !== 'brl' || sessao.amount_total !== centavos(stored.total)) {
      alertar('payment_amount_mismatch', {
        gateway: 'stripe', pedidoId: stored.id, esperado: centavos(stored.total), pago: sessao.amount_total, moeda: sessao.currency,
      });
      await marcarPedidoDivergente(stored.id, 'Valor ou moeda divergente na Stripe', { id: paymentIntent });
      await finalizarWebhook(evento.id, 'PagamentoDivergente');
      return res.status(202).json({ ok: true, divergent: true });
    }

    // Outro evento do mesmo pagamento (ex.: completed e depois async_payment_succeeded): não entrega duas vezes.
    // Se a confirmação já foi gravada mas a entrega falhou antes, uma nova tentativa da Stripe completa a entrega.
    if (confirmado && (await contarDownloadsPedido(stored.id)) > 0) {
      await finalizarWebhook(evento.id, 'Processado');
      return res.json({ ok: true, jaConfirmado: true });
    }

    const tarifa = await tarifaReal(paymentIntent);
    const pedido = await atualizarPedidoPagamento(stored.id, {
      id: paymentIntent || sessao.id,
      status: 'approved',
      fee_details: tarifa === '' ? undefined : [{ amount: tarifa }],
    });
    await entregar(pedido);
    await finalizarWebhook(evento.id, 'Processado');
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
};
