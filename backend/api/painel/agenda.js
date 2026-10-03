const express = require('express');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const {
  TIPOS, listarCompromissos, criarCompromisso, atualizarCompromisso, removerCompromisso, ocorrenciasDoMes,
} = require('../../lib/agenda');
const { registrarAuditoria } = require('../../lib/audit');
const { ErroNegocio } = require('../../lib/erros');
const { hojeSP } = require('../../lib/datas');
const { tratar } = require('./tratar');

const router = express.Router();
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

const auditar = (req, mensagem) => registrarAuditoria({ quem: req.membro.email, mensagem });

/** GET /api/pascom/agenda?mes=AAAA-MM: ocorrências do mês e a lista de compromissos (séries). */
router.get('/', exigirPermissao('agenda.ver'), tratar(async (req, res) => {
  const mes = req.query.mes === undefined ? hojeSP().slice(0, 7) : req.query.mes;
  if (typeof mes !== 'string' || !MES.test(mes)) throw new ErroNegocio('Mês inválido.');
  const [ocorrencias, compromissos] = await Promise.all([ocorrenciasDoMes(mes), listarCompromissos()]);
  res.json({ mes, hoje: hojeSP(), tipos: TIPOS, ocorrencias, compromissos });
}));

router.post('/', exigirPermissao('agenda.criar'), tratar(async (req, res) => {
  const c = await criarCompromisso(req.body);
  await auditar(req, `Agenda: «${c.titulo}» adicionado em ${c.data}`);
  res.status(201).json(c);
}));

router.patch('/:id', exigirPermissao('agenda.editar'), tratar(async (req, res) => {
  const c = await atualizarCompromisso(req.params.id, req.body);
  await auditar(req, `Agenda: «${c.titulo}» alterado`);
  res.json(c);
}));

router.delete('/:id', exigirPermissao('agenda.excluir'), tratar(async (req, res) => {
  await removerCompromisso(req.params.id);
  await auditar(req, `Agenda: compromisso ${req.params.id} removido`);
  res.json({ ok: true });
}));

module.exports = router;
