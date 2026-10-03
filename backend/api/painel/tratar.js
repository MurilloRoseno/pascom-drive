const { z } = require('zod');
const { ErroNegocio } = require('../../lib/erros');

/** Só ErroNegocio e erro de validação têm a mensagem devolvida; o resto vira 500 genérico. */
function tratar(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof ErroNegocio) return res.status(err.status).json({ error: err.message });
      if (err instanceof z.ZodError) return res.status(400).json({ error: 'Dados inválidos' });
      console.error('[pascom]', req.method, req.path, err.message);
      return res.status(500).json({ error: 'Erro interno. Tente de novo em instantes.' });
    }
  };
}

module.exports = { tratar };
