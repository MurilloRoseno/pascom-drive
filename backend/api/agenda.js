const { ocorrenciasDoMes, proximas } = require('../lib/agenda');
const { TIPOS } = require('../lib/agenda');
const { ErroNegocio } = require('../lib/erros');
const { hojeSP } = require('../lib/datas');

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * GET /api/agenda?mes=AAAA-MM — compromissos do mês (e dos dias vizinhos que a grade
 * mostra), já com a recorrência expandida. Sem `mes`, usa o mês de hoje.
 */
module.exports = async function handler(req, res, next) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // ?proximas=N — os próximos N compromissos a partir de hoje (bloco da página inicial)
    if (req.query.proximas !== undefined) {
      const n = Number(req.query.proximas);
      if (!/^\d+$/.test(String(req.query.proximas)) || n < 1 || n > 20) throw new ErroNegocio('Quantidade inválida.');
      res.setHeader('Cache-Control', 'public, max-age=60');
      return res.json({ hoje: hojeSP(), tipos: TIPOS, ocorrencias: await proximas(n) });
    }
    const mes = req.query.mes === undefined ? hojeSP().slice(0, 7) : req.query.mes;
    if (typeof mes !== 'string' || !MES.test(mes)) throw new ErroNegocio('Mês inválido.');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ mes, hoje: hojeSP(), tipos: TIPOS, ocorrencias: await ocorrenciasDoMes(mes) });
  } catch (err) {
    return next(err);
  }
};
