require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const { geral, pagamento, fotos, statusConsulta, watermark: watermarkLimit, acessoGaleria, download } = require('./middleware/rate-limit');
const errorHandler = require('./middleware/error-handler');

const healthHandler = require('./api/health.js');
const fotosHandler = require('./api/fotos');
const checkoutPreferenceHandler = require('./api/checkout-preference');
const checkoutQuoteHandler = require('./api/checkout-quote');
const statusPagamentoHandler = require('./api/status-pagamento');
const webhookHandler = require('./api/webhook/mercado-pago');
const watermarkHandler = require('./api/watermark');
const preprocessHandler = require('./api/preprocess');
const downloadHandler = require('./api/download');
const eventosHandler = require('./api/eventos');
const fotosEventoHandler = require('./api/fotos-evento');
const galeriaAcessoHandler = require('./api/galeria-acesso');
const previewEventoHandler = require('./api/preview-evento');

const app = express();
app.set('trust proxy', 1); // Vercel/nginx sit in front — trust X-Forwarded-For
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Security headers — prevent iframe embedding, MIME-sniffing, clickjacking
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-origin' } }));
app.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf.toString(); },
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gallery-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(geral);

app.get('/api/health', healthHandler);
app.get('/api/fotos', fotos, fotosHandler);
app.post('/api/checkout/preference', pagamento, checkoutPreferenceHandler);
app.post('/api/checkout/quote', pagamento, checkoutQuoteHandler);
app.post('/api/criar-pagamento', pagamento, checkoutPreferenceHandler);
app.get('/api/status-pagamento', statusConsulta, statusPagamentoHandler);
app.post('/api/webhook/mercado-pago', pagamento, webhookHandler);
app.post('/api/watermark', watermarkLimit, watermarkHandler);
app.post('/api/preprocess', watermarkLimit, preprocessHandler);
app.get('/api/download', download, downloadHandler);
app.get('/api/eventos', fotos, eventosHandler);
app.get('/api/eventos/:eventoId', fotos, eventosHandler);
app.get('/api/eventos/:eventoId/fotos', fotos, fotosEventoHandler);
app.get('/api/eventos/:eventoId/previews/:fotoId', fotos, previewEventoHandler);
app.post('/api/eventos/:eventoId/acesso', acessoGaleria, galeriaAcessoHandler);

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
