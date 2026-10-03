const express = require('express');
const { z } = require('zod');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const { temPermissao } = require('../../lib/permissions');
const { lerConfig, salvarConfig, CAMPOS } = require('../../lib/config-store');
const { registrarAuditoria, ultimasAlteracoes } = require('../../lib/audit');
const { ErroNegocio } = require('../../lib/erros');
const { precisaReverificar, DICA_REVERIFICACAO } = require('../../lib/reverificacao');

const router = express.Router();

/** Só ErroNegocio e erro de validação têm a mensagem devolvida; o resto vira 500 genérico. */
function tratar(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErroNegocio) return res.status(err.status).json({ error: err.message });
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos' });
      console.error('[pascom]', req.method, req.path, err.message);
      return res.status(500).json({ error: 'Erro interno. Tente de novo em instantes.' });
    }
  };
}

const auditar = (req, mensagem) => registrarAuditoria({ quem: req.membro.email, mensagem });

router.use('/acessos', require('./acessos'));

// ── Configurações ────────────────────────────────────────────────────────────
const PERMISSAO_DA_CHAVE = {
  precoFoto: 'pagamentos.editar',
  prazoPadraoDias: 'eventos.editar',
  tarja: 'seguranca.editar',
  previaLargura: 'seguranca.editar',
  whatsapp: 'conteudo.editar',
  repassarTaxa: 'pagamentos.editar',
  distribuicaoTaxa: 'pagamentos.editar',
  tarifaCartaoPct: 'pagamentos.editar',
  tarifaCartaoFixo: 'pagamentos.editar',
  tarifaPixPct: 'pagamentos.editar',
  tarifaPixFixo: 'pagamentos.editar',
  assistenteAtivo: 'ajuda.editar',
  assistenteFonteFaq: 'ajuda.editar',
  assistenteFonteAgenda: 'ajuda.editar',
  assistenteFonteEventos: 'ajuda.editar',
  assistenteForaDoEscopo: 'ajuda.editar',
};
// Mudar dinheiro (preço, repasse, tarifas) exige login recente: reautenticação.
const SENSIVEIS = new Set([
  'precoFoto', 'repassarTaxa', 'distribuicaoTaxa',
  'tarifaCartaoPct', 'tarifaCartaoFixo', 'tarifaPixPct', 'tarifaPixFixo',
]);

const ROTULO_DA_CHAVE = {
  precoFoto: 'Preço por foto',
  prazoPadraoDias: 'Prazo padrão de permanência (dias)',
  tarja: 'Tarja nas prévias',
  previaLargura: 'Largura da prévia',
  whatsapp: 'WhatsApp da secretaria',
  repassarTaxa: 'Repassar a taxa ao comprador',
  distribuicaoTaxa: 'Distribuição da taxa (% em comodidade)',
  tarifaCartaoPct: 'Tarifa do cartão (%)',
  tarifaCartaoFixo: 'Tarifa fixa do cartão (R$)',
  tarifaPixPct: 'Tarifa do Pix (%)',
  tarifaPixFixo: 'Tarifa fixa do Pix (R$)',
  assistenteAtivo: 'Assistente no site',
  assistenteFonteFaq: 'Assistente consulta a Central de ajuda',
  assistenteFonteAgenda: 'Assistente consulta a agenda',
  assistenteFonteEventos: 'Assistente consulta os eventos publicados',
  assistenteForaDoEscopo: 'Resposta para assuntos fora do site',
};

const configSchema = z.object({
  chave: z.string(),
  valor: z.union([z.string().max(200), z.number(), z.boolean()]),
}).strict();

router.get('/configuracoes', exigirPermissao(), tratar(async (_req, res) => {
  res.json(await lerConfig());
}));

router.put('/configuracoes', exigirPermissao(), tratar(async (req, res) => {
  const { chave, valor } = configSchema.parse(req.body);
  const permissao = PERMISSAO_DA_CHAVE[chave];
  if (!permissao || !CAMPOS[chave]) throw new ErroNegocio('Chave de configuração inválida');
  if (!temPermissao(req.membro.role, permissao)) {
    return res.status(403).json({ error: 'Sem permissão para esta ação' });
  }
  if (SENSIVEIS.has(chave) && precisaReverificar(req.sessao)) {
    return res.status(403).json(DICA_REVERIFICACAO);
  }
  const antes = (await lerConfig())[chave];
  const depois = await salvarConfig(chave, valor, req.membro.email);
  await auditar(req, `${ROTULO_DA_CHAVE[chave]}: ${antes} → ${depois}`);
  return res.json({ chave, valor: depois });
}));

// ── Últimas alterações no painel (Visão geral) ─────────────────────────────────
router.get('/auditoria', exigirPermissao(), tratar(async (_req, res) => {
  res.json({ alteracoes: await ultimasAlteracoes(8) });
}));

module.exports = router;
