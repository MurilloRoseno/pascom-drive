require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const {
  geral, pagamento, cotacao, fotos, midiaGaleria, statusConsulta,
  recuperacaoPedido, processamento, acessoGaleria, download, webhook, administracao, pascom, assistente,
} = require('./middleware/rate-limit');
const { mediaAbuseGuard } = require('./middleware/media-abuse');
const { exigirModulo } = require('./middleware/modulo');
const { authenticatePascom, pascomClerkMiddleware } = require('./lib/pascom-auth');
const errorHandler = require('./middleware/error-handler');

const healthHandler = require('./api/health.js');
const checkoutPreferenceHandler = require('./api/checkout-preference');
const checkoutQuoteHandler = require('./api/checkout-quote');
const statusPagamentoHandler = require('./api/status-pagamento');
const webhookHandler = require('./api/webhook/mercado-pago');
const stripeWebhookHandler = require('./api/webhook/stripe');
const watermarkHandler = require('./api/watermark');
const preprocessHandler = require('./api/preprocess');
const coverPreviewHandler = require('./api/cover-preview');
const downloadHandler = require('./api/download');
const eventosHandler = require('./api/eventos');
const eventoSlugHandler = require('./api/evento-slug');
const fotosEventoHandler = require('./api/fotos-evento');
const ofertasEventoHandler = require('./api/ofertas-evento');
const galeriaAcessoHandler = require('./api/galeria-acesso');
const previewEventoHandler = require('./api/preview-evento');
const cacheInvalidateHandler = require('./api/cache-invalidate');
const pedidoRecuperarHandler = require('./api/pedido-recuperar');
const pascomMeHandler = require('./api/pascom-me');
const pascomDashboardHandler = require('./api/pascom-dashboard');
const pascomPedidosHandler = require('./api/pascom-pedidos');
const pascomPedidoDetalheHandler = require('./api/pascom-pedido-detalhe');
const pascomRegenerarDownloadsHandler = require('./api/pascom-regenerar-downloads');
const painelRouter = require('./api/painel');
const categoriasHandler = require('./api/categorias');
const agendaHandler = require('./api/agenda');
const faqHandler = require('./api/faq');
const assistenteHandler = require('./api/assistente');

const app = express();
app.set('trust proxy', 1); // Vercel/nginx sit in front — trust X-Forwarded-For
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://pascom-drive.vercel.app';
const allowedOrigins = new Set([FRONTEND_URL, PUBLIC_APP_URL].filter(Boolean));

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
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    return res.status(403).json({ error: 'Origem nao autorizada.' });
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Gallery-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(geral);

app.get('/api/health', healthHandler);
app.use('/api/pascom', pascom, pascomClerkMiddleware(), authenticatePascom);
app.use('/api/pascom', painelRouter); // painel: configurações, acessos… (cada rota confere a permissão do papel)
app.get('/api/pascom/me', pascomMeHandler);
app.get('/api/pascom/dashboard', pascomDashboardHandler);
app.get('/api/pascom/pedidos', pascomPedidosHandler);
app.get('/api/pascom/pedidos/:pedidoId', pascomPedidoDetalheHandler);
app.post('/api/pascom/pedidos/:pedidoId/regenerar-downloads', pascomRegenerarDownloadsHandler);
// Módulos que o painel pode tirar do ar (o servidor barra, não só o menu). Ficam SEMPRE no ar: status do
// pedido, recuperar pedido, download, webhooks, painel e login (há dinheiro em trânsito).
app.post('/api/checkout/preference', pagamento, exigirModulo('checkout'), checkoutPreferenceHandler);
app.post('/api/checkout/quote', cotacao, exigirModulo('checkout'), checkoutQuoteHandler);
app.post('/api/criar-pagamento', pagamento, exigirModulo('checkout'), checkoutPreferenceHandler);
app.post('/api/pedidos/recuperar', recuperacaoPedido, pedidoRecuperarHandler);
app.get('/api/status-pagamento', statusConsulta, statusPagamentoHandler);
app.post('/api/webhook/mercado-pago', webhook, webhookHandler);
app.post('/api/webhook/stripe', webhook, stripeWebhookHandler);
app.post('/api/watermark', processamento, watermarkHandler);
app.post('/api/preprocess', processamento, preprocessHandler);
app.post('/api/cover-preview', processamento, coverPreviewHandler);
app.get('/api/download', download, downloadHandler);
app.get('/api/categorias', fotos, exigirModulo('busca'), categoriasHandler);
app.get('/api/agenda', fotos, exigirModulo('agenda'), agendaHandler);
app.get('/api/faq', fotos, exigirModulo('ajuda'), faqHandler);
app.post('/api/assistente', assistente, exigirModulo('ajuda'), assistenteHandler);
app.get('/api/eventos', fotos, exigirModulo('busca'), eventosHandler);
app.get('/api/e/:slug', fotos, exigirModulo('busca'), eventoSlugHandler);
app.get('/api/eventos/:eventoId', fotos, exigirModulo('busca'), eventosHandler);
app.get('/api/eventos/:eventoId/ofertas', fotos, exigirModulo('busca'), ofertasEventoHandler);
app.get('/api/eventos/:eventoId/fotos', fotos, exigirModulo('busca'), fotosEventoHandler);
app.get('/api/eventos/:eventoId/previews/:fotoId', midiaGaleria, exigirModulo('busca'), mediaAbuseGuard, previewEventoHandler);
app.post('/api/eventos/:eventoId/acesso', acessoGaleria, exigirModulo('busca'), galeriaAcessoHandler);
app.post('/api/admin/cache/invalidate', administracao, cacheInvalidateHandler);

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
