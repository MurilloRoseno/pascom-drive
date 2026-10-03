const express = require('express');
const { z } = require('zod');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const { temPermissao } = require('../../lib/permissions');
const { lerConfig, salvarConfig, CAMPOS } = require('../../lib/config-store');
const { registrarAuditoria, ultimasAlteracoes } = require('../../lib/audit');
const { ErroNegocio } = require('../../lib/erros');
const {
  listarCategorias, criarCategoria, atualizarCategoria, moverCategoria, removerCategoria,
} = require('../../lib/categorias');
const { listarEventosAdmin, atualizarPublicacao, atualizarCategoriaEvento } = require('../../lib/eventos-admin');
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


// ── Eventos ──────────────────────────────────────────────────────────────────
router.get('/eventos', exigirPermissao('eventos.ver'), tratar(async (_req, res) => {
  const [eventos, config] = await Promise.all([listarEventosAdmin(), lerConfig()]);
  res.json({ eventos, prazoPadraoDias: config.prazoPadraoDias });
}));

router.put('/eventos/:id/publicacao', exigirPermissao('eventos.editar'), tratar(async (req, res) => {
  const evento = await atualizarPublicacao(req.params.id, req.body);
  await auditar(req, `Evento «${evento.nome}»: ${descreverPublicacao(evento)}`);
  res.json(evento);
}));

router.put('/eventos/:id/categoria', exigirPermissao('eventos.editar'), tratar(async (req, res) => {
  const { categoria } = z.object({ categoria: z.string().max(80) }).strict().parse(req.body);
  const evento = await atualizarCategoriaEvento(req.params.id, categoria);
  await auditar(req, `Evento «${evento.nome}»: categoria ${evento.categoria}`);
  res.json(evento);
}));

function descreverPublicacao(e) {
  const prazo = e.prazoDias > 0 ? `${e.prazoDias} dias no ar` : 'sem prazo';
  if (e.estado === 'rascunho') return 'voltou a rascunho';
  if (e.estado === 'arquivado') return 'arquivado';
  if (e.estado === 'agendado') return `publicação agendada para ${e.publicarEm.replace('T', ' ')} (${prazo})`;
  return `publicado (${prazo})`;
}

// ── Categorias ───────────────────────────────────────────────────────────────
router.get('/categorias', exigirPermissao('categorias.ver'), tratar(async (_req, res) => {
  res.json({ categorias: await listarCategorias({ incluirOcultas: true }) });
}));

router.post('/categorias', exigirPermissao('categorias.criar'), tratar(async (req, res) => {
  const dados = z.object({ nome: z.string().max(80), tipo: z.string() }).strict().parse(req.body);
  const criada = await criarCategoria(dados);
  await auditar(req, `Categoria «${criada.nome}» criada`);
  res.status(201).json(criada);
}));

router.patch('/categorias/:id', exigirPermissao('categorias.editar'), tratar(async (req, res) => {
  const patch = z.object({ nome: z.string().max(80).optional(), ativo: z.boolean().optional() }).strict().parse(req.body);
  const c = await atualizarCategoria(req.params.id, patch);
  const o = patch.ativo === undefined ? 'renomeada' : (patch.ativo ? 'reativada' : 'ocultada');
  await auditar(req, `Categoria «${c.nome}» ${o}`);
  res.json(c);
}));

router.post('/categorias/:id/mover', exigirPermissao('categorias.editar'), tratar(async (req, res) => {
  const { direcao } = z.object({ direcao: z.enum(['subir', 'descer']) }).strict().parse(req.body);
  res.json({ moveu: await moverCategoria(req.params.id, direcao) });
}));

router.delete('/categorias/:id', exigirPermissao('categorias.excluir'), tratar(async (req, res) => {
  const r = await removerCategoria(req.params.id);
  await auditar(req, `Categoria ${req.params.id} ${r.resultado}`);
  res.json(r);
}));

module.exports = router;


// ── Últimas alterações no painel (Visão geral) ─────────────────────────────────
router.get('/auditoria', exigirPermissao(), tratar(async (_req, res) => {
  res.json({ alteracoes: await ultimasAlteracoes(8) });
}));

module.exports = router;
