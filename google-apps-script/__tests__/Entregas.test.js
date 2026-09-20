const crypto = require('crypto');
const {
  CONCILIACAO_ROTA, CONCILIACAO_KEY, ALERTA_ENTREGA_KEY, VARREDURA_MP_KEY,
  conciliarEntregasBackend, avisarProblemasEntrega,
} = require('../Entregas');

const BACKEND = 'https://pascom-drive.test';
const AGORA = Date.parse('2026-09-19T12:00:00Z');

let propriedades;
let respostas;
let chamadas;

function respostaHttp(codigo, corpo) {
  return {
    getResponseCode: () => codigo,
    getContentText: () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
  };
}

function resumoOk(overrides = {}) {
  return {
    verificados: 4,
    conciliados: 1,
    entregues: 2,
    reenviados: 1,
    parcial: false,
    problemas: [],
    resumo: { erros: 0, avisos: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(AGORA);
  propriedades = {
    BACKEND_URL: BACKEND,
    APPS_SCRIPT_HMAC_SECRET: 'segredo-hmac',
    WATERMARK_API_SECRET: 'segredo-legado',
    ADMIN_EMAIL: 'admin@paroquia.test',
  };
  global.PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (chave) => (propriedades[chave] === undefined ? null : propriedades[chave]),
      setProperty: (chave, valor) => { propriedades[chave] = valor; },
    }),
  };
  respostas = [respostaHttp(200, resumoOk())];
  chamadas = [];
  global.UrlFetchApp = {
    fetch: jest.fn((url, opcoes) => {
      chamadas.push({ url, opcoes });
      return respostas.shift() || respostaHttp(200, resumoOk());
    }),
  };
  global.MailApp = { sendEmail: jest.fn() };
  global.Logger = { log: jest.fn() };
});

afterEach(() => jest.restoreAllMocks());

function envio() {
  return chamadas[0];
}

it('chama a rota interna assinada, com o orcamento que sobrou do ciclo', () => {
  const resultado = conciliarEntregasBackend(AGORA - 60000);

  expect(resultado).toEqual(expect.objectContaining({ resultado: 'ok', entregues: 2, reenviados: 1 }));
  expect(envio().url).toBe(BACKEND + CONCILIACAO_ROTA);
  const corpo = JSON.parse(envio().opcoes.payload);
  expect(corpo.limiteMs).toBeLessThanOrEqual(20000);
  expect(corpo.limiteMs).toBeGreaterThan(0);

  const headers = envio().opcoes.headers;
  const esperada = crypto.createHmac('sha256', 'segredo-hmac')
    .update(headers['x-pascom-timestamp'] + '.POST.' + CONCILIACAO_ROTA + '.' + envio().opcoes.payload)
    .digest('hex');
  expect(headers['x-pascom-signature']).toBe(esperada);
});

it('guarda o resultado para a aba Sistema, sem dados do comprador', () => {
  respostas = [respostaHttp(200, resumoOk({
    resumo: { erros: 1, avisos: 2 },
    problemas: [
      { tipo: 'pago_sem_entrega', severidade: 'erro', motivo: 'Pago, sem link', pedidoId: 'PED_1', detalhe: 'maria@example.com' },
    ],
  }))];

  conciliarEntregasBackend(AGORA);

  const registro = JSON.parse(propriedades[CONCILIACAO_KEY]);
  expect(registro).toEqual(expect.objectContaining({
    verificados: 4,
    entregues: 2,
    reenviados: 1,
    resumo: { erros: 1, avisos: 2 },
  }));
  expect(registro.problemas).toEqual([
    { tipo: 'pago_sem_entrega', pedidoId: 'PED_1', severidade: 'erro', motivo: 'Pago, sem link' },
  ]);
  expect(propriedades[CONCILIACAO_KEY]).not.toContain('maria@example.com');
});

