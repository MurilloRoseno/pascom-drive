function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  const publicMessage = status >= 500 ? 'Erro interno do servidor' : message;
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.path} —`, message);
  }
  res.status(status).json({ error: publicMessage });
}

module.exports = errorHandler;
