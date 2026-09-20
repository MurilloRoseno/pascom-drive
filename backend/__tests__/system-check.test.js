const fs = require('fs');
const path = require('path');
const {
  consolidar, falhaAppsScript, interpretarDiagnostico, resumir, verificarAmbiente, verificarPlanilha,
} = require('../lib/system-check');
const { VERSAO_WEBAPP_ESPERADA } = require('../lib/apps-script-client');

const AGORA = Date.parse('2026-09-19T12:00:00Z');
const envCompleto = {
  MP_ACCESS_TOKEN: 'APP_USR-segredo', MP_WEBHOOK_SECRET: 'w', GOOGLE_SERVICE_ACCOUNT_EMAIL: 'sa@x', GOOGLE_PRIVATE_KEY_B64: 'a2V5',
  SPREADSHEET_ID: 's', UPLOAD_WEBAPP_URL: 'https://script.google.com/x/exec', APPS_SCRIPT_HMAC_SECRET: 'h',
  DOWNLOAD_JWT_SECRET: 'd', FORENSIC_WATERMARK_SECRET: 'f', SMTP_USER: 'u', SMTP_APP_PASSWORD: 'p',
  MEDIA_TOKEN_SECRET: 'm', GALLERY_CODE_SALT: 'g', PUBLIC_APP_URL: 'https://pascom', CACHE_INVALIDATION_SECRET: 'c',
};

function porId(itens) {
  return Object.fromEntries(itens.map((i) => [i.id, i]));
}

function diagOk(overrides = {}) {
  return {
    versao: VERSAO_WEBAPP_ESPERADA,
    gatilho: true,
    ultimaExecucao: { fim: '2026-09-19T11:57:00Z', resultado: 'sem_eventos' },
    lock: null,
    propriedades: { SOURCE_FOLDER_ID: { presente: true, obrigatoria: true }, ADMIN_EMAIL: { presente: true, obrigatoria: false } },
    pastas: { origem: 'ok', originais: 'ok', previas: 'ok', miniaturas: 'ausente' },
    quarentena: [],
    enviando: { quantidade: 0, maisAntigo: null },
    armazenamento: { usado: 5, limite: 15, livre: 10 },
    conciliacao: { quando: '2026-09-19T11:58:00Z', resumo: { erros: 0, avisos: 0 } },
    ...overrides,
  };
}

it('a versao esperada pelo backend e a mesma declarada no Web App', () => {
  const upload = fs.readFileSync(path.join(__dirname, '../../google-apps-script/Upload.js'), 'utf8');
  expect(Number(/var VERSAO_WEBAPP = (\d+);/.exec(upload)[1])).toBe(VERSAO_WEBAPP_ESPERADA);
});

it('ambiente completo fica todo ok e nunca devolve valores das variaveis', () => {
  const itens = verificarAmbiente(envCompleto);
  expect(itens.every((i) => i.estado === 'ok' && i.orientacao === '')).toBe(true);
  expect(JSON.stringify(itens)).not.toContain('APP_USR-segredo');
});

it('aponta variaveis ausentes, sandbox ligado e SMTP faltando', () => {
  const itens = porId(verificarAmbiente({ ...envCompleto, MP_WEBHOOK_SECRET: '', MP_USE_SANDBOX: 'true', SMTP_APP_PASSWORD: '' }));
  expect(itens.mp_webhook).toEqual(expect.objectContaining({ estado: 'erro', grupo: 'pagamentos' }));
  expect(itens.mp_webhook.orientacao).toMatch(/MP_WEBHOOK_SECRET/);
  expect(itens.mp_producao.estado).toBe('aviso');
  expect(itens.smtp.estado).toBe('aviso');
  expect(itens.chave_servico.estado).toBe('ok');
});

it('confere as abas da planilha e os eventos com erro', () => {
  const faltando = porId(verificarPlanilha(new Set(['Eventos', 'Fotos']), 2));
  expect(faltando.abas.estado).toBe('erro');
  expect(faltando.abas.orientacao).toMatch(/Pedidos/);
  expect(faltando.eventos_erro.estado).toBe('aviso');
  expect(porId(verificarPlanilha(null)).planilha_acesso.estado).toBe('erro');
});

it('diagnostico saudavel fica ok', () => {
  const itens = interpretarDiagnostico(diagOk(), VERSAO_WEBAPP_ESPERADA, AGORA);
  expect(resumir(itens)).toEqual({ erros: 0, avisos: 0 });
});

