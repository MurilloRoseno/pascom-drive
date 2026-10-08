const { doacaoSchema, doacaoIdSchema, assinaturaTokenSchema } = require('../lib/validation');
const {
  calcularDoacao, configPublica, destinoPorId, lerTokenAssinatura, novaDoacaoId,
} = require('../lib/donations');
const { criarSessaoDoacao, buscarAssinatura, cancelarAssinatura } = require('../lib/stripe');
const { registrarDoacao, buscarDoacaoById } = require('../lib/google-sheets');

function config(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.json(configPublica());
}

async function checkout(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = doacaoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados da doacao invalidos.' });
  const input = parsed.data;
  const destino = destinoPorId(input.destino);
  if (!destino) return res.status(400).json({ error: 'Destino da doacao invalido.' });
  if (input.frequency === 'mensal' && input.method !== 'credit_card') {
    return res.status(400).json({ error: 'A doacao mensal so pode ser feita no cartao.' });
  }
  let resumo;
  try {
    resumo = calcularDoacao(input);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const id = novaDoacaoId();
    const session = await criarSessaoDoacao({
      doacaoId: id,
      destino,
      frequency: input.frequency,
      method: input.method,
      resumo,
      email: input.email,
    });
    await registrarDoacao({
      id,
      sessionId: session.id,
      destino: destino.id,
      frequency: input.frequency,
      method: input.method,
      amount: resumo.amount,
      fee: resumo.fee,
      total: resumo.total,
      name: input.name,
      email: input.email,
    });
    return res.status(201).json({ doacaoId: id, checkoutUrl: session.checkoutUrl, resumo });
  } catch (error) {
    next(error);
  }
}

// Usado pela pagina de agradecimento: nunca devolve nome nem e-mail.
async function status(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = doacaoIdSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Codigo da doacao invalido.' });
  try {
    const doacao = await buscarDoacaoById(parsed.data.doacaoId);
    if (!doacao) return res.status(404).json({ error: 'Doacao nao encontrada.' });
    const destino = destinoPorId(doacao.destino);
    return res.json({
      id: doacao.id,
      status: doacao.status,
      confirmed: doacao.status === 'Confirmada',
      destino: destino ? destino.label : doacao.destino,
      frequency: doacao.frequency,
      amount: doacao.amount,
      fee: doacao.fee,
      total: doacao.total,
    });
  } catch (error) {
    next(error);
  }
}

function assinaturaPublica(subscription) {
  const destino = destinoPorId(subscription.metadata.destino);
  return {
    status: subscription.status,
    active: ['active', 'trialing', 'past_due'].includes(subscription.status),
    destino: destino ? destino.label : 'Paróquia São Rafael',
    total: subscription.total,
    nextChargeAt: subscription.nextChargeAt,
  };
}

async function assinatura(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = assinaturaTokenSchema.safeParse(req.query);
  const subscriptionId = parsed.success ? lerTokenAssinatura(parsed.data.token) : null;
  if (!subscriptionId) return res.status(401).json({ error: 'Link invalido ou expirado.' });
  try {
    return res.json(assinaturaPublica(await buscarAssinatura(subscriptionId)));
  } catch (error) {
    next(error);
  }
}

async function cancelarAssinaturaHandler(req, res, next) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const parsed = assinaturaTokenSchema.safeParse(req.body);
  const subscriptionId = parsed.success ? lerTokenAssinatura(parsed.data.token) : null;
  if (!subscriptionId) return res.status(401).json({ error: 'Link invalido ou expirado.' });
  try {
    const atual = await buscarAssinatura(subscriptionId);
    if (atual.status !== 'canceled') await cancelarAssinatura(subscriptionId);
    console.log(JSON.stringify({ event: 'donation_subscription_canceled', subscriptionId, ts: new Date().toISOString() }));
    return res.json({ ...assinaturaPublica(atual), status: 'canceled', active: false, nextChargeAt: '' });
  } catch (error) {
    next(error);
  }
}

module.exports = { config, checkout, status, assinatura, cancelarAssinatura: cancelarAssinaturaHandler };
