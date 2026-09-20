const { AppsScriptError, chamarAppsScript } = require('../lib/apps-script-client');
const {
  uploadEventoSchema, uploadSessoesSchema, uploadFinalizarSchema, uploadIdSchema,
} = require('../lib/validation');

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';

function quem(req) {
  return req.pascom?.email || req.pascom?.phone || req.pascom?.userId || '';
}

// O CORS global ja recusou origens desconhecidas; sem Origin, usa o dominio publico.
function origemNavegador(req) {
  return req.headers.origin || process.env.FRONTEND_URL || PUBLIC_APP_URL;
}

function responderErro(res, next, error) {
  if (error instanceof AppsScriptError) {
    return res.status(error.status).json({ error: error.message, codigo: error.codigo });
  }
  return next(error);
}

function validar(schema, value, res) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message || 'Dados invalidos.' });
    return null;
  }
  return parsed.data;
}

async function criarEvento(req, res, next) {
  const dados = validar(uploadEventoSchema, req.body, res);
  if (!dados) return undefined;
  try {
    const envio = await chamarAppsScript('criarEvento', { ...dados, quem: quem(req) });
    return res.status(201).json(envio);
  } catch (error) {
    return responderErro(res, next, error);
  }
}

async function criarSessoes(req, res, next) {
  const dados = validar(uploadSessoesSchema, req.body, res);
  if (!dados) return undefined;
  try {
    const result = await chamarAppsScript('criarSessoes', { ...dados, origem: origemNavegador(req) });
    return res.json(result);
  } catch (error) {
    return responderErro(res, next, error);
  }
}

async function finalizar(req, res, next) {
  const uploadId = validar(uploadIdSchema, req.params.uploadId, res);
  if (!uploadId) return undefined;
  const dados = validar(uploadFinalizarSchema, req.body, res);
  if (!dados) return undefined;
  try {
    const result = await chamarAppsScript('finalizar', { ...dados, uploadId, quem: quem(req) });
    return res.json(result);
  } catch (error) {
    return responderErro(res, next, error);
  }
}

async function cancelar(req, res, next) {
  const uploadId = validar(uploadIdSchema, req.params.uploadId, res);
  if (!uploadId) return undefined;
  try {
    return res.json(await chamarAppsScript('cancelar', { uploadId, quem: quem(req) }));
  } catch (error) {
    return responderErro(res, next, error);
  }
}

async function armazenamento(_req, res, next) {
  try {
    return res.json(await chamarAppsScript('armazenamento', {}));
  } catch (error) {
    return responderErro(res, next, error);
  }
}

module.exports = { armazenamento, cancelar, criarEvento, criarSessoes, finalizar };
