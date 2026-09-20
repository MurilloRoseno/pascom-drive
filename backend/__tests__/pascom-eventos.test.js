jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    req.auth = () => ({ userId: global.__clerkUserId || null });
    next();
  }),
  getAuth: jest.fn((req) => req.auth()),
  clerkClient: { users: { getUser: jest.fn() } },
}));

jest.mock('../lib/google-sheets.shared', () => ({
  ...jest.requireActual('../lib/google-sheets.shared'),
  rows: jest.fn(),
}));

const request = require('supertest');
const { clerkClient } = require('@clerk/express');
const shared = require('../lib/google-sheets.shared');
const app = require('../server');

function row(data) {
  return { get: (key) => data[key], set: jest.fn(), save: jest.fn().mockResolvedValue() };
}

const equipe = [row({ Identificador: 'pascom@paroquia.test', Tipo: 'email', Nome: 'Pascom', Role: 'admin', Ativo: 'SIM' })];
let tabelas;

function appsScriptResponde(body) {
  global.fetch.mockResolvedValueOnce({ text: async () => JSON.stringify(body) });
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
  process.env.CLERK_SECRET_KEY = 'sk_test_123';
  process.env.UPLOAD_WEBAPP_URL = 'https://script.google.com/macros/s/abc/exec';
  process.env.APPS_SCRIPT_HMAC_SECRET = 'segredo-hmac';
  process.env.MEDIA_TOKEN_SECRET = 'segredo-midia';
  global.__clerkUserId = 'user_123';
  clerkClient.users.getUser.mockResolvedValue({
    fullName: 'Equipe', emailAddresses: [{ emailAddress: 'pascom@paroquia.test' }], phoneNumbers: [],
  });
  tabelas = {
    EquipePascom: equipe,
    Eventos: [
      row({
        EventoID: 'EV1', NomePasta: 'casamento__2026-05-20__joao-e-maria', Titulo: 'Joao e Maria', Categoria: 'casamento',
        DataEvento: '2026-05-20', StatusProcessamento: 'Processado', Visibilidade: 'protegida', VendaAutorizada: 'SIM',
        Publicacao: 'publicado', ProtecaoMenores: 'NAO', CodigoHash: 'HASH_SECRETO', DataCriacao: '2026-05-21T10:00:00Z',
      }),
    ],
    Fotos: [
      row({ FotoID: 'F1', EventoID: 'EV1', TipoFoto: 'foto', StatusProcessamento: 'Processada', PreviewFileID: 'P1', ThumbnailFileID: 'T1', OriginalFileID: 'ORIGINAL' }),
      row({ FotoID: 'C1', EventoID: 'EV1', TipoFoto: 'capa', StatusProcessamento: 'Processada', PreviewFileID: 'PC' }),
    ],
    ItensPedido: [row({ PedidoID: 'PED_1', FotoID: 'F1', EventoID: 'EV1', PrecoUnitario: '10' }), row({ PedidoID: 'PED_2', FotoID: 'F1', EventoID: 'EV1', PrecoUnitario: '10' })],
    Pedidos: [row({ PedidoID: 'PED_1', Status: 'Pagamento Confirmado' }), row({ PedidoID: 'PED_2', Status: 'Pagamento Pendente' })],
    EnviosPascom: [
      row({ UploadID: 'UP1', NomePasta: 'crisma__2026-06-01__turma-da-tarde', Status: 'enviando', Arquivos: 30 }),
      row({ UploadID: 'UP1', NomePasta: 'crisma__2026-06-01__turma-da-tarde', Status: 'finalizado', Arquivos: 30, Quando: '2026-06-02T10:00:00Z' }),
      row({ UploadID: 'UP2', NomePasta: 'casamento__2026-05-20__joao-e-maria', Status: 'finalizado', Arquivos: 2 }),
    ],
  };
  shared.rows.mockImplementation(async (name) => tabelas[name] || []);
});

afterEach(() => {
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.UPLOAD_WEBAPP_URL;
  delete process.env.APPS_SCRIPT_HMAC_SECRET;
  delete process.env.MEDIA_TOKEN_SECRET;
});

