jest.mock('../lib/google-sheets');

process.env.WATERMARK_API_SECRET = 'test-secret';

const request = require('supertest');
const express = require('express');
const handler = require('../api/eventos');
const sheets  = require('../lib/google-sheets');
const errorHandler = require('../middleware/error-handler');

const app = express();
app.use(express.json());
app.all('/api/eventos', handler);
app.use(errorHandler);

const mockEventos = [
  {
    eventoId:         'CASAMENTO_JOAO_20260514',
    nomePasta:        'Casamento_Joao',
    status:           'Concluido',
    totalFotos:       5,
    fotosProcessadas: 5,
    fotosEntregues:   5,
    dataCriacao:      '2026-05-14T10:30:00.000Z',
  },
  {
    eventoId:         'FORMATURA_MARIA_20260519',
    nomePasta:        'Formatura_Maria',
    status:           'Processando',
    totalFotos:       12,
    fotosProcessadas: 7,
    fotosEntregues:   0,
    dataCriacao:      '2026-05-19T08:00:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  sheets.listarEventos.mockResolvedValue(mockEventos);
});

describe('GET /api/eventos', () => {
  it('returns 200 with eventos array', async () => {
    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(200);
    expect(res.body.eventos).toHaveLength(2);
    expect(res.body.eventos[0].eventoId).toBe('CASAMENTO_JOAO_20260514');
  });

  it('returns eventoId, nomePasta, status, totalFotos fields', async () => {
    const res = await request(app).get('/api/eventos');
    const ev = res.body.eventos[0];
    expect(ev).toHaveProperty('eventoId');
    expect(ev).toHaveProperty('nomePasta');
    expect(ev).toHaveProperty('status');
    expect(ev).toHaveProperty('totalFotos');
  });

  it('returns empty array when no eventos', async () => {
    sheets.listarEventos.mockResolvedValue([]);
    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(200);
    expect(res.body.eventos).toHaveLength(0);
  });

  it('returns 405 for POST', async () => {
    const res = await request(app).post('/api/eventos').send({});
    expect(res.status).toBe(405);
  });

  it('propagates errors to error handler', async () => {
    sheets.listarEventos.mockRejectedValue(new Error('Sheets down'));
    const res = await request(app).get('/api/eventos');
    expect(res.status).toBe(500);
  });
});
