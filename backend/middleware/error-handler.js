function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.path} —`, message);
  }
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
