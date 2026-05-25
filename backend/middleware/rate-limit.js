const rateLimit = require('express-rate-limit');

const geral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});

const pagamento = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de tentativas de pagamento atingido. Aguarde 1 minuto.' },
});

const fotos = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições à galeria. Tente novamente em 1 minuto.' },
});

const statusConsulta = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas consultas de status. Aguarde 1 minuto.' },
});

const watermark = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de processamento de imagens atingido. Aguarde 1 minuto.' },
});

const acessoGaleria = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de acesso. Aguarde alguns minutos.' },
});

const download = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitos downloads. Aguarde um minuto.' },
});

module.exports = { geral, pagamento, fotos, statusConsulta, watermark, acessoGaleria, download };
