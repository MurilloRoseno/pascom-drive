const express = require('express');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const {
  MODULOS, lerModulos, salvarModulo, derrubadosPor,
} = require('../../lib/modulos');
const { registrarAuditoria } = require('../../lib/audit');
const { ErroNegocio } = require('../../lib/erros');
const { tratar } = require('./tratar');

const router = express.Router();

const auditar = (req, mensagem) => registrarAuditoria({ quem: req.membro.email, mensagem });

/** GET /api/pascom/modulos: só o administrador. */
router.get('/', exigirPermissao('modulos.gerenciar'), tratar(async (_req, res) => {
  const estado = await lerModulos();
  res.json({
    modulos: MODULOS.map((m) => ({ ...m, ...estado[m.chave], derruba: derrubadosPor(m.chave) })),
  });
}));

/** PUT /api/pascom/modulos/:chave { ligado?, recado? } */
router.put('/:chave', exigirPermissao('modulos.gerenciar'), tratar(async (req, res) => {
  const modulo = MODULOS.find((m) => m.chave === req.params.chave);
  if (!modulo) throw new ErroNegocio('Módulo desconhecido.', 404);
  const novo = await salvarModulo(modulo.chave, req.body, req.membro.email);
  const caem = derrubadosPor(modulo.chave);
  const acao = req.body && req.body.ligado !== undefined
    ? (req.body.ligado ? 'ligado' : `desligado${caem.length ? ` (também cai: ${caem.join(', ')})` : ''}`)
    : 'recado alterado';
  await auditar(req, `Módulo «${modulo.nome}» ${acao}`);
  res.json({ chave: modulo.chave, ...novo, derruba: caem });
}));

module.exports = router;
