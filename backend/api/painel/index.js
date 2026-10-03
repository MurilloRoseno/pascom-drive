const express = require('express');
const { z } = require('zod');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const { temPermissao } = require('../../lib/permissions');
const { lerConfig, salvarConfig, CAMPOS } = require('../../lib/config-store');
const { registrarAuditoria, ultimasAlteracoes } = require('../../lib/audit');
const { ErroNegocio } = require('../../lib/erros');
const { tratar } = require('./tratar');
const {
  listarCategorias, criarCategoria, atualizarCategoria, moverCategoria, removerCategoria,
} = require('../../lib/categorias');
const { listarEventosAdmin, atualizarPublicacao, atualizarCategoriaEvento } = require('../../lib/eventos-admin');
const { lerConteudo, publicarConteudo } = require('../../lib/conteudo');
const {
  BLOCOS, lerHome, salvarHome,
} = require('../../lib/home');
const { lerModulos } = require('../../lib/modulos');
const { montarBackup } = require('../../lib/backup');
const { precisaReverificar, DICA_REVERIFICACAO } = require('../../lib/reverificacao');

const router = express.Router();

const auditar = (req, mensagem) => registrarAuditoria({ quem: req.membro.email, mensagem });

router.use('/acessos', require('./acessos'));
router.use('/pagamentos', require('./pagamentos'));
router.use('/agenda', require('./agenda'));
router.use('/faq', require('./ajuda'));
router.use('/modulos', require('./modulos'));

// ── Configurações ────────────────────────────────────────────────────────────
const PERMISSAO_DA_CHAVE = {
  precoFoto: 'pagamentos.editar',
  prazoPadraoDias: 'eventos.editar',
  whatsapp: 'conteudo.editar',
  taxaServico: 'pagamentos.editar',
  taxaComodidade: 'pagamentos.editar',
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
// Mudar dinheiro (preço, taxas, tarifas) exige login recente: reautenticação.
const SENSIVEIS = new Set([
  'precoFoto', 'taxaServico', 'taxaComodidade',
  'tarifaCartaoPct', 'tarifaCartaoFixo', 'tarifaPixPct', 'tarifaPixFixo',
]);

const ROTULO_DA_CHAVE = {
  precoFoto: 'Preço por foto',
  prazoPadraoDias: 'Prazo padrão de permanência (dias)',
  whatsapp: 'WhatsApp da secretaria',
  taxaServico: 'Taxa de serviço (R$)',
  taxaComodidade: 'Taxa de comodidade (R$)',
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


// ── Conteúdo do site ─────────────────────────────────────────────────────────
router.get('/conteudo', exigirPermissao('conteudo.ver'), tratar(async (_req, res) => {
  res.json(await lerConteudo());
}));

/** PUT /api/pascom/conteudo: { nome?, email?, missao?, numeros?, depoimentos?, ... }. Tudo ou nada. */
router.put('/conteudo', exigirPermissao('conteudo.editar'), tratar(async (req, res) => {
  const alteracoes = z.record(z.unknown()).parse(req.body);
  const { alterados } = await publicarConteudo(alteracoes, req.membro.email);
  await auditar(req, `Conteúdo do site publicado: ${alterados.join(', ')}`);
  res.json({ alterados, conteudo: await lerConteudo() });
}));


// ── Backup ───────────────────────────────────────────────────────────────────
/** GET /api/pascom/backup: cópia das configurações em JSON. Só o administrador (leva a lista da equipe). */
router.get('/backup', exigirPermissao('acessos.gerenciar'), tratar(async (req, res) => {
  const backup = await montarBackup();
  await auditar(req, 'Backup das configurações baixado');
  const dia = backup.geradoEm.slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="pascom-backup-${dia}.json"`);
  res.setHeader('Cache-Control', 'no-store');
  res.json(backup);
}));

// ── Página inicial ───────────────────────────────────────────────────────────
/** GET /api/pascom/home: blocos na ordem, destaque, de que módulo cada bloco depende e eventos no ar. */
router.get('/home', exigirPermissao('conteudo.ver'), tratar(async (_req, res) => {
  const [{ blocos, destaque }, modulos, eventos] = await Promise.all([lerHome(), lerModulos(), listarEventosAdmin()]);
  const info = Object.fromEntries(BLOCOS.map((b) => [b.id, {
    modulo: b.modulo,
    noAr: b.modulo && modulos[b.modulo] ? modulos[b.modulo].efetivo : true,
    so: b.so || null,
  }]));
  res.json({
    blocos,
    destaque,
    info,
    eventosNoAr: eventos.filter((e) => e.estado === 'no_ar').map((e) => ({ eventoId: e.eventoId, nome: e.nome })),
  });
}));

/** PUT /api/pascom/home { blocos: [{id, titulo, ligado}] (todos, na ordem), destaque } */
router.put('/home', exigirPermissao('conteudo.editar'), tratar(async (req, res) => {
  const dados = await salvarHome(req.body, req.membro.email);
  await auditar(req, 'Página inicial publicada (ordem, títulos e destaque)');
  res.json(dados);
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