it('cobra a conferencia de pagamentos atrasada e mostra os pedidos com problema', () => {
  const atrasada = porId(interpretarDiagnostico(diagOk({
    conciliacao: { quando: '2026-09-19T11:20:00Z', resumo: { erros: 0, avisos: 0 } },
  }), VERSAO_WEBAPP_ESPERADA, AGORA));
  expect(atrasada.conciliacao).toEqual(expect.objectContaining({ estado: 'erro', grupo: 'entregas' }));
  expect(atrasada.conciliacao.orientacao).toMatch(/BACKEND_URL/);

  const semRegistro = porId(interpretarDiagnostico(diagOk({ conciliacao: null }), VERSAO_WEBAPP_ESPERADA, AGORA));
  expect(semRegistro.conciliacao.estado).toBe('aviso');
  expect(semRegistro.entregas_atencao).toBeUndefined();

  const comProblema = porId(interpretarDiagnostico(diagOk({
    conciliacao: { quando: '2026-09-19T11:58:00Z', resumo: { erros: 2, avisos: 1 } },
  }), VERSAO_WEBAPP_ESPERADA, AGORA));
  expect(comProblema.entregas_atencao.estado).toBe('erro');
  expect(comProblema.entregas_atencao.orientacao).toMatch(/aba Pedidos/);

  const soAviso = porId(interpretarDiagnostico(diagOk({
    conciliacao: { quando: '2026-09-19T11:58:00Z', resumo: { erros: 0, avisos: 3 } },
  }), VERSAO_WEBAPP_ESPERADA, AGORA));
  expect(soAviso.entregas_atencao.estado).toBe('aviso');
});

it('detecta versao antiga, gatilho ausente, execucao atrasada, pastas e quarentena', () => {
  const itens = porId(interpretarDiagnostico(diagOk({
    versao: 1,
    gatilho: false,
    ultimaExecucao: { fim: '2026-09-19T10:00:00Z', resultado: 'ok' },
    propriedades: { WATERMARK_API_SECRET: { presente: false, obrigatoria: true }, ADMIN_EMAIL: { presente: false, obrigatoria: false } },
    pastas: { origem: 'ok', originais: 'inacessivel', previas: 'ok', miniaturas: 'ausente' },
    quarentena: [{ nome: '_ERRO_x' }],
    enviando: { quantidade: 1, maisAntigo: '2026-09-17T10:00:00Z' },
    lock: { eventoId: 'EV1', desde: '2026-09-19T11:00:00Z' },
  }), VERSAO_WEBAPP_ESPERADA, AGORA));
  expect(itens.webapp.estado).toBe('erro');
  expect(itens.webapp.orientacao).toMatch(/nova versão/);
  expect(itens.gatilho.orientacao).toMatch(/criarTriggers/);
  expect(itens.execucao.estado).toBe('aviso');
  expect(itens.propriedades.orientacao).toMatch(/WATERMARK_API_SECRET/);
  expect(itens.admin_email.estado).toBe('aviso');
  expect(itens.pastas.orientacao).toMatch(/originais \(inacessivel\)/);
  expect(itens.quarentena.estado).toBe('aviso');
  expect(itens.envios_abertos.estado).toBe('aviso');
  expect(itens.lock.estado).toBe('aviso');
});

it('classifica o espaco do Drive em faixas', () => {
  const espaco = (usado) => porId(interpretarDiagnostico(diagOk({ armazenamento: { usado, limite: 100, livre: 100 - usado } }), VERSAO_WEBAPP_ESPERADA, AGORA)).espaco.estado;
  expect(espaco(50)).toBe('ok');
  expect(espaco(85)).toBe('aviso');
  expect(espaco(96)).toBe('erro');
});

it('explica falhas do Apps Script pelo codigo', () => {
  expect(falhaAppsScript({ codigo: 'assinatura_invalida' }).orientacao).toMatch(/APPS_SCRIPT_HMAC_SECRET/);
  expect(falhaAppsScript({ codigo: 'acao_invalida' }).orientacao).toMatch(/versão antiga/);
  expect(falhaAppsScript({ codigo: 'nao_configurado' }).orientacao).toMatch(/UPLOAD_WEBAPP_URL/);
  expect(falhaAppsScript({ message: 'timeout' }).orientacao).toMatch(/timeout/);
});

it('consolida um item por id em ordem de grupo', () => {
  const itens = consolidar(
    [{ id: 'a', grupo: 'site', estado: 'ok' }, { id: 'b', grupo: 'pagamentos', estado: 'ok' }],
    [{ id: 'a', grupo: 'site', estado: 'erro' }],
  );
  expect(itens.map((i) => `${i.id}:${i.estado}`)).toEqual(['b:ok', 'a:erro']);
});
