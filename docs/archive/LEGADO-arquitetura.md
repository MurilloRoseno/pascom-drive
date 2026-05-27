# Plano: Sistema Web de Venda de Fotos - ParÃ³quia SÃ£o Rafael
**Design System Integrado**

---

## Contexto

A ParÃ³quia SÃ£o Rafael precisa de um **sistema web end-to-end** para comercializar fotos de eventos religiosos (missas, batizados, casamentos, etc.) de forma profissional, automÃ¡tica e com custo zero/mÃ­nimo. O projeto define trÃªs documentos-base:

1. **projeto.md** â€” Arquitetura tÃ©cnica (5 etapas: entrada, processamento, vitrine, pagamento, entrega)
2. **seguranÃ§a.md** â€” EstratÃ©gia de seguranÃ§a (credentials, RBAC, webhooks, criptografia, LGPD)
3. **tdd.md** â€” EstratÃ©gia de testes (Jest, Playwright, E2E, stress tests)

**AlÃ©m disso:** A ParÃ³quia jÃ¡ possui um **Design System maduro** com:
- Paleta: roxo litÃºrgico (#6D2077), amarelo dorado (#F7C848), paper cÃ¡lido (#FAF6EF)
- Tipografia: Playfair Display (headings), Nunito (UI), JetBrains Mono (labels)
- Componentes React prÃ©-built (Header, Hero, Cards, Admin Sidebar)
- 30 Ã­cones Lucide + ornamentos SVG customizados
- DocumentaÃ§Ã£o completa (README + 22 previews HTML)

**Objetivo:** Desenhar um plano de **implementaÃ§Ã£o do sistema web** que aplique integralmente o design system existente, garantindo:
- âœ… CoesÃ£o visual com a marca paroquial
- âœ… ReutilizaÃ§Ã£o mÃ¡xima de componentes
- âœ… SeguranÃ§a, RBAC, compliance LGPD
- âœ… Testes robustos (TDD first)
- âœ… Responsividade mobile-first
- âœ… Performance otimizada

---

## Arquitetura Global

```
PARÃ“QUIA FOTOS - VENDA
â”œâ”€â”€ ðŸŽ¨ DESIGN SYSTEM (Existing - Reuse)
â”‚   â”œâ”€â”€ colors_and_type.css (tokens)
â”‚   â”œâ”€â”€ ui_kits/website/ (Header, Hero, CourseCard â†’ adapt para Fotos)
â”‚   â”œâ”€â”€ ui_kits/admin/ (Sidebar, Topbar, StatCard, Table)
â”‚   â”œâ”€â”€ ui_kits/_shared/ (design tokens locais, design tokens locais)
â”‚   â””â”€â”€ assets/ (logos, ornaments SVG)
â”‚
â”œâ”€â”€ ðŸ“¸ FRONTEND (Cliente - Galeria de Fotos)
â”‚   â”œâ”€â”€ vitrine/ (galeria pÃºblica)
â”‚   â”‚   â”œâ”€â”€ GaleriaFotos.jsx (hero + grid responsivo)
â”‚   â”‚   â”œâ”€â”€ FotoCard.jsx (imagem, preÃ§o, seleÃ§Ã£o checkbox)
â”‚   â”‚   â”œâ”€â”€ FiltroEvento.jsx (dropdown eventos)
â”‚   â”‚   â”œâ”€â”€ Resumo.jsx (carrinho, subtotal, taxa)
â”‚   â”‚   â””â”€â”€ FluxoCompra.jsx (multi-step: fotos â†’ whatsapp â†’ resumo â†’ pagamento)
â”‚   â”‚
â”‚   â”œâ”€â”€ pagamento/
â”‚   â”‚   â”œâ”€â”€ QRCodePix.jsx (exibiÃ§Ã£o QR code)
â”‚   â”‚   â”œâ”€â”€ StatusPagamento.jsx (polling 2s)
â”‚   â”‚   â””â”€â”€ ConfirmacaoPagamento.jsx (modal sucesso)
â”‚   â”‚
â”‚   â”œâ”€â”€ layout/
â”‚   â”‚   â”œâ”€â”€ Header.jsx (reutilizar do DS)
â”‚   â”‚   â”œâ”€â”€ Footer.jsx (reutilizar do DS)
â”‚   â”‚   â””â”€â”€ main.css (Playfair + Nunito, colores do DS)
â”‚   â”‚
â”‚   â””â”€â”€ hooks/
â”‚       â”œâ”€â”€ useEventos.js (fetch API)
â”‚       â”œâ”€â”€ useCarrinho.js (localStorage)
â”‚       â”œâ”€â”€ usePagamento.js (criar pagamento, polling)
â”‚       â””â”€â”€ useValidacao.js (WhatsApp, emails)
â”‚
â”œâ”€â”€ ðŸ” BACKEND (Node.js Vercel Functions)
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ fotos.js (GET - lista fotos com amostras)
â”‚   â”‚   â”œâ”€â”€ criar-pagamento.js (POST - call MP API)
â”‚   â”‚   â”œâ”€â”€ status-pagamento.js (GET - polling)
â”‚   â”‚   â””â”€â”€ webhook/
â”‚   â”‚       â””â”€â”€ mercado-pago.js (POST - validar assinatura, atualizar status)
â”‚   â”‚
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ mercado-pago.js (client MP, criar Pix, verificar pagamento)
â”‚   â”‚   â”œâ”€â”€ google-sheets.js (registrar pedido, buscar status, atualizar)
â”‚   â”‚   â”œâ”€â”€ google-drive.js (compartilhar links, buscar fotos originais)
â”‚   â”‚   â”œâ”€â”€ whatsapp-api.js (Evolution ou Link de Mensagem)
â”‚   â”‚   â”œâ”€â”€ encryption.js (AES-256-GCM para phone, nomes)
â”‚   â”‚   â”œâ”€â”€ auth.js (JWT, RBAC roles)
â”‚   â”‚   â”œâ”€â”€ auditLog.js (logging seguro, sem PII)
â”‚   â”‚   â””â”€â”€ validation.js (Zod schemas, WhatsApp, email)
â”‚   â”‚
â”‚   â””â”€â”€ middleware/
â”‚       â”œâ”€â”€ rateLimiter.js (15 min 100 req, pagamento 5/min)
â”‚       â”œâ”€â”€ errorHandler.js (centralizado)
â”‚       â””â”€â”€ cors.js (apenas domÃ­nio paroquial)
â”‚
â”œâ”€â”€ âš™ï¸ GOOGLE APPS SCRIPT (AutomaÃ§Ã£o)
â”‚   â”œâ”€â”€ Code.gs (trigger timers, orquestraÃ§Ã£o)
â”‚   â”œâ”€â”€ Marca.gs (aplicar marca d'Ã¡gua com ImageMagick)
â”‚   â”œâ”€â”€ Drive.gs (monitorar uploads, compartilhar links)
â”‚   â”œâ”€â”€ Sheet.gs (registrar fotos, buscar pedidos, atualizar status)
â”‚   â”œâ”€â”€ WhatsApp.gs (enviar via Evolution API)
â”‚   â”œâ”€â”€ Validacao.gs (validar imagens)
â”‚   â”œâ”€â”€ Auditoria.gs (logging de aÃ§Ãµes)
â”‚   â””â”€â”€ appsscript.json (manifest permissÃµes)
â”‚
â”œâ”€â”€ ðŸ§ª TESTES (Jest + Playwright + Supertest)
â”‚   â”œâ”€â”€ __tests__/unit/
â”‚   â”‚   â”œâ”€â”€ marca.test.js (Apps Script)
â”‚   â”‚   â”œâ”€â”€ drive.test.js (Apps Script)
â”‚   â”‚   â”œâ”€â”€ sheet.test.js (Apps Script)
â”‚   â”‚   â”œâ”€â”€ calculos.test.js (cÃ¡lculo de preÃ§o)
â”‚   â”‚   â”œâ”€â”€ validacao.test.js (WhatsApp, email)
â”‚   â”‚   â””â”€â”€ mercado-pago.test.js (client MP)
â”‚   â”‚
â”‚   â”œâ”€â”€ __tests__/integration/
â”‚   â”‚   â”œâ”€â”€ api-pagamento.test.js (POST /criar-pagamento)
â”‚   â”‚   â”œâ”€â”€ webhook-seguranca.test.js (validar assinatura)
â”‚   â”‚   â”œâ”€â”€ galeria.test.js (componentes React)
â”‚   â”‚   â””â”€â”€ fluxo-compra.test.js (multi-step)
â”‚   â”‚
â”‚   â”œâ”€â”€ __tests__/e2e/
â”‚   â”‚   â”œâ”€â”€ compra-completa.spec.js (Playwright â€” upload â†’ entrega)
â”‚   â”‚   â”œâ”€â”€ pagamento-sucesso.spec.js (Pix realizado)
â”‚   â”‚   â””â”€â”€ responsividade.spec.js (mobile, tablet, desktop)
â”‚   â”‚
â”‚   â””â”€â”€ __tests__/stress/
â”‚       â””â”€â”€ carga.test.js (50 users, 10 pagamentos/min)
â”‚
â”œâ”€â”€ ðŸ“‹ DOCUMENTAÃ‡ÃƒO
â”‚   â”œâ”€â”€ SETUP.md (instalaÃ§Ã£o, env vars)
â”‚   â”œâ”€â”€ FLUXO.md (arquitetura, endpoints, webhooks)
â”‚   â”œâ”€â”€ SEGURANCA.md (referÃªncia de seguranÃ§a.md)
â”‚   â”œâ”€â”€ TROUBLESHOOTING.md (debug, logs)
â”‚   â””â”€â”€ DESIGN_SYSTEM.md (guia de uso do DS paroquial)
â”‚
â”œâ”€â”€ ðŸ”§ CONFIG
â”‚   â”œâ”€â”€ .env.local (dev: test tokens MP, Google API keys)
â”‚   â”œâ”€â”€ .env.production (Vercel secrets)
â”‚   â”œâ”€â”€ vercel.json (funÃ§Ãµes serverless, CORS headers)
â”‚   â”œâ”€â”€ jest.config.js (mocks globais Google Apps)
â”‚   â”œâ”€â”€ playwright.config.js (headless, timeout 30s)
â”‚   â””â”€â”€ package.json (dependÃªncias)
â”‚
â””â”€â”€ ðŸ“ ESTRUTURA PASTAS
    paroquia-fotos-venda/
    â”œâ”€â”€ frontend/ (Next.js ou Vite + React)
    â”œâ”€â”€ backend/ (api/ functions Vercel)
    â”œâ”€â”€ google-apps-script/
    â”œâ”€â”€ __tests__/
    â”œâ”€â”€ docs/
    â”œâ”€â”€ public/ (logos, ornaments do DS)
    â””â”€â”€ node_modules/ (gitignored)
```

---

## 1. FRONTEND - AplicaÃ§Ã£o de Galeria (React/Vite)

### 1.1 Stack TÃ©cnico

- **Framework:** React 18+ (Vite para dev rÃ¡pido)
- **Styling:** Tailwind CSS + `colors_and_type.css` do Design System
- **Componentes:** Reutilizar `Header`, `Footer`, `CourseCard` (adaptar para `FotoCard`) do DS
- **State Management:** React Context (carrinho) + hooks custom
- **FormulÃ¡rios:** React Hook Form + Zod (validaÃ§Ã£o)
- **HTTP:** axios ou fetch com interceptor de erro
- **Ãcones:** lucide-react (jÃ¡ no DS)
- **Build:** Vite, optimizado para Vercel

### 1.2 Estrutura de PÃ¡ginas

#### **PÃ¡gina 1: Galeria PÃºblica** (`/`)
```jsx
// pages/index.jsx
<Header /> (do DS)
<HeroGaleria 
  titulo="Compre suas Fotos - ParÃ³quia SÃ£o Rafael"
  subtitulo="Missas, Batizados, Casamentos... Qualidade profissional"
  background={churchPhoto}
/>
<Container>
  <FiltroEvento eventos={['Missa', 'Batizado', 'Casamento']} />
  <GaleriaGrid fotos={fotos} onSelectFoto={handleSelect} />
  <Resumo 
    fotosSelecionadas={carrinho}
    onProximo={() => navigate('/compra')}
  />
</Container>
<Footer /> (do DS)
```

**Componentes novos:**
- `HeroGaleria.jsx` â€” Hero com background foto, overlay gradient (roxo 75%)
- `FotoCard.jsx` â€” Card branco, imagem amostra (com tarja), preÃ§o R$10, checkbox, hover shadow-lg
- `FiltroEvento.jsx` â€” Select dropdown com eventos, filtro client-side
- `GaleriaGrid.jsx` â€” CSS Grid responsive (4 colunas desktop, 2 tablet, 1 mobile)
- `Resumo.jsx` â€” Card fixo inferior: "2 fotos selecionadas | Subtotal R$20 | Taxa R$0,99 | Total R$20,99"
- `Spinner.jsx` â€” Loading state com logo animada

**Cores aplicadas:**
- BG: `--parish-paper` (#FAF6EF)
- BotÃ£o "PrÃ³ximo": `--parish-yellow` (#F7C848), hover `--parish-yellow-dark`
- Texto: `--parish-ink` (#18150F)
- Card border: `--parish-purple-light` (rgba(109,32,119,0.08))

#### **PÃ¡gina 2: Fluxo de Compra** (`/compra`)
```jsx
// pages/compra/index.jsx
<Header />
<Container>
  <Step1 visible={step === 1} onProximo={goToStep2} />
  {/* Galeria novamente com carrinho prÃ©-preenchido */}
  
  <Step2 visible={step === 2} onProximo={goToStep3} onVoltar={goToStep1} />
  {/* Input WhatsApp mascarado: 11 9 9999-9999 */}
  {/* BotÃ£o "PrÃ³ximo" desabilitado atÃ© validaÃ§Ã£o */}
  
  <Step3 visible={step === 3} onProximo={goToStep4} onVoltar={goToStep2} />
  {/* Resumo: fotos selecionadas, WhatsApp, subtotal, taxa, total */}
  {/* Checkbox "Confirmo as fotos e informaÃ§Ãµes" */}
  
  <Step4 visible={step === 4} onVoltar={goToStep3} />
  {/* QR Code Pix, polling 2s status, "Aguardando..." â†’ "âœ“ Pagamento Confirmado!" */}
</Container>
<Footer />
```

**Componentes novos:**
- `Step1.jsx` â€” Reutiliza `GaleriaGrid`
- `Step2.jsx` â€” Input WhatsApp com mÃ¡scara (react-input-mask)
- `Step3.jsx` â€” Summary card, status badges (verde "Confirmado" ou amarelo "Pendente")
- `Step4.jsx` â€” QR Code (QR.js), status polling, modal de sucesso

#### **PÃ¡gina 3: Admin Dashboard** (`/admin`)
Reutiliza componentes `AdminSidebar`, `AdminTopbar`, `StatCard`, `InscricoesTable` do DS (adaptar para Pedidos).

```jsx
// pages/admin/index.jsx
<AdminLayout>
  <AdminTopbar breadcrumbs={['Admin', 'Dashboard']} />
  
  <StatsRow>
    <StatCard 
      icon={<DollarSign />}
      label="Receita MÃªs"
      value="R$ 1.240,50"
      delta="+15.3%"
    />
    <StatCard icon={<ImageIcon />} label="Fotos Vendidas" value="152" delta="+24" />
    <StatCard icon={<Users />} label="Clientes" value="87" delta="+8" />
    <StatCard icon={<Clock />} label="Pendentes" value="5" delta="âš ï¸" />
  </StatsRow>
  
  <PedidosTable pedidos={pedidos} />
  {/* Colunas: ID | Cliente WhatsApp | Fotos | Total | Status | Data | AÃ§Ãµes */}
  {/* Status pills: verde (Entregue), amarelo (Pendente), roxo (Fila), vermelho (Erro) */}
</AdminLayout>
```

**Componentes novos:**
- `AdminLayout.jsx` â€” Sidebar + Topbar + main content area
- `PedidosTable.jsx` â€” Tabela com paginaÃ§Ã£o, filtros, bulk actions
- `PedidoRow.jsx` â€” Linha com expandir detalhes
- `AcaoBotoes.jsx` â€” Download fotos, reenviar WhatsApp, ver logs

### 1.3 Hooks Custom

```javascript
// hooks/useEventos.js
- fetch `/api/eventos`
- retorna { fotos, loading, error }
- cache com localStorage

// hooks/useCarrinho.js
- gerencia carrinho em localStorage
- { adicionar, remover, calcularSubtotal, calcularTotal }

// hooks/usePagamento.js
- POST `/api/checkout/preference`
- GET `/api/status-pagamento` (polling 2s)
- states: "criando", "aguardando", "confirmado", "erro"

// hooks/useValidacao.js
- validarWhatsApp (regex: ^(\+55|55)?[1-9]\d{8,9}$)
- validarEmail, sanitizar inputs
```

### 1.4 Responsividade (Mobile-First)

**Breakpoints implÃ­citos (Tailwind defaults):**
- `sm` 640px
- `md` 768px
- `lg` 1024px
- `xl` 1280px

**Grid da Galeria:**
- Mobile: 1 coluna, 100% width
- Tablet (md): 2 colunas, 50% width
- Desktop (lg): 4 colunas, 25% width

**Hero:**
- `clamp(2.5rem, 8vw, 4rem)` para tÃ­tulo (Playfair Display 700)

**Inputs:**
- MÃ­nimo 44px height (iOS HIG)
- Focus ring 3px roxo
- Placeholder 40% opacity ink

---

## 2. BACKEND - APIs Vercel Functions (Node.js)

### 2.1 Endpoints PÃºblicos

#### **GET /api/eventos**
```javascript
// Retorna lista de fotos pÃºblicas com amostras
Resposta:
{
  "fotos": [
    {
      "id": "FOTO_001",
      "evento": "Missa SÃ¡bado",
      "linkAmostra": "https://drive.google.com/...", // com tarja
      "preco": 10.00,
      "timestamp": "2026-05-05T10:30:00Z"
    },
    ...
  ],
  "total": 152,
  "ultimaAtualizacao": "2026-05-05T10:35:00Z"
}
```

#### **POST /api/checkout/preference**
```javascript
// Criar pedido + gerar QR Code Pix
Entrada:
{
  "whatsapp": "11999999999",
  "fotoIds": ["FOTO_001", "FOTO_002"],
  "totalComTaxa": 20.99
}

LÃ³gica:
1. Validar campos (Zod)
2. Validar WhatsApp regex
3. Verificar limite mÃ¡ximo (R$10.000)
4. Chamar MP API â†’ criar Pix DinÃ¢mico
5. Registrar pedido em Google Sheet (status: "Pendente")
6. Retornar QR Code + transactionId

Resposta:
{
  "transactionId": 123456789,
  "qrCode": "iVBORw0KGgo...", // base64 PNG
  "expiresIn": 1800 // segundos (30 min)
}
```

#### **GET /api/status-pagamento?transacao_id=123456**
```javascript
// Polling para verificar status do pagamento
Resposta:
{
  "status": "pending" | "approved" | "expired" | "rejected",
  "transactionId": 123456789,
  "updatedAt": "2026-05-05T10:45:00Z"
}
```

### 2.2 Webhook (Requer AutenticaÃ§Ã£o)

#### **POST /webhook/mercado-pago**
```javascript
// Mercado Pago envia confirmaÃ§Ã£o de pagamento
Headers:
  x-signature: "ts=1234567890,hash=abcdef..."
  x-request-id: "req-uuid-123"

Body:
{
  "id": 123456789,
  "action": "payment.created" | "payment.updated",
  "data": { "id": 123456789 }
}

LÃ³gica:
1. Extrair hash do header x-signature
2. Validar HMAC-SHA256 com `MERCADO_PAGO_WEBHOOK_SECRET`
3. Verificar idempotÃªncia (x-request-id em Redis)
4. Buscar pedido no Google Sheet
5. Atualizar status â†’ "Pago"
6. Disparar Google Apps Script: enviar WhatsApp
7. Registrar auditoria
8. Retornar 200 OK

Retorno:
{ "ok": true }
```

### 2.3 Estrutura Backend

**Arquivo: `backend/api/eventos.js`**
```javascript
import { buscarFotos } from '../lib/google-sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fotos = await buscarFotos();
    res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
    return res.status(200).json(fotos);
  } catch (err) {
    auditLog('fotos_error', { error: err.message });
    return res.status(500).json({ error: 'Erro ao buscar fotos' });
  }
}
```

**Arquivo: `backend/api/checkout/preference.js`**
```javascript
import { z } from 'zod';
import { criarPagamentoPix } from '../lib/mercado-pago.js';
import { registrarPedido } from '../lib/google-sheets.js';
import { validarWhatsApp } from '../lib/validation.js';
import rateLimit from '../middleware/rateLimiter.js';

const schema = z.object({
  whatsapp: z.string().refine(validarWhatsApp, 'WhatsApp invÃ¡lido'),
  fotoIds: z.array(z.string().startsWith('FOTO_')).min(1),
  totalComTaxa: z.number().gt(0).lte(10000)
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const allowed = rateLimit(req.ip, 'pagamento', 5, 60 * 1000); // 5 req/min
  if (!allowed) {
    return res.status(429).json({ error: 'Muitas requisiÃ§Ãµes' });
  }

  try {
    // ValidaÃ§Ã£o
    const dados = schema.parse(req.body);

    // Criar pagamento Pix
    const pagamento = await criarPagamentoPix({
      amount: dados.totalComTaxa,
      description: `Fotos - ParÃ³quia SÃ£o Rafael`
    });

    // Registrar em Google Sheet
    const pedido = await registrarPedido({
      transactionId: pagamento.id,
      whatsapp: dados.whatsapp,
      fotoIds: dados.fotoIds,
      status: 'Pendente'
    });

    auditLog('pagamento_criado', { 
      transactionId: pagamento.id,
      customerId: 'cust_masked'
    });

    return res.status(200).json({
      transactionId: pagamento.id,
      qrCode: pagamento.point_of_interaction.transaction_data.qr_code,
      expiresIn: 1800
    });

  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'ValidaÃ§Ã£o falhou',
        details: err.errors 
      });
    }
    auditLog('pagamento_erro', { error: err.message });
    return res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
}
```

**Arquivo: `backend/api/webhook/mercado-pago.js`**
```javascript
import crypto from 'crypto';
import redis from '../lib/redis.js'; // ou similar
import { verificarPagamento } from '../lib/mercado-pago.js';
import { atualizarPedido } from '../lib/google-sheets.js';
import { enviarWhatsApp } from '../lib/whatsapp-api.js';
import auditLog from '../lib/auditLog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Validar assinatura HMAC
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];

    if (!signature || !requestId) {
      return res.status(400).json({ error: 'Headers faltando' });
    }

    const parts = signature.split(',');
    const ts = parts[0].split('=')[1];
    const hash = parts[1].split('=')[1];

    const stringToSign = `id=${req.body.data.id};request-id=${requestId};ts=${ts}`;
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))) {
      auditLog('webhook_assinatura_invalida', { ip: req.ip });
      return res.status(401).json({ error: 'Assinatura invÃ¡lida' });
    }

    // 2. Verificar idempotÃªncia
    const cached = await redis.get(`webhook:${requestId}`);
    if (cached) {
      return res.status(200).json({ ok: true });
    }

    // 3. Buscar e validar pagamento
    const paymentId = req.body.data.id;
    const payment = await verificarPagamento(paymentId);

    if (payment.status !== 'approved') {
      await redis.set(`webhook:${requestId}`, 'processed', 'EX', 86400);
      return res.status(200).json({ ok: true });
    }

    // 4. Atualizar Sheet
    const pedido = await atualizarPedido(paymentId, { status: 'Pago' });

    // 5. Disparar WhatsApp
    // (Google Apps Script farÃ¡ via trigger agendado)

    // 6. Cache para idempotÃªncia
    await redis.set(`webhook:${requestId}`, 'processed', 'EX', 86400);

    auditLog('webhook_processado', { 
      paymentId,
      customerId: 'cust_masked'
    });

    return res.status(200).json({ ok: true });

  } catch (err) {
    auditLog('webhook_erro', { error: err.message });
    // Mercado Pago vai retentar
    return res.status(500).json({ error: err.message });
  }
}
```

### 2.4 Libs CrÃ­ticas

**`backend/lib/mercado-pago.js`**
```javascript
import axios from 'axios';

export class MercadoPagoClient {
  constructor(accessToken, isSandbox = false) {
    this.accessToken = accessToken;
    this.baseURL = isSandbox 
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  async criarPagamentoPix(payload) {
    const response = await this.client.post('/v1/payments', {
      transaction_amount: payload.amount,
      description: payload.description,
      payment_method_id: 'pix',
      payer: { email: 'admin@paroquia.com' }
    });
    return response.data;
  }

  async verificarPagamento(paymentId) {
    const response = await this.client.get(`/v1/payments/${paymentId}`);
    return response.data;
  }
}

const mpClient = new MercadoPagoClient(process.env.MERCADO_PAGO_ACCESS_TOKEN);
export const criarPagamentoPix = (payload) => mpClient.criarPagamentoPix(payload);
export const verificarPagamento = (id) => mpClient.verificarPagamento(id);
```

**`backend/lib/google-sheets.js`**
```javascript
import { google } from 'googleapis';

const sheets = google.sheets('v4');

export async function buscarFotos() {
  // Buscar linhas com status != "Erro"
  // Retornar { fotos: [...], total, ultimaAtualizacao }
}

export async function registrarPedido(payload) {
  // Adicionar linha: ID_TRANSACAO, WHATSAPP (criptografado), FOTO_IDS, TOTAL, STATUS, TIMESTAMP
  // Retornar { id, ...payload }
}

export async function atualizarPedido(transactionId, updates) {
  // Encontrar linha por transactionId
  // Atualizar coluna Status, WhatsApp enviado, etc.
  // Retornar pedido atualizado
}

export async function buscarPedidosComStatusPago() {
  // Buscar linhas com Status = "Pago" e "WhatsApp enviado" = vazio
  // Retornar array de pedidos
}
```

**`backend/lib/encryption.js`**
```javascript
import crypto from 'crypto';

export class Encryption {
  constructor() {
    this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  }

  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
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

export const encryption = new Encryption();
```

---

## 3. GOOGLE APPS SCRIPT (AutomaÃ§Ã£o)

### 3.1 Trigger de Monitoramento

```javascript
// Code.gs
function criarTriggers() {
  // Trigger a cada 5 minutos para processar fotos
  ScriptApp.newTrigger('processarFotasNovasAuto')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Trigger a cada 2 minutos para enviar WhatsApp
  ScriptApp.newTrigger('enviarWhatsAppAuto')
    .timeBased()
    .everyMinutes(2)
    .create();
}

function processarFotasNovasAuto() {
  const pasta = DriveApp.getFoldersByName('ACERVO_PAROQUIA').next();
  const eventosFolder = pasta.getFoldersByName('Eventos').next();
  
  const arquivos = eventosFolder.getFiles();
  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    if (arquivo.getMimeType().startsWith('image/')) {
      processarFoto(arquivo);
    }
  }
}

function enviarWhatsAppAuto() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Metadados');
  const dados = sheet.getDataRange().getValues();
  
  for (let i = 1; i < dados.length; i++) {
    const status = dados[i][6]; // Status coluna
    const whatsappEnviado = dados[i][7];
    
    if (status === 'Pago' && !whatsappEnviado) {
      enviarWhatsApp(dados[i], i + 1);
    }
  }
}
```

### 3.2 FunÃ§Ãµes CrÃ­ticas

**`Marca.gs` â€” Aplicar marca d'Ã¡gua**
```javascript
function processarFoto(arquivo) {
  try {
    const fotoId = gerarIdUnico();
    const blob = arquivo.getBlob();
    
    // Baixar imagem
    const imagemBytes = blob.getBytes();
    
    // Chamar backend para criptografia (ou usar ImageMagick via CLI)
    // Salvar em /Processadas_Originais e /Processadas_Amostras
    
    const sistemaFolder = DriveApp.getFoldersByName('ACERVO_PAROQUIA').next()
      .getFoldersByName('Sistema').next();
    const originaisFolder = sistemaFolder.getFoldersByName('Processadas_Originais').next();
    const amostrasFolder = sistemaFolder.getFoldersByName('Processadas_Amostras').next();
    
    // Salvar versÃ£o original
    const fotoOriginal = originaisFolder.createFile(`${fotoId}_original.jpg`, blob);
    
    // Aplicar marca (ImageMagick via UrlFetchApp)
    const fotomarcada = aplicarMarcaDAgua(imagemBytes);
    const fotoAmostra = amostrasFolder.createFile(`${fotoId}_amostra.jpg`, fotomarcada);
    
    // Registrar em Sheet
    registrarFotoProcessada({
      id: fotoId,
      evento: arquivo.getParents().next().getName(),
      linkOriginal: fotoOriginal.getUrl(),
      linkAmostra: fotoAmostra.getUrl(),
      timestamp: new Date()
    });
    
    registrarAcao('foto_processada', { fotoId });
    
  } catch (err) {
    registrarErro(arquivo.getName(), err.message);
    MailApp.sendEmail('admin@paroquia.com', 
      `Erro ao processar foto: ${arquivo.getName()}`,
      err.message);
  }
}

function aplicarMarcaDAgua(imagemBytes) {
  // Usar ImageMagick via convert command (se disponÃ­vel)
  // Ou chamar API backend para fazer processamento
  // Retornar bytes da imagem com marca aplicada
}
```

**`WhatsApp.gs` â€” Enviar fotos**
```javascript
function enviarWhatsApp(pedido, linhaIndex) {
  try {
    const whatsapp = descriptografarDado(pedido[4]); // Criptografado em Sheet
    const fotoIds = JSON.parse(pedido[3]);
    
    // Buscar fotos originais
    const sistemaFolder = DriveApp.getFoldersByName('ACERVO_PAROQUIA').next()
      .getFoldersByName('Sistema').next();
    const originaisFolder = sistemaFolder.getFoldersByName('Processadas_Originais').next();
    
    let mensagem = 'Paz e Bem! Aqui estÃ¡ sua(s) foto(s) da ParÃ³quia SÃ£o Rafael.\n\n';
    
    for (const fotoId of fotoIds) {
      const arquivo = originaisFolder.getFilesByName(`${fotoId}_original.jpg`);
      if (arquivo.hasNext()) {
        const file = arquivo.next();
        // Compartilhar com permissÃ£o READER
        file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEWER);
        mensagem += `ðŸ“¸ ${file.getUrl()}\n`;
      }
    }
    
    // Enviar via Evolution API OU gerar link wa.me
    const linkWhatsApp = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    
    // Registrar link em Sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Metadados');
    sheet.getRange(`H${linhaIndex}`).setValue(new Date()); // WhatsApp enviado
    sheet.getRange(`G${linhaIndex}`).setValue('Entregue'); // Status
    
    registrarAcao('whatsapp_enviado', { 
      fotoIds,
      timestamp: new Date()
    });
    
  } catch (err) {
    registrarAcao('whatsapp_erro', { 
      erro: err.message,
      tentativa: pedido[9] ? parseInt(pedido[9]) + 1 : 1
    });
  }
}
```

### 3.3 Estrutura Google Sheet

**Sheet: "Metadados"**

| Col | Nome | Tipo | Exemplo | Notas |
|-----|------|------|---------|-------|
| A | ID | String | FOTO_001 | Ãšnico |
| B | Evento | String | Missa SÃ¡bado | From folder name |
| C | Foto Original | URL | gs://drive.google... | Link Drive |
| D | Foto Amostra | URL | gs://drive.google... | Com tarja |
| E | FotoIds (JSON) | Text | ["FOTO_001", "FOTO_002"] | Array pedido |
| F | WhatsApp | Text | [criptografado] | AES-256-GCM |
| G | Pago | Boolean | true | NÃ£o/Sim |
| H | Status | String | Entregue | Aguardando/Pago/Entregue/Erro |
| I | WhatsApp Enviado | DateTime | 2026-05-05T10:30Z | Timestamp envio |
| J | Tentativas | Number | 1 | Retry count |
| K | Erro | String | (vazio) | Mensagem erro |
| L | Data CriaÃ§Ã£o | DateTime | 2026-05-05T10:00Z | Timestamp |

---

## 4. DESIGN SYSTEM - IntegraÃ§Ã£o no Frontend

### 4.1 CSS Base

**Arquivo: `frontend/styles/ds-tokens.css`**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Nunito:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* Cores PrimÃ¡rias */
  --parish-purple: #6D2077;
  --parish-purple-dark: #461356;
  --parish-purple-light: rgba(109, 32, 119, 0.08);
  
  /* Accent */
  --parish-yellow: #F7C848;
  --parish-yellow-dark: #C8A020;
  --parish-yellow-light: #FFDA85;
  --parish-yellow-20: rgba(247, 200, 72, 0.20);
  
  /* Neutras */
  --parish-paper: #FAF6EF;
  --parish-ink: #18150F;
  --white: #ffffff;
  
  /* SemÃ¢nticas */
  --success: #3C7A5A;
  --warning: #F7C848;
  --error: #dc2626;
  
  /* Tipografia */
  --font-display: 'Playfair Display', serif;
  --font-body: 'Nunito', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --gap-2: 8px;
  --gap-3: 12px;
  --gap-4: 16px;
  --gap-6: 24px;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.15);
  --shadow-2xl: 0 20px 25px rgba(0, 0, 0, 0.2);
}

body {
  font-family: var(--font-body);
  color: var(--parish-ink);
  background: var(--parish-paper);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.15;
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.btn-primary {
  background: var(--parish-yellow);
  color: var(--parish-ink);
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 700;
  cursor: pointer;
  transition: all 200ms ease;
}

.btn-primary:hover {
  background: var(--parish-yellow-dark);
  box-shadow: var(--shadow-lg);
}

.btn-primary:focus {
  outline: 3px solid var(--parish-purple);
}

.card {
  background: var(--white);
  border: 1px solid var(--parish-purple-light);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: box-shadow 300ms ease;
}

.card:hover {
  box-shadow: var(--shadow-lg);
}

.input {
  border: 1px solid rgba(109, 32, 119, 0.15);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 16px;
  transition: all 200ms ease;
}

.input:focus {
  outline: 3px solid var(--parish-purple);
  border-color: var(--parish-purple);
}

.status-confirmado {
  background: var(--success);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}

.status-pendente {
  background: var(--parish-yellow);
  color: var(--parish-ink);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
}
```

### 4.2 Componentes ReutilizÃ¡veis

**`frontend/components/Header.jsx`** (reutilizar do DS)
```jsx
import React from 'react';
import { Menu, X } from 'lucide-react';

export default function Header({ user }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="container flex items-center justify-between py-4 md:py-6">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="ParÃ³quia SÃ£o Rafael" className="h-10" />
          <span className="text-lg font-bold text-parish-ink">ParÃ³quia SÃ£o Rafael</span>
        </div>
        
        <nav className="hidden md:flex gap-6">
          <a href="/" className="text-parish-ink hover:bg-parish-yellow/20 px-3 py-2 rounded">
            Galeria
          </a>
          {user && (
            <a href="/admin" className="text-parish-ink hover:bg-parish-yellow/20 px-3 py-2 rounded">
              Admin
            </a>
          )}
        </nav>
        
        <button 
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
```

**`frontend/components/FotoCard.jsx`** (novo)
```jsx
import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function FotoCard({ foto, selected, onToggle }) {
  return (
    <div className="card cursor-pointer group" onClick={() => onToggle(foto.id)}>
      <div className="relative overflow-hidden rounded-lg mb-4">
        <img 
          src={foto.linkAmostra} 
          alt={`${foto.id}`}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform 300ms"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity 300ms flex items-center justify-center">
          {selected && <CheckCircle className="text-parish-yellow" size={48} />}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-parish-ink">{foto.id}</p>
          <p className="text-sm text-parish-ink/60">{foto.evento}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-parish-purple">R$ {foto.preco.toFixed(2)}</p>
          <input 
            type="checkbox" 
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggle(foto.id);
            }}
            className="mt-2 cursor-pointer accent-parish-yellow"
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 5. SEGURANÃ‡A - Checklist CrÃ­tico

Baseado em `seguranÃ§a.md`:

- [x] **Credenciais:** Todas em `.env.local` (dev) e Vercel secrets (prod)
- [x] **RBAC:** 3 roles â€” FOTOGRAFO, ADMIN, CLIENT â€” controladas via JWT
- [x] **Webhooks:** HMAC-SHA256 validation + idempotÃªncia
- [x] **Criptografia:** AES-256-GCM para WhatsApp, nomes, dados sensÃ­veis em Sheet
- [x] **Rate Limiting:** 100 req/15min geral, 5 req/min pagamento
- [x] **Auditoria:** Logs seguros sem PII, registrar em Sheet + Sentry
- [x] **CORS:** Apenas domÃ­nio paroquial (`https://fotos.paroquia.com.br`)
- [x] **HTTPS:** Vercel + Let's Encrypt
- [x] **ValidaÃ§Ã£o:** Zod schemas em backend (nunca confiar em frontend)
- [x] **LGPD:** PolÃ­tica de retenÃ§Ã£o â€” 1 ano fotos, 2 anos transaÃ§Ãµes, 90 dias logs

---

## 6. TESTES - EstratÃ©gia TDD

Seguindo `tdd.md`:

### 6.1 Cobertura Alvo

- **Unit Tests:** 80%+ linhas
- **Integration Tests:** APIs + componentes
- **E2E Tests:** Fluxo completo (upload â†’ entrega WhatsApp)
- **Stress Tests:** 50 usuÃ¡rios, 10 pagamentos/min

### 6.2 Ferramentas

- **Jest** â€” Unit + Integration (Apps Script mocks)
- **Playwright** â€” E2E
- **Supertest** â€” API HTTP testing
- **nock** â€” Mock HTTP external

### 6.3 Testes CrÃ­ticos

```javascript
// __tests__/unit/calculos.test.js
describe('CÃ¡lculos de PreÃ§o', () => {
  it('deve calcular subtotal corretamente', () => {
    const fotos = [{ id: 'FOTO_001', preco: 10.00 }, { id: 'FOTO_002', preco: 10.00 }];
    expect(calcularSubtotal(fotos)).toBe(20.00);
  });

  it('deve aplicar taxa 2.99% + R$0,30', () => {
    const taxa = calcularTaxa(100.00); // 3.29
    expect(taxa).toBe((100 * 0.0299) + 0.30);
  });

  it('deve validar WhatsApp', () => {
    expect(validarWhatsApp('11999999999')).toBe(true);
    expect(validarWhatsApp('123')).toBe(false);
  });
});

// __tests__/integration/api-pagamento.test.js
describe('POST /api/checkout/preference', () => {
  it('deve criar pagamento e retornar QR Code', async () => {
    const res = await request(app)
      .post('/api/checkout/preference')
      .send({
        whatsapp: '11999999999',
        fotoIds: ['FOTO_001'],
        totalComTaxa: 10.99
      });

    expect(res.status).toBe(200);
    expect(res.body.qrCode).toBeDefined();
    expect(res.body.transactionId).toBeDefined();
  });
});

// __tests__/e2e/compra-completa.spec.js
test('usuÃ¡rio deve comprar fotos ponta-a-ponta', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('input[data-photo="FOTO_001"]');
  await page.click('[data-action="proximo"]');
  await page.fill('[name="whatsapp"]', '11999999999');
  await page.click('[data-action="proximo"]');
  await page.click('[name="confirma"]');
  await page.click('[data-action="pagar"]');
  
  await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
});
```

---

## 7. VERIFICAÃ‡ÃƒO & DEPLOYMENT

### 7.1 Checklist PrÃ©-Deploy

**Fase 1 (Critical):**
- [ ] Todos os secrets em `.env` (nunca hardcoded)
- [ ] HTTPS ativado + certificado vÃ¡lido
- [ ] Webhook HMAC signature verificado
- [ ] Rate limiting em produÃ§Ã£o
- [ ] Input validation em todos endpoints
- [ ] CORS apenas para domÃ­nio paroquial

**Fase 2 (High):**
- [ ] RBAC testado (FOTOGRAFO/ADMIN/CLIENT)
- [ ] Auditoria de aÃ§Ãµes logada
- [ ] Dados sensÃ­veis criptografados (WhatsApp, nomes)
- [ ] PolÃ­tica de retenÃ§Ã£o implementada
- [ ] DPA assinado (Google, Mercado Pago, Evolution)

**Fase 3 (Medium):**
- [ ] npm audit zerado (vulnerabilidades)
- [ ] Privacy policy publicada
- [ ] Incident response plan criado
- [ ] Monitoring ativado (Sentry, Datadog)

**Antes do go-live:**
- [ ] Teste de penetraÃ§Ã£o (ou terceiros)
- [ ] Backup automÃ¡tico testado
- [ ] SLA de disponibilidade acordado

### 7.2 Deploy Process

1. **Frontend:** Push para GitHub â†’ GitHub Actions roda testes â†’ Deploy para Vercel
2. **Backend:** Vercel Functions auto-deploy via git
3. **Google Apps Script:** Deploy via clasp CLI
4. **Testes:** CI/CD roda Jest + Playwright antes de merge

---

## 8. ESTRUTURA DE PASTAS FINAL

```
paroquia-fotos-venda/
â”œâ”€â”€ README.md
â”œâ”€â”€ SEGURANCA.md
â”œâ”€â”€ FLUXO.md
â”‚
â”œâ”€â”€ frontend/ (Next.js ou Vite + React)
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”‚   â”œâ”€â”€ index.jsx (galeria pÃºblica)
â”‚   â”‚   â”‚   â”œâ”€â”€ compra/index.jsx (multi-step)
â”‚   â”‚   â”‚   â””â”€â”€ admin/ (dashboard)
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ Header.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ Footer.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ FotoCard.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ GaleriaGrid.jsx
â”‚   â”‚   â”‚   â”œâ”€â”€ FluxoCompra.jsx
â”‚   â”‚   â”‚   â””â”€â”€ Admin/
â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”œâ”€â”€ useEventos.js
â”‚   â”‚   â”‚   â”œâ”€â”€ useCarrinho.js
â”‚   â”‚   â”‚   â”œâ”€â”€ usePagamento.js
â”‚   â”‚   â”‚   â””â”€â”€ useValidacao.js
â”‚   â”‚   â”œâ”€â”€ styles/
â”‚   â”‚   â”‚   â”œâ”€â”€ ds-tokens.css (design system)
â”‚   â”‚   â”‚   â””â”€â”€ globals.css
â”‚   â”‚   â””â”€â”€ lib/ (axios instance, etc)
â”‚   â”œâ”€â”€ public/
â”‚   â”‚   â”œâ”€â”€ logo.svg
â”‚   â”‚   â”œâ”€â”€ ornament-corner.svg
â”‚   â”‚   â””â”€â”€ ornament-divider.svg
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ vite.config.js
â”‚
â”œâ”€â”€ backend/ (Node.js Vercel Functions)
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ fotos.js
â”‚   â”‚   â”œâ”€â”€ criar-pagamento.js
â”‚   â”‚   â”œâ”€â”€ status-pagamento.js
â”‚   â”‚   â””â”€â”€ webhook/mercado-pago.js
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ mercado-pago.js
â”‚   â”‚   â”œâ”€â”€ google-sheets.js
â”‚   â”‚   â”œâ”€â”€ google-drive.js
â”‚   â”‚   â”œâ”€â”€ whatsapp-api.js
â”‚   â”‚   â”œâ”€â”€ encryption.js
â”‚   â”‚   â”œâ”€â”€ auth.js
â”‚   â”‚   â”œâ”€â”€ auditLog.js
â”‚   â”‚   â””â”€â”€ validation.js
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”œâ”€â”€ rateLimiter.js
â”‚   â”‚   â”œâ”€â”€ errorHandler.js
â”‚   â”‚   â””â”€â”€ cors.js
â”‚   â”œâ”€â”€ vercel.json
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ google-apps-script/
â”‚   â”œâ”€â”€ Code.gs (triggers, orquestraÃ§Ã£o)
â”‚   â”œâ”€â”€ Marca.gs (marca d'Ã¡gua)
â”‚   â”œâ”€â”€ Drive.gs (monitorar uploads)
â”‚   â”œâ”€â”€ Sheet.gs (registrar, buscar, atualizar)
â”‚   â”œâ”€â”€ WhatsApp.gs (enviar mensagens)
â”‚   â”œâ”€â”€ Validacao.gs (validar imagens)
â”‚   â”œâ”€â”€ Auditoria.gs (logging)
â”‚   â””â”€â”€ appsscript.json (manifest)
â”‚
â”œâ”€â”€ __tests__/
â”‚   â”œâ”€â”€ unit/
â”‚   â”‚   â”œâ”€â”€ marca.test.js
â”‚   â”‚   â”œâ”€â”€ drive.test.js
â”‚   â”‚   â”œâ”€â”€ sheet.test.js
â”‚   â”‚   â”œâ”€â”€ calculos.test.js
â”‚   â”‚   â”œâ”€â”€ validacao.test.js
â”‚   â”‚   â””â”€â”€ mercado-pago.test.js
â”‚   â”œâ”€â”€ integration/
â”‚   â”‚   â”œâ”€â”€ api-pagamento.test.js
â”‚   â”‚   â”œâ”€â”€ webhook-seguranca.test.js
â”‚   â”‚   â”œâ”€â”€ galeria.test.js
â”‚   â”‚   â””â”€â”€ fluxo-compra.test.js
â”‚   â”œâ”€â”€ e2e/
â”‚   â”‚   â”œâ”€â”€ compra-completa.spec.js
â”‚   â”‚   â”œâ”€â”€ pagamento-sucesso.spec.js
â”‚   â”‚   â””â”€â”€ responsividade.spec.js
â”‚   â”œâ”€â”€ stress/
â”‚   â”‚   â””â”€â”€ carga.test.js
â”‚   â””â”€â”€ fixtures/ (dados mock)
â”‚
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ SETUP.md
â”‚   â”œâ”€â”€ FLUXO.md
â”‚   â”œâ”€â”€ DESIGN_SYSTEM.md
â”‚   â””â”€â”€ TROUBLESHOOTING.md
â”‚
â”œâ”€â”€ .env.local (gitignored)
â”œâ”€â”€ .env.production (Vercel secrets)
â”œâ”€â”€ .gitignore
â”œâ”€â”€ jest.config.js
â”œâ”€â”€ playwright.config.js
â””â”€â”€ package.json
```

---

## PrÃ³ximos Passos (Ordem de ImplementaÃ§Ã£o)

1. **Setup Inicial (1 dia)**
   - [x] Criar monorepo (frontend + backend estruturado)
   - [x] Copiar Design System existente (`colors_and_type.css`, componentes)
   - [x] Setup Jest + Playwright + Supertest

2. **Frontend Base (3-4 dias)**
   - [ ] Page galeria com `FotoCard`, `GaleriaGrid` (TDD)
   - [ ] Fluxo multi-step (4 steps com validaÃ§Ã£o)
   - [ ] Integrar Design System (colors, typography, components)
   - [ ] Tests: componentes + fluxo

3. **Backend APIs (3-4 dias)**
   - [ ] Endpoint `/api/eventos` (mock Google Sheets)
   - [ ] Endpoint `/api/checkout/preference` (integrar Mercado Pago)
   - [ ] Webhook `/webhook/mercado-pago` (HMAC validation)
   - [ ] Tests: unit + integration + seguranÃ§a

4. **Google Apps Script (2-3 dias)**
   - [ ] Monitorar uploads, aplicar marca
   - [ ] Registrar em Google Sheets
   - [ ] Enviar WhatsApp (via Evolution ou link wa.me)
   - [ ] Tests: mocks do Google Apps

5. **SeguranÃ§a & Compliance (2 dias)**
   - [ ] Mover credenciais â†’ env vars
   - [ ] RBAC implementation
   - [ ] Criptografia dados sensÃ­veis
   - [ ] Auditoria e logging
   - [ ] Checklist prÃ©-deploy

6. **Testes Completos (2 dias)**
   - [ ] E2E com Playwright
   - [ ] Stress tests
   - [ ] Coverage 80%+

7. **Deploy & Go-Live (1 dia)**
   - [ ] CI/CD setup (GitHub Actions)
   - [ ] Deploy para Vercel + Apps Script
   - [ ] Monitoramento ao vivo
   - [ ] Suporte ativo

---

## DecisÃµes de Design

| DecisÃ£o | Rationale | Trade-off |
|---------|-----------|-----------|
| **React + Vite** | Fast dev, SSR optional, Design System readiness | Bundle size se nÃ£o otimizar |
| **Vercel Functions** | Serverless, auto-scaling, integraÃ§Ã£o GitHub | Cold start latency ~100ms |
| **Google Sheets + Drive** | Zero custo, LGPD-friendly, built-in backups | Performance if >1000 rows |
| **Mercado Pago Pix** | InstantÃ¢neo, taxa 2.99%+R$0,30, maduro | Requer conta MP brasileira |
| **Google Apps Script** | Integrado nativo com Drive/Sheets, free | Sem Docker, deployment manual |
| **Evolution API (WhatsApp)** | EscalÃ¡vel, self-hosted, no rate limit MP | Requer VPS ~R$50/mÃªs |
| **AES-256-GCM** | PadrÃ£o industria, NIST-approved, autenticado | Overhead criptografia 10-20ms |
| **TDD First** | ConfianÃ§a cÃ³digo, refactoring seguro, docs vivas | Ramp inicial 20-30% mais tempo |

---

## Metricas de Sucesso

- âœ… **Cobertura:** 80%+ unit tests, 60%+ integration, E2E crÃ­ticos
- âœ… **Performance:** P95 < 500ms API, Lighthouse 90+
- âœ… **SeguranÃ§a:** 0 vulnerabilidades npm audit, OWASP top 10 mitigado
- âœ… **LGPD:** Privacy policy + DPA, retenÃ§Ã£o implementada, sem PII em logs
- âœ… **UX:** Responsive mobile-first, acessibilidade WCAG AA, Design System 100% aplicado
- âœ… **Disponibilidade:** 99.5% uptime, SLA acordado
- âœ… **Stress:** 50 users simultÃ¢neos, 10 pagamentos/min sem falha

---

**Documento finalizado:** 2026-05-05  
**PrÃ³xima revisÃ£o:** ApÃ³s aprovaÃ§Ã£o do plano