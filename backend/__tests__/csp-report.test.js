const request = require('supertest');
const express = require('express');
const handler = require('../api/csp-report');

const app = express();
app.post('/api/csp-report', express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'], limit: '8kb' }), handler);
app.all('/api/csp-report', handler);

let aviso;
beforeEach(() => { aviso = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => aviso.mockRestore());

const registrado = () => aviso.mock.calls.map(([, linha]) => JSON.parse(linha));

describe('POST /api/csp-report', () => {
  it('formato antigo (report-uri): registra só os campos úteis e responde 204 sem corpo', async () => {
    const r = await request(app).post('/api/csp-report').set('Content-Type', 'application/csp-report').send(JSON.stringify({
      'csp-report': {
        'document-uri': 'https://site.org/agenda?token=segredo', 'blocked-uri': 'https://cdn.exemplo.com/x.js?chave=abc', 'effective-directive': 'script-src', 'source-file': 'https://site.org/a.js', cookie: 'nao-deve-sair',
      },
    }));
    expect(r.status).toBe(204);
    expect(r.text).toBe('');
    expect(registrado()).toEqual([{
      diretiva: 'script-src', bloqueado: 'https://cdn.exemplo.com/x.js', pagina: 'https://site.org/agenda', origem: 'https://site.org/a.js',
    }]);
    expect(JSON.stringify(aviso.mock.calls)).not.toMatch(/segredo|chave=abc|nao-deve-sair/);
  });

  it('formato novo (report-to): lista de relatórios, no máximo 5 por envio', async () => {
    const corpo = Array.from({ length: 8 }, (_, i) => ({ type: 'csp-violation', body: { effectiveDirective: 'img-src', blockedURL: `https://x.org/${i}.png`, documentURL: 'https://site.org/' } }));
    const r = await request(app).post('/api/csp-report').set('Content-Type', 'application/reports+json').send(JSON.stringify(corpo));
    expect(r.status).toBe(204);
    expect(registrado()).toHaveLength(5);
    expect(registrado()[0]).toMatchObject({ diretiva: 'img-src', bloqueado: 'https://x.org/0.png' });
  });

  it('limita o tamanho de cada campo e ignora lixo sem quebrar', async () => {
    await request(app).post('/api/csp-report').set('Content-Type', 'application/json').send({ 'csp-report': { 'blocked-uri': `https://x.org/${'a'.repeat(500)}` } });
    expect(registrado()[0].bloqueado.length).toBeLessThanOrEqual(200);
    aviso.mockClear();
    expect((await request(app).post('/api/csp-report').set('Content-Type', 'application/json').send('[1, "x", null]')).status).toBe(204);
    expect((await request(app).post('/api/csp-report').set('Content-Type', 'application/json').send('{}')).status).toBe(204);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('corpo grande demais é recusado antes de virar log', async () => {
    const r = await request(app).post('/api/csp-report').set('Content-Type', 'application/json').send(JSON.stringify({ 'csp-report': { 'blocked-uri': 'x'.repeat(20000) } }));
    expect(r.status).toBe(413);
    expect(aviso).not.toHaveBeenCalled();
  });

  it('só aceita POST', async () => {
    expect((await request(app).get('/api/csp-report')).status).toBe(405);
  });
});
