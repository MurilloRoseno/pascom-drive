const crypto = require('crypto');

// Versao das acoes do Web App (VERSAO_WEBAPP em google-apps-script/Upload.js).
// Diferente = implantacao antiga: publique uma nova versao do Web App.
const VERSAO_WEBAPP_ESPERADA = 5;

// Codigos devolvidos pelo Web App (google-apps-script/Upload.js) -> status HTTP do painel.
const STATUS_POR_CODIGO = {
  dados_invalidos: 400,
  envio_nao_encontrado: 404,
  evento_nao_encontrado: 404,
  regra_negocio: 409,
  evento_duplicado: 409,
  envio_incompleto: 409,
  sem_espaco: 507,
  nao_configurado: 503,
  drive_indisponivel: 502,
  assinatura_invalida: 502,
  acao_invalida: 502,
};

class AppsScriptError extends Error {
  constructor(message, codigo = 'erro_interno', status = STATUS_POR_CODIGO[codigo] || 502) {
    super(message);
    this.name = 'AppsScriptError';
    this.codigo = codigo;
    this.status = status;
  }
}

function assinarEnvelope(acao, payload, secret, timestamp = Date.now()) {
  const body = JSON.stringify(payload);
  const assinatura = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${acao}.${body}`)
    .digest('hex');
  return { acao, timestamp, payload: body, assinatura };
}

/**
 * Chama o Web App do Apps Script, que roda como dono do Drive da Pascom.
 * Web Apps nao leem headers, entao a assinatura HMAC vai no corpo.
 */
async function chamarAppsScript(acao, payload = {}) {
  const url = process.env.UPLOAD_WEBAPP_URL;
  const secret = process.env.APPS_SCRIPT_HMAC_SECRET;
  if (!url || !secret) {
    throw new AppsScriptError('Envio de fotos nao configurado. Defina UPLOAD_WEBAPP_URL e APPS_SCRIPT_HMAC_SECRET.', 'nao_configurado');
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assinarEnvelope(acao, payload, secret)),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
  } catch (_error) {
    throw new AppsScriptError('Apps Script indisponivel. Tente novamente em instantes.', 'drive_indisponivel');
  }

  let result;
  try {
    result = JSON.parse(await response.text());
  } catch (_error) {
    throw new AppsScriptError('Resposta inesperada do Apps Script. Confira a implantacao do Web App.', 'erro_interno');
  }
  if (!result || result.ok !== true) {
    throw new AppsScriptError(result?.error || 'Falha no Apps Script.', result?.codigo || 'erro_interno');
  }
  return result.data;
}

module.exports = { AppsScriptError, assinarEnvelope, chamarAppsScript, STATUS_POR_CODIGO, VERSAO_WEBAPP_ESPERADA };
