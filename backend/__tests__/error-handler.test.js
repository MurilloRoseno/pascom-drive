const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/error-handler');

const app = express();
app.use(express.json());
app.post('/eco', (req, res) => res.json(req.body));
app.use(errorHandler);

it('responde 400 generico para corpo JSON invalido, sem expor o parser', async () => {
  const response = await request(app).post('/eco').set('Content-Type', 'application/json').send('nao-json');
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ error: 'Requisição inválida.' });
});
