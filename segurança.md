# PLANO DE SEGURANÇA: Automação de Venda de Fotos - Paróquia São Rafael

**Data:** 2026-05-05  
**Versão:** 1.0  
**Status:** Planejamento (Implementação a seguir)

---

## 📋 Sumário Executivo

Este documento define a estratégia de segurança para o sistema end-to-end de venda de fotos da Paróquia São Rafael. O sistema processa dados sensíveis (fotos, números de WhatsApp, transações financeiras) através de múltiplas plataformas (Google Drive, Apps Script, Vercel, Mercado Pago, WhatsApp).

**Principais riscos identificados:**
1. ⚠️ **Credenciais em código** → Comprometimento total do sistema
2. ⚠️ **Webhooks sem assinatura** → Transações fraudulentas
3. ⚠️ **Dados sem criptografia** → Violação de LGPD
4. ⚠️ **Acesso não controlado ao Drive** → Dados expostos a fotógrafos
5. ⚠️ **Números de WhatsApp em logs** → Vazamento de PII

**Objetivo:** Implementar segurança em camadas (defense-in-depth) sem comprometer facilidade de uso.

---

## 1️⃣ GESTÃO DE CREDENCIAIS

### 1.1 Política: Nunca em Código

**Regra de Ouro:**
```
❌ PROIBIDO: const API_KEY = "sk-1234567890"
❌ PROIBIDO: process.env.API_KEY = "sk-1234567890" (hardcoded)
❌ PROIBIDO: Mercado Pago token em Google Sheets
✅ PERMITIDO: Variáveis de ambiente (.env.local, .env.production)
✅ PERMITIDO: AWS Secrets Manager / Google Secret Manager
```

### 1.2 Implementação por Ambiente

**Desenvolvimento (.env.local)**
```bash
# Criar na raiz do projeto
MERCADO_PAGO_ACCESS_TOKEN=TEST_xxxxxxxxxxxx
GOOGLE_DRIVE_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
EVOLUTION_API_URL=https://sua-instancia.evolution-api.com
EVOLUTION_API_TOKEN=seu-token-aqui
ENCRYPTION_KEY=sua-chave-aes-256-bits
WEBHOOK_SECRET=seu-secret-webhook-aleatorio
```

**Produção (Vercel Secrets)**
```bash
# Via Vercel CLI:
vercel env add MERCADO_PAGO_ACCESS_TOKEN
vercel env add GOOGLE_DRIVE_API_KEY
# Etc...

# Verificar via console Vercel:
# https://vercel.com/seu-projeto/settings/environment-variables
```

**Google Apps Script (Secrets API)**
```javascript
// Usar Google Cloud Secret Manager em vez de PropertiesService
async function getSecret(secretName) {
  const response = await UrlFetchApp.fetch(
    `https://secretmanager.googleapis.com/v1/projects/YOUR_PROJECT/secrets/${secretName}/versions/latest:access`,
    {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    }
  );
  const secret = JSON.parse(response.getContentText());
  return atob(secret.payload.data);
}

// Usar assim:
const MP_TOKEN = await getSecret('mercado-pago-access-token');
```

### 1.3 Auditoria

- [ ] Adicionar `.env.local` ao `.gitignore`
- [ ] Executar `npm audit` antes de deploy
- [ ] Configurar scanning de secrets no CI/CD (Dependabot)
- [ ] Revisar logs de acesso a credenciais mensalmente

---

## 2️⃣ AUTENTICAÇÃO & AUTORIZAÇÃO

### 2.1 Modelo de Acesso (RBAC)

```
┌──────────────────────────────────────────────────────────────┐
│ ROL                 │ ACESSO DRIVE          │ ACESSO BACKEND  │
├──────────────────────────────────────────────────────────────┤
│ FOTÓGRAFO           │ /Eventos/[seu-evento] │ Upload apenas   │
│                     │ (Editor)              │                 │
├──────────────────────────────────────────────────────────────┤
│ ADMIN PASCOM        │ /Sistema (tudo)       │ Todas as APIs   │
│                     │ /Eventos (visualizar) │ + Dashboard     │
├──────────────────────────────────────────────────────────────┤
│ CLIENTE             │ Nenhum (recebe link)  │ Apenas compra   │
│ (FIEL)              │                       │                 │
├──────────────────────────────────────────────────────────────┤
│ SISTEMA (Apps       │ /Sistema (Editor)     │ Backend         │
│ Script automation)  │ /Eventos (Leitor)     │ (Internal only) │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Implementação no Backend

