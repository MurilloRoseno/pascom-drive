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

const cotacao = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas atualizacoes de valores. Aguarde alguns segundos.' },
});

const fotos = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições à galeria. Tente novamente em 1 minuto.' },
});

const midiaGaleria = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes de imagens. Tente novamente em 1 minuto.' },
});

const statusConsulta = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas consultas de status. Aguarde 1 minuto.' },
});

const recuperacaoPedido = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de recuperacao. Aguarde alguns minutos.' },
});

const processamento = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de processamento em lote atingido. Aguarde 1 minuto.' },
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

const webhook = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas notificacoes de pagamento. Aguarde 1 minuto.' },
});

const administracao = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas atualizacoes administrativas. Aguarde 1 minuto.' },
});

const pascom = rateLimit({
  windowMs: 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas consultas na area Pascom. Aguarde 1 minuto.' },
});

module.exports = {
  geral, pagamento, cotacao, fotos, midiaGaleria, statusConsulta,
  recuperacaoPedido, processamento, acessoGaleria, download, webhook, administracao, pascom,
};
