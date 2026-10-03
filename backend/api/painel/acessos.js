const express = require('express');
const { z } = require('zod');
const { exigirPermissao } = require('../../lib/pascom-permissoes');
const { AREAS, PAPEIS, PROTEGIDAS } = require('../../lib/permissions');
const { listarMatriz, salvarAcesso } = require('../../lib/acessos');
const { listarEquipe, adicionarMembro, atualizarMembro } = require('../../lib/equipe');
const { registrarAuditoria } = require('../../lib/audit');
const { validar } = require('../../lib/erros');

const router = express.Router();

const PAPEIS_INFO = [
  { id: 'admin', nome: 'Administrador', descricao: 'Tudo, incluindo acessos e módulos. Papel fixo.' },
  { id: 'coord', nome: 'Coordenação', descricao: 'Organiza eventos, agenda, categorias e a ajuda.' },
  { id: 'foto', nome: 'Fotógrafo', descricao: 'Envia fotos e cuida das galerias dos seus eventos.' },
  { id: 'atend', nome: 'Atendimento', descricao: 'Pedidos, agenda e Central de ajuda.' },
];

const auditar = (req, mensagem) => registrarAuditoria({ quem: req.membro.email, mensagem });
const permissoesSchema = z.object({ permissoes: z.array(z.string().max(60)).max(60) }).strict();
const nomeDoPapel = (id) => PAPEIS_INFO.find((p) => p.id === id)?.nome || id;

/** GET /api/pascom/acessos — a matriz papel × área, os papéis e a equipe (só admin). */
router.get('/', exigirPermissao('acessos.gerenciar'), async (_req, res, next) => {
  try {
    const [matriz, equipe] = await Promise.all([listarMatriz(), listarEquipe()]);
    res.json({ papeis: PAPEIS_INFO, areas: AREAS, protegidas: PROTEGIDAS, matriz, equipe });
  } catch (err) {
    next(err);
  }
});

router.put('/papeis/:papel', exigirPermissao('acessos.gerenciar'), async (req, res, next) => {
  try {
    const { permissoes } = validar(permissoesSchema, req.body);
    const antes = (await listarMatriz())[req.params.papel] || [];
    const depois = await salvarAcesso(req.params.papel, permissoes, req.membro.email);
    const liberou = depois.filter((p) => !antes.includes(p));
    const tirou = antes.filter((p) => !depois.includes(p));
    const partes = [liberou.length ? `liberou ${liberou.join(', ')}` : '', tirou.length ? `tirou ${tirou.join(', ')}` : ''].filter(Boolean);
    await auditar(req, `Acessos: ${nomeDoPapel(req.params.papel)} — ${partes.join('; ') || 'sem mudanças'}`);
    res.json({ papel: req.params.papel, permissoes: depois });
  } catch (err) {
    next(err);
  }
});

router.post('/equipe', exigirPermissao('acessos.gerenciar'), async (req, res, next) => {
  try {
    const m = await adicionarMembro(req.body);
    await auditar(req, `Equipe: ${m.email} adicionado como ${nomeDoPapel(m.role)}`);
    res.status(201).json(m);
  } catch (err) {
    next(err);
  }
});

router.patch('/equipe/:email', exigirPermissao('acessos.gerenciar'), async (req, res, next) => {
  try {
    const m = await atualizarMembro(req.params.email, req.body);
    const o = req.body && req.body.ativo !== undefined ? (req.body.ativo ? 'reativado' : 'desativado') : `agora é ${nomeDoPapel(m.role)}`;
    await auditar(req, `Equipe: ${m.email} ${o}`);
    res.json(m);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.PAPEIS = PAPEIS;