it('nao chama nada sem BACKEND_URL nem quando o ciclo acabou', () => {
  delete propriedades.BACKEND_URL;
  expect(conciliarEntregasBackend(AGORA)).toEqual({ resultado: 'nao_configurado' });

  propriedades.BACKEND_URL = BACKEND;
  expect(conciliarEntregasBackend(AGORA - 320000)).toEqual({ resultado: 'sem_tempo' });
  expect(global.UrlFetchApp.fetch).not.toHaveBeenCalled();
});

it('rota recusada e falha de rede ficam registradas, sem derrubar o ciclo', () => {
  respostas = [respostaHttp(401, '{"error":"Nao autorizado."}')];
  expect(conciliarEntregasBackend(AGORA)).toEqual({ resultado: 'erro', codigo: 401 });
  expect(JSON.parse(propriedades[CONCILIACAO_KEY]).erro).toContain('401');

  global.UrlFetchApp.fetch = jest.fn(() => { throw new Error('DNS fora do ar'); });
  expect(conciliarEntregasBackend(AGORA).resultado).toBe('erro');
  expect(JSON.parse(propriedades[CONCILIACAO_KEY]).erro).toBe('DNS fora do ar');
});

it('pede a varredura por data no maximo uma vez por hora', () => {
  conciliarEntregasBackend(AGORA);
  expect(JSON.parse(chamadas[0].opcoes.payload).varredura).toBe(true);

  respostas = [respostaHttp(200, resumoOk())];
  conciliarEntregasBackend(AGORA);
  expect(JSON.parse(chamadas[1].opcoes.payload).varredura).toBe(false);

  Date.now.mockReturnValue(AGORA + 61 * 60 * 1000);
  respostas = [respostaHttp(200, resumoOk())];
  conciliarEntregasBackend(AGORA + 61 * 60 * 1000);
  expect(JSON.parse(chamadas[2].opcoes.payload).varredura).toBe(true);
  expect(Number(propriedades[VARREDURA_MP_KEY])).toBeGreaterThan(AGORA);
});

it('avisa o responsavel por e-mail no maximo uma vez por dia', () => {
  const dados = {
    resumo: { erros: 2, avisos: 1 },
    problemas: [
      { tipo: 'pago_sem_entrega', severidade: 'erro', motivo: 'Pago, mas sem nenhum link', pedidoId: 'PED_1' },
      { tipo: 'pendente_sem_confirmacao', severidade: 'aviso', motivo: 'Pendente ha mais de uma hora', pedidoId: 'PED_2' },
    ],
  };

  expect(avisarProblemasEntrega(dados)).toBe(true);
  const email = global.MailApp.sendEmail.mock.calls[0][0];
  expect(email.to).toBe('admin@paroquia.test');
  expect(email.subject).toContain('2 pedido(s)');
  expect(email.body).toContain('PED_1');
  // Apenas os erros entram no aviso: avisos em espera nao acordam ninguem.
  expect(email.body).not.toContain('PED_2');

  expect(avisarProblemasEntrega(dados)).toBe(false);
  expect(global.MailApp.sendEmail).toHaveBeenCalledTimes(1);

  Date.now.mockReturnValue(AGORA + 25 * 60 * 60 * 1000);
  expect(avisarProblemasEntrega(dados)).toBe(true);
  expect(global.MailApp.sendEmail).toHaveBeenCalledTimes(2);
});

it('nao manda e-mail sem erro, sem ADMIN_EMAIL, e registra a data do ultimo aviso', () => {
  expect(avisarProblemasEntrega({ resumo: { erros: 0, avisos: 3 }, problemas: [] })).toBe(false);

  delete propriedades.ADMIN_EMAIL;
  expect(avisarProblemasEntrega({ resumo: { erros: 1 }, problemas: [] })).toBe(false);
  expect(global.MailApp.sendEmail).not.toHaveBeenCalled();

  propriedades.ADMIN_EMAIL = 'admin@paroquia.test';
  avisarProblemasEntrega({ resumo: { erros: 1 }, problemas: [] });
  expect(Number(propriedades[ALERTA_ENTREGA_KEY])).toBe(AGORA);
});