it('exige sessao e membro ativo', async () => {
  global.__clerkUserId = null;
  expect((await request(app).get('/api/pascom/eventos')).status).toBe(401);
  global.__clerkUserId = 'user_123';
  tabelas.EquipePascom = [];
  expect((await request(app).get('/api/pascom/eventos')).status).toBe(403);
});

it('lista eventos com vendas confirmadas, fila de envios e sem expor hash nem arquivos do Drive', async () => {
  const response = await request(app).get('/api/pascom/eventos');
  expect(response.status).toBe(200);
  const [fila, evento] = response.body.eventos;
  expect(fila).toEqual(expect.objectContaining({ fila: true, etapa: 'fila', nomePasta: 'crisma__2026-06-01__turma-da-tarde', totalFotos: 30 }));
  expect(response.body.eventos).toHaveLength(2);
  expect(evento).toEqual(expect.objectContaining({
    eventoId: 'EV1', etapa: 'avenda', hasCode: true, hasCover: true, fotosProcessadas: 1, vendas: 1, receita: 10,
  }));
  expect(evento.coverThumbnail).toMatch(/^\/api\/eventos\/EV1\/previews\/C1\?variant=thumbnail&mt=/);
  const body = JSON.stringify(response.body);
  expect(body).not.toContain('HASH_SECRETO');
  expect(body).not.toContain('ORIGINAL');
  expect(response.headers['cache-control']).toContain('no-store');
});

it('detalha fotos processadas com capa primeiro e URLs assinadas de administracao', async () => {
  const response = await request(app).get('/api/pascom/eventos/EV1');
  expect(response.status).toBe(200);
  expect(response.body.fotos.map((foto) => foto.id)).toEqual(['C1', 'F1']);
  expect(response.body.fotos[1].previewUrl).toMatch(/\/previews\/F1\?mt=/);
  expect((await request(app).get('/api/pascom/eventos/NAO_EXISTE')).status).toBe(404);
});

it('repassa a acao ao Apps Script e devolve o codigo gerado uma unica vez', async () => {
  appsScriptResponde({ ok: true, data: { codigo: 'ABCD1234', versao: 3 } });
  const response = await request(app).post('/api/pascom/eventos/EV1/acoes').send({ acao: 'gerarCodigo' });
  expect(response.status).toBe(200);
  expect(response.body.codigo).toBe('ABCD1234');
  expect(response.body.evento.eventoId).toBe('EV1');
  const envelope = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(envelope.acao).toBe('gerarCodigo');
  expect(JSON.parse(envelope.payload)).toEqual({ eventoId: 'EV1', quem: 'pascom@paroquia.test' });
});

it('valida acoes e campos antes de chamar o Apps Script', async () => {
  const invalidas = [
    { acao: 'apagarTudo' },
    { acao: 'definirVisibilidade', visibilidade: 'secreta' },
    { acao: 'editar', campos: { CodigoHash: 'x' } },
    { acao: 'editar', campos: {} },
    { acao: 'editar', campos: { SlugPublico: 'Com Espaco' } },
  ];
  for (const body of invalidas) {
    // eslint-disable-next-line no-await-in-loop
    expect((await request(app).post('/api/pascom/eventos/EV1/acoes').send(body)).status).toBe(400);
  }
  expect(global.fetch).not.toHaveBeenCalled();
});

it('repassa regra de negocio do Apps Script como 409 com mensagem legivel', async () => {
  appsScriptResponde({ ok: false, codigo: 'regra_negocio', error: 'Evento com menores nao pode ser publico.' });
  const response = await request(app)
    .post('/api/pascom/eventos/EV1/acoes')
    .send({ acao: 'definirVisibilidade', visibilidade: 'publica' });
  expect(response.status).toBe(409);
  expect(response.body).toEqual({ error: 'Evento com menores nao pode ser publico.', codigo: 'regra_negocio' });
});