**Arquivo:** `backend/lib/auth.js`

```javascript
// Middleware de autenticação
function authenticateRequest(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  try {
    const user = verifyJWT(token); // Implementar com jsonwebtoken
    req.user = user; // { id, email, role: 'FOTOGRAFO|ADMIN|CLIENT' }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware de autorização
function authorize(requiredRoles = []) {
  return (req, res, next) => {
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Uso em endpoints
app.post('/api/fotos', 
  authenticateRequest, 
  authorize(['FOTOGRAFO', 'ADMIN']), 
  uploadPhoto
);

app.get('/api/dashboard', 
  authenticateRequest, 
  authorize(['ADMIN']), 
  getDashboard
);
```

### 2.3 Google Drive Permissions (Apps Script)

```javascript
// Setup inicial - executar 1x
function inicializarPermissoes() {
  const raizFolder = Drive.Folders.create('ACERVO_PAROQUIA');
  
  // 1. Fotógrafos: cada um vê apenas seus eventos
  const fotografo1 = 'joao@paroquia.com';
  const pastaJoao = raizFolder.createFolder('2026-05-Batizado_João');
  
  // Remover herança de permissions
  Drive.Permissions.list(pastaJoao.getId()).forEach(p => {
    if (p.type === 'anyone' || p.type === 'domain') {
      Drive.Permissions.delete(pastaJoao.getId(), p.id);
    }
  });
  
  // Conceder acesso específico
  Drive.Permissions.insert(pastaJoao.getId(), {
    role: 'writer', // Editor
    type: 'user',
    emailAddress: fotografo1
  });
  
  // 2. Admin: vê tudo (Sistema, Processadas, etc)
  const adminFolder = raizFolder.createFolder('Sistema');
  Drive.Permissions.insert(adminFolder.getId(), {
    role: 'owner',
    type: 'user',
    emailAddress: 'admin@paroquia.com'
  });
  
  // 3. Clientes: compartilhamento via link temporal (não acesso direto)
  // Não recebem acesso ao Drive, apenas link privado
}

// Validar acesso antes de retornar link
function validarAcessoFoto(fotoId, userId) {
  const file = Drive.getFileById(fotoId);
  
  // Verificar se usuário tem permissão
  const permissions = Drive.Permissions.list(fotoId);
  const temAcesso = permissions.some(p => p.emailAddress === userId);
  
  if (!temAcesso && !isAdmin(userId)) {
    throw new Error('Unauthorized access');
  }
  
  return file.getUrl();
}
```

---

## 3️⃣ PROTEÇÃO DE DADOS EM TRÂNSITO

### 3.1 HTTPS Obrigatório

**Vercel (Automático)**
```
Padrão: ✅ HTTPS habilitado
Garantir: "Redirect HTTP to HTTPS" = ON
Teste: curl -I https://seu-dominio.com
```

**Google Apps Script (Automático)**
```
Padrão: ✅ HTTPS para todas as APIs
```

**Mercado Pago (Obrigatório)**
```
Verificar: curl -I https://api.mercadopago.com/v1/payments
Deve retornar: HTTP/2 200
```

### 3.2 CORS Seguro (Evitar Roubo de Credenciais)

**Arquivo:** `backend/vercel.json` ou `app.js`

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://seu-dominio.com"  // Específico, não "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        },
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        {
          "key": "Access-Control-Max-Age",
          "value": "86400"
        }
      ]
    }
  ]
}
```

**Testes:**
```bash
# Requisição legítima (seu domínio)
curl -H "Origin: https://seu-dominio.com" \
  -H "Access-Control-Request-Method: POST" \
  https://seu-dominio.vercel.app/api/fotos \
  -v  # Deve incluir CORS headers

