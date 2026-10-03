const express = require('express');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const { calculatePricing } = require('../../lib/pricing');
const { precosBase, regrasPagamento } = require('../../lib/tarifas');
const { gatewayAtivo } = require('../../lib/gateway');
const { ErroNegocio } = require('../../lib/erros');
const { tratar } = require('./tratar');

const router = express.Router();

const MAX_FOTOS = 100; // mesmo limite do checkout (validation.js)
const QUANTIDADES_DA_TABELA = [1, 3, 5, 10];
const arredonda = (v) => Math.round(v * 100) / 100;

/** Mesma conta do checkout (lib/pricing): o simulador nunca diverge do que o comprador paga. */
function cotar(quantidade, metodo, regras, base) {
  const p = calculatePricing(quantidade, metodo, regras, {}, base);
  const regra = regras.find((r) => r.method === metodo);
  const retido = arredonda((p.total * Number(regra.percentage || 0)) / 100 + Number(regra.fixed || 0));
  return {
    quantidade,
    precoUnitario: p.unitPrice,
    subtotal: p.subtotal,
    taxaServico: p.serviceFee,
    taxaComodidade: p.convenienceFee,
    custoPagamento: p.paymentCost,
    total: p.total,
    gatewayRetem: retido,
    liquido: arredonda(p.total - retido),
  };
}

/** GET /api/pascom/pagamentos/simulador?quantidade=N */
router.get('/simulador', exigirPermissao('pagamentos.ver'), tratar(async (req, res) => {
  const texto = String(req.query.quantidade);
  const q = Number(texto);
  if (!/^\d+$/.test(texto) || q < 1 || q > MAX_FOTOS) throw new ErroNegocio(`Escolha de 1 a ${MAX_FOTOS} fotos.`);
  const [base, regras] = await Promise.all([precosBase(), regrasPagamento()]);
  const atual = { pix: cotar(q, 'pix', regras, base), cartao: cotar(q, 'credit_card', regras, base) };
  const tabela = QUANTIDADES_DA_TABELA.map((quantidade) => {
    const pix = cotar(quantidade, 'pix', regras, base);
    const cartao = cotar(quantidade, 'credit_card', regras, base);
    return { quantidade, pix, cartao, acrescimoCartaoPercentual: ((cartao.total - cartao.subtotal) / cartao.subtotal) * 100 };
  });
  res.json({ atual, tabela });
}));

const chaveSecreta = (v) => typeof v === 'string' && (v.startsWith('sk_') || v.startsWith('rk_'));
const forte = (v) => String(v || '').length >= 32;

/**
 * GET /api/pascom/pagamentos/estado: o que está configurado, nunca o valor.
 * Os segredos moram só no ambiente do servidor; o painel não os lê nem os escreve.
 */
router.get('/estado', exigirPermissao('pagamentos.ver'), (_req, res) => {
  const chave = process.env.STRIPE_SECRET_KEY;
  res.json({
    gateway: gatewayAtivo(),
    gatewayDefinido: Boolean(String(process.env.PAYMENT_GATEWAY || '').trim()),
    stripe: {
      chaveSecreta: chaveSecreta(chave),
      segredoWebhook: String(process.env.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_'),
      modo: chaveSecreta(chave) ? (chave.includes('_test_') ? 'teste' : 'producao') : null,
    },
    segredos: {
      download: forte(process.env.DOWNLOAD_JWT_SECRET),
      marcaForense: forte(process.env.FORENSIC_WATERMARK_SECRET),
    },
  });
});

module.exports = router;
