// index.js — Vercel entry point: delegates all /api/* routes to the Express app.
// This preserves CORS, rate-limiting, rawBody (for HMAC), and error-handler middleware.
const app = require('../server');
module.exports = app;
