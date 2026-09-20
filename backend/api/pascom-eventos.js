const { AppsScriptError, chamarAppsScript } = require('../lib/apps-script-client');
const { detalharEventoPascom, listarEventosPascom } = require('../lib/google-sheets');
const { eventoAcaoSchema, eventoIdSchema } = require('../lib/validation');

function quem(req) {
  return req.pascom?.email || req.pascom?.phone || req.pascom?.userId || '';
}

function validar(schema, value, res) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados invalidos.' });
    return null;
  }
  return parsed.data;
}

async function listar(_req, res, next) {
  try {
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({ eventos: await listarEventosPascom() });
  } catch (error) {
    return next(error);
  }
}

async function detalhar(req, res, next) {
  const eventoId = validar(eventoIdSchema, req.params.eventoId, res);
  if (!eventoId) return undefined;
  try {
    const detalhe = await detalharEventoPascom(eventoId);
    if (!detalhe) return res.status(404).json({ error: 'Evento nao encontrado.' });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(detalhe);
  } catch (error) {
    return next(error);
  }
}

/** Escritas passam pelo Apps Script, que aplica as mesmas regras do menu da planilha. */
async function executarAcao(req, res, next) {
  const eventoId = validar(eventoIdSchema, req.params.eventoId, res);
  if (!eventoId) return undefined;
  const dados = validar(eventoAcaoSchema, req.body, res);
  if (!dados) return undefined;
  const { acao, ...parametros } = dados;
  try {
    const resultado = await chamarAppsScript(acao, { ...parametros, eventoId, quem: quem(req) });
    const detalhe = await detalharEventoPascom(eventoId);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      ...(detalhe || {}),
      // Codigo em claro so existe nesta resposta; a planilha guarda apenas o hash.
      ...(acao === 'gerarCodigo' && resultado?.codigo ? { codigo: resultado.codigo } : {}),
      ...(acao === 'liberarEspaco' && resultado ? { liberacao: resultado } : {}),
    });
  } catch (error) {
    if (error instanceof AppsScriptError) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    return next(error);
  }
}

module.exports = { detalhar, executarAcao, listar };