# Requisição maliciosa (outro domínio)
curl -H "Origin: https://atacante.com" \
  https://seu-dominio.vercel.app/api/fotos \
  -v  # Não deve incluir CORS headers
```

---

## 4️⃣ WEBHOOKS SEGUROS (Mercado Pago)

### 4.1 Verificação de Assinatura (HMAC-SHA256)

**Fluxo:**
```
Mercado Pago POST → /webhook/mercado-pago
  + Headers: x-signature, x-request-id
  
Backend:
  1. Verifica assinatura HMAC
  2. Valida idempotência (request-id duplicado = ignorar)
  3. Processa pagamento
  4. Retorna 200 OK
```

**Implementação:**

```javascript
// backend/api/webhook/mercado-pago.js
const crypto = require('crypto');

export default async function handler(req, res) {
  // 1. Extrair assinatura
  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  
  if (!signature || !requestId) {
    return res.status(400).json({ error: 'Missing headers' });
  }
  
  // 2. Reconstruir string para verificação
  // Formato: "id={payment_id};request-id={request-id};ts={timestamp}"
  const parts = signature.split(',');
  const ts = parts[0].split('=')[1];
  const hash = parts[1].split('=')[1];
  
  const stringToSign = `id=${req.body.data.id};request-id=${requestId};ts=${ts}`;
  
  // 3. Calcular HMAC esperado
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('hex');
  
  // 4. Comparação segura (timing-safe)
  if (!crypto.timingSafeEqual(hash, expectedHash)) {
    console.error('Invalid webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // 5. Verificar idempotência
  const cached = await redis.get(`webhook:${requestId}`);
  if (cached) {
    console.log('Webhook já processado, ignorando');
    return res.status(200).json({ ok: true });
  }
  
  // 6. Processar pagamento
  const paymentId = req.body.data.id;
  try {
    // Consultar Mercado Pago para confirmar
    const payment = await mpClient.getPayment(paymentId);
    
    if (payment.status !== 'approved') {
      return res.status(200).json({ ok: true }); // Webhook válido, mas pagamento não aprovado
    }
    
    // Atualizar banco de dados
    await updatePaymentStatus(payment);
    
    // Disparar entrega
    await triggerPhotoDelivery(payment);
    
    // Cache para idempotência
    await redis.set(`webhook:${requestId}`, 'processed', 'EX', 86400);
    
    return res.status(200).json({ ok: true });
    
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Mercado Pago vai retentar
    return res.status(500).json({ error: err.message });
  }
}

// Teste local com curl
// curl -X POST http://localhost:3000/api/webhook/mercado-pago \
//   -H "Content-Type: application/json" \
//   -H "x-signature: ts=1234567890,hash=abcdef123456" \
//   -d '{"data":{"id":"123456"},"action":"payment.created"}'
```

### 4.2 Configuração no Mercado Pago

1. **Acessar:** Dashboard MP → Webhooks
2. **URL:** `https://seu-dominio.vercel.app/api/webhook/mercado-pago`
3. **Eventos:** `payment.created`, `payment.updated`
4. **Copiar secret:** Usar em `MERCADO_PAGO_WEBHOOK_SECRET`

---

## 5️⃣ PROTEÇÃO DE DADOS EM REPOUSO (Criptografia)

### 5.1 Dados Sensíveis a Criptografar

| Dado | Onde | Método |
|------|------|--------|
| Números de WhatsApp | Google Sheets | AES-256-GCM |
| Nomes de clientes | Google Sheets | AES-256-GCM |
| IDs de transação MP | Google Sheets | AES-256-GCM |
| Links de fotos | Google Sheets | Url obfuscação + TTL |

### 5.2 Implementação (Node.js)

```javascript
// backend/lib/encryption.js
const crypto = require('crypto');

class Encryption {
  constructor(key) {
    // key = 32 bytes (AES-256)
    this.key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY,
      'salt',
      32
    );
  }
  
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Retornar: iv + authTag + encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(ciphertext) {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = Encryption;

// Uso:
const encryption = new Encryption();

// Registrar dado sensível
const whatsappEncrypted = encryption.encrypt('11999999999');
await sheet.appendRow(['FOTO_001', whatsappEncrypted]); // Salvar criptografado

// Recuperar dado
const whatsappDescriptografado = encryption.decrypt(whatsappEncrypted);
await sendViaWhatsApp(whatsappDescriptografado);
```

### 5.3 Implementação em Google Sheets (Apps Script)

```javascript
// google-apps-script/Criptografia.gs
function criptografarDado(texto) {
  // Usar bibliotecas externas ou método simples
  // Para MVP: Use o endpoint backend que faz a criptografia
  
  const backendUrl = 'https://seu-dominio.vercel.app/api/encrypt';
  const response = UrlFetchApp.fetch(backendUrl, {
    method: 'post',
    payload: JSON.stringify({ text: texto }),
    headers: { 'Authorization': 'Bearer ' + getSecret('BACKEND_TOKEN') }
  });
  
  return JSON.parse(response.getContentText()).encrypted;
}

function descriptografarDado(criptografado) {
  const backendUrl = 'https://seu-dominio.vercel.app/api/decrypt';
  const response = UrlFetchApp.fetch(backendUrl, {
    method: 'post',
    payload: JSON.stringify({ encrypted: criptografado }),
    headers: { 'Authorization': 'Bearer ' + getSecret('BACKEND_TOKEN') }
  });
  
  return JSON.parse(response.getContentText()).text;
}

// Usar:
const whatsAppSeguro = criptografarDado('11999999999');
sheet.appendRow(['FOTO_001', whatsAppSeguro]);
```

---

## 6️⃣ RATE LIMITING & DDoS

### 6.1 Proteção no Backend

```javascript
// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// 1. Rate limit geral por IP
const limiterGeral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requisições por IP
  message: 'Muitas requisições, tente depois',
  statusCode: 429
});

// 2. Rate limit específico para API de pagamento
const limiterPagamento = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 5, // 5 tentativas de pagamento por minuto
  skip: (req) => {
    // Ignorar se request vem de Mercado Pago (webhook)
    return req.headers['x-mercado-pago-request-id'];
  }
});

// 3. Rate limit para login/webhook
const limiterWebhook = rateLimit({
  windowMs: 60 * 1000,
  max: 1000, // Webhook pode vir de múltiplos IPs
  skip: (req) => {
    // Verificar assinatura do webhook antes de limitar
    return verifyMercadoPagoSignature(req);
  }
});

app.use('/api/', limiterGeral);
app.post('/api/criar-pagamento', limiterPagamento, criarPagamento);
app.post('/webhook/mercado-pago', limiterWebhook, handleWebhook);
```

### 6.2 Proteção no Frontend

```html
<!-- index.html -->
<script>
  // Debounce no botão de pagamento (evita múltiplos cliques)
  let ultimaRequisicao = 0;
  
  document.getElementById('btn-pagar').addEventListener('click', async (e) => {
    const agora = Date.now();
    if (agora - ultimaRequisicao < 1000) {
      alert('Aguarde...');
      return;
    }
    ultimaRequisicao = agora;
    
    await criarPagamento();
  });
</script>
```

---

## 7️⃣ AUDITORIA & LOGGING

### 7.1 O Que Logar (Nunca Logar Dados Sensíveis)

**✅ LOGAR:**
```javascript
// O que fazer
auditLog('payment_approved', {
  paymentId: '123456',        // OK
  customerId: 'cust_001',     // OK (ID, não nome)
  timestamp: new Date(),
  amount: 20.99,              // OK
  status: 'approved'
});

auditLog('photo_accessed', {
  photoId: 'foto_001',
  accessedBy: 'admin@paroquia.com',
  action: 'download',
  timestamp: new Date()
});
```

**❌ NUNCA LOGAR:**
```javascript
// O que NUNCA fazer
console.log(`WhatsApp: ${customerPhone}`);  // ❌ PII exposto
console.log(`Payment token: ${mpToken}`);   // ❌ Credencial
console.log(`Full request: ${JSON.stringify(req.body)}`);  // ❌ Tudo
```

### 7.2 Implementação

**Arquivo:** `backend/lib/auditLog.js`

```javascript
const fs = require('fs');
const path = require('path');

async function auditLog(action, data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    data: sanitizeData(data),
    ip: getClientIP(),
    userId: getCurrentUser(),
    environment: process.env.NODE_ENV
  };
  
  // Logar localmente
  console.log(JSON.stringify(logEntry));
  
  // Enviar para serviço externo (Sentry, Datadog, etc)
  if (process.env.NODE_ENV === 'production') {
    await sendToLoggingService(logEntry);
  }
}

function sanitizeData(data) {
  // Remover ou ofuscar dados sensíveis
  const sensitive = ['phone', 'whatsapp', 'token', 'password', 'secret'];
  
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

module.exports = auditLog;

// Uso:
auditLog('user_login', { email: 'admin@paroquia.com' });
auditLog('payment_webhook', { paymentId: '123456', status: 'approved' });
```

### 7.3 Logs em Google Apps Script

```javascript
// google-apps-script/Auditoria.gs
function registrarAcao(acao, detalhes = {}) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Auditoria');
  
  const linha = [
    new Date().toISOString(),
    acao,
    Session.getActiveUser().getEmail(),
    JSON.stringify(sanitizarDados(detalhes))
  ];
  
  sheet.appendRow(linha);
  
  // Manter apenas últimos 90 dias
  limparLogsAntigos(sheet, 90);
}

function sanitizarDados(dados) {
  // Implementar sanitização similar
  return dados;
}

// Uso:
registrarAcao('foto_processada', { 
  fotoId: 'FOTO_001',
  evento: 'Missa Sábado'
});
```

---

## 8️⃣ VALIDAÇÃO DE INPUT

### 8.1 Frontend (Primeira Linha de Defesa)

```javascript
// frontend/validation.js
function validarFormularioCompra(dados) {
  const erros = [];
  
  // WhatsApp
  if (!dados.whatsapp.match(/^(\+55|55)?[1-9]\d{8,9}$/)) {
    erros.push('WhatsApp inválido (use formato: 11999999999)');
  }
  
  // Fotos selecionadas
  if (!Array.isArray(dados.fotoIds) || dados.fotoIds.length === 0) {
    erros.push('Selecione pelo menos uma foto');
  }
  
  // Total
  if (typeof dados.total !== 'number' || dados.total <= 0) {
    erros.push('Total deve ser maior que 0');
  }
  
  if (dados.total > 10000) {
    erros.push('Total não pode exceder R$ 10.000');
  }
  
  return erros;
}
```

### 8.2 Backend (Segunda Linha de Defesa - SEMPRE VALIDAR!)

```javascript
// backend/api/criar-pagamento.js
import { z } from 'zod';

// Definir schema
const schemaPagamento = z.object({
  whatsapp: z.string().regex(/^(\+55|55)?[1-9]\d{8,9}$/),
  fotoIds: z.array(z.string().startsWith('FOTO_')).min(1),
  totalComTaxa: z.number().gt(0).lte(10000)
});

export default async function handler(req, res) {
  try {
    // Validar entrada
    const dados = schemaPagamento.parse(req.body);
    
    // Processar...
    
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Validação falhou',
        details: err.errors 
      });
    }
    throw err;
  }
}
```

### 8.3 Google Apps Script (Processamento de Fotos)

```javascript
// google-apps-script/Validacao.gs
function validarNomeFoto(nome) {
  // Rejeitar caracteres suspeitos
  if (!/^[\w\-\. ]+$/.test(nome)) {
    throw new Error(`Nome de foto inválido: ${nome}`);
  }
  
  // Máximo 255 caracteres
  if (nome.length > 255) {
    throw new Error('Nome de foto muito longo');
  }
  
  return true;
}

function processarFotoComSeguranca(arquivo) {
  // Validar
  validarNomeFoto(arquivo.getName());
  validarFormatoImagem(arquivo);
  validarTamanhoDarquivo(arquivo); // Máx 50MB
  
  // Processar...
}
```

---

## 9️⃣ POLÍTICA DE RETENÇÃO DE DADOS (LGPD)

### 9.1 Cronograma de Exclusão

| Dado | Retenção | Ação |
|------|----------|------|
| Fotos entregues | 1 ano | Deletar após entrega + 1 ano |
| Metadados de transação | 2 anos | Manter para auditoria fiscal |
| Logs de acesso | 90 dias | Arquivar após 90 dias |
| Dados pessoais (nome, phone) | Até deleção solicitada | Excluir a pedido do cliente |

### 9.2 Implementação

```javascript
// backend/cron/deletarDadosAntigos.js (rodaar diariamente)
import schedule from 'node-schedule';

schedule.scheduleJob('0 2 * * *', async () => {
  console.log('Iniciando limpeza de dados antigos...');
  
  // 1. Deletar fotos entregues + 1 ano
  const umAnoAtras = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const fotosParaDeletar = await db.fotos.find({
    status: 'entregue',
    dataBaixada: { $lt: umAnoAtras }
  });
  
  for (const foto of fotosParaDeletar) {
    await drive.deleteFile(foto.driveId);
    await db.fotos.delete(foto.id);
    auditLog('photo_deleted', { photoId: foto.id });
  }
  
  // 2. Arquivar logs após 90 dias
  const treseMesesAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  // Implementar compressão e arquivamento...
  
  console.log('Limpeza concluída');
});
```

---

## 🔟 GESTÃO DE SECRETS

### 10.1 Local (.env.local - Nunca commitar!)

```bash
# .env.local (ADICIONAR A .gitignore)
MERCADO_PAGO_ACCESS_TOKEN=TEST_xxxxx
GOOGLE_DRIVE_API_KEY=AIza_xxxxx
EVOLUTION_API_TOKEN=xxx
ENCRYPTION_KEY=xxx (32 bytes)
WEBHOOK_SECRET=xxx
DATABASE_URL=xxx

# Gerada com: openssl rand -hex 32
```

### 10.2 Produção (Vercel)

```bash
# Via CLI:
vercel env add MERCADO_PAGO_ACCESS_TOKEN
# (Copiar token MP)
# (Confirmar)

# Verificar:
vercel env list
```

### 10.3 Google Cloud (Apps Script)

```bash
# 1. Criar secret no Google Cloud Console
# https://console.cloud.google.com/security/secret-manager

# 2. Usar em Apps Script via Secret Manager API
# (Ver implementação na seção 1.2)
```

---

## 1️⃣1️⃣ PLANO DE RESPOSTA A INCIDENTES

### 11.1 Checklist de Resposta

**SE Credencial Comprometida:**
- [ ] 1. Revogar imediatamente no console (Vercel, Google, MP)
- [ ] 2. Gerar nova credencial
- [ ] 3. Deploy com nova credencial
- [ ] 4. Auditar logs: quem acessou?
- [ ] 5. Notificar usuários se dados vazaram

**SE Webhook Fraudulento Detectado:**
- [ ] 1. Bloquear IP na firewall
- [ ] 2. Verificar transações suspeitas
- [ ] 3. Reverter pagamentos fraudulentos (Mercado Pago)
- [ ] 4. Notificar clientes

**SE Dados Vazados:**
- [ ] 1. Isolar o serviço afetado
- [ ] 2. Arquivar evidências (logs)
- [ ] 3. Notificar usuários em 72h (LGPD)
- [ ] 4. Investigar root cause
- [ ] 5. Implementar fix

### 11.2 Contatos de Resposta

```
👨‍💻 Tech Lead: [email]
🔐 Segurança: [email]
📋 Compliance: [email]
📞 Mercado Pago: [telefone/ticket]
```

---

## 1️⃣2️⃣ CHECKLIST PRÉ-DEPLOY

**SEMANA 1 (Critical)**
- [ ] Todos os secrets em variáveis de ambiente (.env.local, Vercel)
- [ ] HTTPS ativado (verificar certificado)
- [ ] Webhook com HMAC signature verification
- [ ] Rate limiting configurado
- [ ] Input validation em todos os endpoints
- [ ] CORS com origem específica

**SEMANA 2 (High)**
- [ ] RBAC implementado e testado
- [ ] Audit logging ativado
- [ ] Criptografia de dados sensíveis
- [ ] Política de retenção implementada
- [ ] DPA assinado com Google, MP, Evolution

**SEMANA 3 (Medium)**
- [ ] CSP headers configurados
- [ ] Dependency scanning (npm audit)
- [ ] Privacy policy publicada
- [ ] Incident response plan criado
- [ ] Monitoramento ativado (Sentry, Datadog)

**ANTES DO GO-LIVE**
- [ ] Teste de penetração (ou terceiros)
- [ ] Segurança awareness training
- [ ] Backup automático testado
- [ ] Disaster recovery plan
- [ ] SLA de disponibilidade acordado

---

## 1️⃣3️⃣ FERRAMENTAS RECOMENDADAS

| Ferramenta | Função | Custo | Link |
|-----------|--------|-------|------|
| **Vercel** | Hosting + Edge Secrets | Free tier | vercel.com |
| **npm audit** | Scanning de vulnerabilidades | Free | npm.org |
| **Sentry** | Error tracking + monitoring | Free tier | sentry.io |
| **OWASP ZAP** | Teste de segurança | Free | owasp.org |
| **SSL Labs** | Validar HTTPS | Free | ssllabs.com |
| **BurpSuite Community** | Teste de API | Free | portswigger.net |

---

## 1️⃣4️⃣ RECURSOS & TREINAMENTO

**Para a Equipe:**
- [ ] OWASP Top 10 - Leitura (30 min)
- [ ] Segurança em Apps Script (Google docs)
- [ ] LGPD Basics (Governo) - 1h
- [ ] Mercado Pago Security Guidelines - 30 min

**Documentação:**
- [ ] Criar SECURITY.md no repositório
- [ ] Documentar processo de secrets management
- [ ] Criar guia de deployment seguro
- [ ] Manter changelog de vulnerabilidades

---

## 📝 PRÓXIMOS PASSOS

### Fase 1: Implementação (Semanas 1-3)
1. [ ] Mover credenciais para .env.local
2. [ ] Implementar webhook HMAC
3. [ ] Adicionar rate limiting
4. [ ] Implementar RBAC no backend
5. [ ] Adicionar validação em todas as APIs

### Fase 2: Compliance (Semanas 4-5)
6. [ ] Criptografia de dados sensíveis
7. [ ] Auditoria e logging
8. [ ] Privacy policy + DPA
9. [ ] Política de retenção

### Fase 3: Deploy (Semana 6)
10. [ ] Teste de penetração
11. [ ] Setup de monitoramento
12. [ ] Go-live com suporte ativo
13. [ ] Monitoramento de incidentes 24/7

---

## 🎯 DEFINIÇÃO DE PRONTO (Definition of Done - Security)

Um feature é "pronto" para produção apenas se:

```
- [ ] Todas as credenciais em env vars (nunca em código)
- [ ] Input validation no backend (não confiar em frontend)
- [ ] Dados sensíveis criptografados em repouso
- [ ] HTTPS em todas as requisições
- [ ] Audit logs registrados
- [ ] Testes de segurança passando
- [ ] Code review de segurança realizado
- [ ] Documentação atualizada
```

---

**Documento mantido por:** [seu-email]  
**Última atualização:** 2026-05-05  
**Próxima revisão:** 2026-08-05 (trimestral)
