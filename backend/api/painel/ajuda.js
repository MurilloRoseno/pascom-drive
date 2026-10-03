const express = require('express');
const { z } = require('zod');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const {
  TEMAS, listarFaq, criarFaq, atualizarFaq, excluirFaq,
} = require('../../lib/faq');
const { listarSemResposta, resolverSemResposta } = require('../../lib/sem-resposta');
const { registrarAuditoria } = require('../../lib/audit');
const { tratar } = require('./tratar');

const router = express.Router();

const auditar = (req, mensagem) => registrarAuditoria({ quem: req.membro.email, mensagem });

/** GET /api/pascom/faq: todas as perguntas (inclusive rascunhos) e as que o assistente não soube responder. */
router.get('/', exigirPermissao('ajuda.ver'), tratar(async (_req, res) => {
  const [perguntas, semResposta] = await Promise.all([listarFaq(), listarSemResposta(10)]);
  res.json({ temas: TEMAS, perguntas, semResposta });
}));

/** POST /api/pascom/faq: cria como rascunho; `daPergunta` marca a pergunta sem resposta como resolvida. */
router.post('/', exigirPermissao('ajuda.criar'), tratar(async (req, res) => {
  const { daPergunta, ...dados } = req.body || {};
  z.string().max(200).optional().parse(daPergunta);
  const criada = await criarFaq(dados);
  if (daPergunta) await resolverSemResposta(daPergunta);
  await auditar(req, `Central de ajuda: pergunta «${criada.pergunta}» criada (rascunho)`);
  res.status(201).json(criada);
}));

router.patch('/:id', exigirPermissao('ajuda.editar'), tratar(async (req, res) => {
  const f = await atualizarFaq(req.params.id, req.body);
  const o = req.body && req.body.publicada !== undefined ? (req.body.publicada ? 'publicada' : 'voltou a rascunho') : 'editada';
  await auditar(req, `Central de ajuda: pergunta «${f.pergunta}» ${o}`);
  res.json(f);
}));

router.delete('/:id', exigirPermissao('ajuda.excluir'), tratar(async (req, res) => {
  await excluirFaq(req.params.id);
  await auditar(req, `Central de ajuda: pergunta ${req.params.id} excluída`);
  res.json({ ok: true });
}));

module.exports = router;
