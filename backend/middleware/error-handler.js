function errorHandler(err, req, res, _next) {
  // Corpo JSON invalido: nao repassa a mensagem interna do parser.
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Requisição inválida.' });
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  const publicMessage = status >= 500 ? 'Erro interno do servidor' : message;
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.path} —`, message);
  }
  res.status(status).json({ error: publicMessage });
}

module.exports = errorHandler;