it('evento com espaco liberado nao lista previas removidas nem capa', async () => {
  tabelas.Eventos = [row({
    EventoID: 'EV1', NomePasta: 'casamento__2026-05-20__joao-e-maria', Titulo: 'Joao e Maria', Categoria: 'casamento',
    DataEvento: '2026-05-20', StatusProcessamento: 'Processado', Visibilidade: 'protegida', VendaAutorizada: 'NAO',
    Publicacao: 'arquivado', ProtecaoMenores: 'NAO', EspacoLiberacao: 'concluida', EspacoLiberadoBytes: '2600',
  })];
  tabelas.Fotos = tabelas.Fotos.map((foto) => row({
    FotoID: foto.get('FotoID'), EventoID: 'EV1', TipoFoto: foto.get('TipoFoto'), StatusProcessamento: 'Processada',
    PreviewFileID: foto.get('PreviewFileID'), ArquivosLiberados: 'SIM',
  }));
  const response = await request(app).get('/api/pascom/eventos/EV1');
  expect(response.body.fotos).toEqual([]);
  expect(response.body.evento).toEqual(expect.objectContaining({
    coverThumbnail: '', espacoLiberacao: 'concluida', espacoLiberadoBytes: 2600,
  }));
  expect(response.body.evento.acoes.publicar.motivo).toMatch(/removidos/);
  expect(response.body.evento.acoes.liberarEspaco.ok).toBe(false);
});

it('mostra falhas normalizadas, progresso e pedido de capa na fila', async () => {
  tabelas.Eventos = [row({
    EventoID: 'EV1', NomePasta: 'casamento__2026-05-20__joao-e-maria', Titulo: 'Joao e Maria', Categoria: 'casamento',
    DataEvento: '2026-05-20', StatusProcessamento: 'Erro', Visibilidade: 'protegida', VendaAutorizada: 'NAO',
    Publicacao: 'rascunho', ProtecaoMenores: 'NAO', TotalFotos: '3', FotosProcessadas: '2',
    Erros: JSON.stringify(['Foto (ruim.jpg): JPEG corrompido']),
  })];
  tabelas.PedidosProcessamento = [
    row({ EventoID: 'EV1', Tipo: 'trocarCapa', Status: 'concluido', Quando: '2026-06-01T10:00:00Z' }),
    row({ EventoID: 'EV1', Tipo: 'trocarCapa', Status: 'pendente', Quando: '2026-06-02T10:00:00Z', Alvo: 'F1' }),
  ];
  const { body } = await request(app).get('/api/pascom/eventos/EV1');
  expect(body.evento).toEqual(expect.objectContaining({
    falhas: ['Foto (ruim.jpg): JPEG corrompido'], progresso: 2, restantes: 1,
    pedidoPendente: { tipo: 'trocarCapa', desde: '2026-06-02T10:00:00Z', alvo: 'F1' },
  }));
  expect(body.evento.acoes.reprocessar.ok).toBe(false);
  expect(body.fotos.find((foto) => foto.id === 'F1').type).toBe('foto');

  tabelas.Eventos = [row({ EventoID: 'EV2', StatusProcessamento: 'Erro', Erros: 'Timeout na planilha' })];
  const texto = await request(app).get('/api/pascom/eventos/EV2');
  expect(texto.body.evento.falhas).toEqual(['Timeout na planilha']);
});

it('repassa trocar capa com a foto e valida o fotoId', async () => {
  appsScriptResponde({ ok: true, data: { pedidoId: 'PP_1', situacao: 'na_fila' } });
  const ok = await request(app).post('/api/pascom/eventos/EV1/acoes').send({ acao: 'trocarCapa', fotoId: 'F1' });
  expect(ok.status).toBe(200);
  const envelope = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(envelope.acao).toBe('trocarCapa');
  expect(JSON.parse(envelope.payload)).toEqual(expect.objectContaining({ eventoId: 'EV1', fotoId: 'F1', quem: 'pascom@paroquia.test' }));
  expect((await request(app).post('/api/pascom/eventos/EV1/acoes').send({ acao: 'trocarCapa', fotoId: '../x' })).status).toBe(400);

  appsScriptResponde({ ok: false, codigo: 'regra_negocio', error: 'Ja existe uma troca de capa na fila para este evento.' });
  const fila = await request(app).post('/api/pascom/eventos/EV1/acoes').send({ acao: 'reprocessar' });
  expect(fila.status).toBe(409);
});
