# ARCHITECTURE_SINGLE_PERSON.md - DecisÃµes para Acelerar

**Objetivo:** Simplificar a arquitetura ao mÃ¡ximo para 1 desenvolvedor em 7 semanas
**Data:** 2026-05-05

---

## ðŸŽ¯ PrincÃ­pio Guia

> "YAGNI: You Ain't Gonna Need It"
> Se nÃ£o precisa agora, nÃ£o implemente. Se precisar em V2.0, refatora.

---

## âŒ O QUE NÃƒO VAMOS USAR (E POR QUÃŠ)

### 1. Redux / Zustand
- âŒ **Por quÃª NÃƒO:** Context API + useReducer Ã© suficiente para carrinho de fotos
- âœ… **Use:** Context API (`src/context/CarrinhoContext.js`)
- **Economiza:** ~3 dias de setup e manutenÃ§Ã£o

### 2. TypeScript
- âŒ **Por quÃª NÃƒO:** Compile time vai atrasar desenvolvimento
- âœ… **Use:** JavaScript puro + JSDoc para documentaÃ§Ã£o
- **Economiza:** ~5 dias (setup, tipos, refatoraÃ§Ã£o)

```javascript
/**
 * Calcula subtotal de fotos selecionadas
 * @param {Array<{id: string, preco: number}>} fotos
 * @returns {number} Subtotal em reais
 */
function calcularSubtotal(fotos) {
  return fotos.reduce((sum, foto) => sum + foto.preco, 0);
}
```

### 3. GraphQL
- âŒ **Por quÃª NÃƒO:** REST Ã© mais simples de debug e deploy rÃ¡pido
- âœ… **Use:** REST puro (GET/POST)
- **Economiza:** ~5 dias de setup

### 4. MicroserviÃ§os
- âŒ **Por quÃª NÃƒO:** Overhead de coordenaÃ§Ã£o, vocÃª estÃ¡ sozinho
- âœ… **Use:** Monolito (tudo em 1 repo, 3 pastas: frontend, backend, google-apps-script)
- **Economiza:** ~7 dias de complexity

### 5. Docker
- âŒ **Por quÃª NÃƒO:** Vercel nÃ£o precisa, Google Apps Script nÃ£o suporta
- âœ… **Use:** Vercel Functions como estÃ¡, Google Apps Script online
- **Economiza:** ~2 dias de config

### 6. Database Relacional (PostgreSQL, MySQL)
- âŒ **Por quÃª NÃƒO:** Overhead de setup, migrations, backups
- âœ… **Use:** Google Sheets como "banco de dados" (jÃ¡ autosalva, backup automÃ¡tico)
- **Economiza:** ~10 dias

### 7. ORM (Sequelize, Prisma, TypeORM)
- âŒ **Por quÃª NÃƒO:** Overhead para 1 pessoa
- âœ… **Use:** Biblioteca `google-spreadsheet` (simple wrapper)
- **Economiza:** ~3 dias

### 8. Evolution API WhatsApp
- âŒ **Por quÃª NÃƒO:** Requer VPS, setup complexo, manutenÃ§Ã£o
- âœ… **Use:** Link simples `https://wa.me/55...?text=...` (zero setup)
- **Economiza:** ~5 dias + custo VPS (R$50/mÃªs)

### 9. Firestore / Realtime Database
- âŒ **Por quÃª NÃƒO:** Google Sheets Ã© suficiente, menos APIs pra gerenciar
- âœ… **Use:** Google Sheets (simples, familiar, backup automÃ¡tico)
- **Economiza:** ~4 dias + API calls desnecessÃ¡rias

### 10. Testing Framework Complexo
- âŒ **Por quÃª NÃƒO:** Jest puro jÃ¡ Ã© poderoso
- âœ… **Use:** Jest (unit + integration), Playwright (E2E)
- **Economiza:** ~2 dias de aprendizado

---

## âœ… O QUE VAMOS USAR

### Frontend
```
â”œâ”€â”€ React 18+ (Vite)
â”œâ”€â”€ Tailwind CSS (estilo rÃ¡pido)
â”œâ”€â”€ Context API (state global)
â”œâ”€â”€ React Hook Form + Zod (forms + validaÃ§Ã£o)
â”œâ”€â”€ axios (HTTP client)
â””â”€â”€ lucide-react (Ã­cones)
```

**Stack rÃ¡pido:** Vite compila em <100ms, React Ã© familiar, Tailwind Ã© CSS pronto

### Backend
```
â”œâ”€â”€ Node.js 18+ (Vercel Functions)
â”œâ”€â”€ Express (leve)
â”œâ”€â”€ Zod (validaÃ§Ã£o)
â”œâ”€â”€ axios (calls HTTP para Mercado Pago)
â”œâ”€â”€ crypto (criptografia nativa)
â””â”€â”€ jest (testes)
```

**Stack rÃ¡pido:** Vercel Functions = deployment 1-click, zero infra

### Google Apps Script
```
â”œâ”€â”€ JavaScript nativo do Google
â”œâ”€â”€ Drive API v3
â”œâ”€â”€ Sheets API v4
â”œâ”€â”€ UrlFetchApp (para chamar APIs)
â””â”€â”€ jest + mocks (testes local)
```

**Stack rÃ¡pido:** Tudo pronto, sem dependÃªncias externas

---

## ðŸ“Š DecisÃµes de Trade-offs

| DecisÃ£o | BenefÃ­cio | Trade-off |
|---------|-----------|-----------|
| **Google Sheets como DB** | Setup 0, backup automÃ¡tico | Limite ~500k linhas, lento com >10k registros |
| **Link wa.me vs Evolution API** | Zero setup, grÃ¡tis | NÃ£o personalizado, sem delivery confirmation |
| **Context API vs Redux** | Menos cÃ³digo, mais rÃ¡pido | Prop drilling em componentes profundos (nÃ£o aplica aqui) |
| **Jest 70% vs 80% coverage** | -1 dia de testes | Edge cases podem nÃ£o estar cobertos |
| **Google Sheets como logs** | Simples, visÃ­vel | Limite de size (~500MB), nÃ£o ideal para analytics |
| **Sem TypeScript** | -5 dias | Menos verificaÃ§Ã£o em tempo de compilaÃ§Ã£o |

---

## ðŸ—ï¸ Estrutura de Pastas (Simples)

```
paroquia-fotos-venda/
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/        (componentes React)
â”‚   â”‚   â”œâ”€â”€ pages/             (pÃ¡ginas)
â”‚   â”‚   â”œâ”€â”€ hooks/             (custom hooks)
â”‚   â”‚   â”œâ”€â”€ context/           (Context API)
â”‚   â”‚   â”œâ”€â”€ styles/            (CSS + Tailwind)
â”‚   â”‚   â””â”€â”€ lib/               (utilitÃ¡rios)
â”‚   â”œâ”€â”€ __tests__/             (testes)
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ api/                   (Vercel Functions: /api/*.js)
â”‚   â”œâ”€â”€ lib/                   (shared utilities)
â”‚   â”œâ”€â”€ middleware/            (auth, cors, rate limit)
â”‚   â”œâ”€â”€ __tests__/             (testes)
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ google-apps-script/
â”‚   â”œâ”€â”€ Code.gs                (trigger principal)
â”‚   â”œâ”€â”€ Marca.gs               (marca d'Ã¡gua)
â”‚   â”œâ”€â”€ Drive.gs               (Drive operations)
â”‚   â”œâ”€â”€ Sheet.gs               (Sheets operations)
â”‚   â”œâ”€â”€ WhatsApp.gs            (envio WhatsApp)
â”‚   â”œâ”€â”€ __tests__/             (testes local)
â”‚   â””â”€â”€ appsscript.json        (manifest)
â”‚
â”œâ”€â”€ .env.local                 (desenvolvimento)
â”œâ”€â”€ jest.config.js             (testes)
â”œâ”€â”€ .eslintrc.json             (linter)
â”œâ”€â”€ .prettierrc.json           (formatter)
â””â”€â”€ package.json               (deps raiz)
```

**Simples:** Cada pasta = uma responsabilidade

---

## ðŸ”„ Fluxo de Dados (Simplified)

```
ENTRADA: FotÃ³grafo upload (Drive)
    â†“
PROCESSAMENTO: Apps Script (5 min trigger)
    â†“
DADOS: Google Sheets (source of truth)
    â†“
BACKEND: Vercel Functions (APIs REST)
    â†“
FRONTEND: React (galeria + fluxo compra)
    â†“
PAGAMENTO: Mercado Pago API
    â†“
WEBHOOK: Vercel Function (validaÃ§Ã£o HMAC)
    â†“
ENTREGA: Apps Script (enviar WhatsApp link)
    â†“
SAÃDA: Cliente recebe link Drive via wa.me
```

**Simples:** Fluxo linear, sem loops complexos

---

## âš¡ OtimizaÃ§Ãµes para 1 Pessoa

### 1. AutomaÃ§Ã£o de Setup
```bash
# scripts/setup.sh - roda tudo de uma vez
npm install
npm run lint:fix
npm run test
npm run build
```

### 2. Pre-commit Hooks
```bash
# .husky/pre-commit
npm run lint:fix
npm run test:unit
```
â†’ Impede commit com bugs Ã³bvios

### 3. CI/CD AutomÃ¡tico
```yaml
# .github/workflows/deploy.yml
- Testes rodam automÃ¡tico
- Deploy para Vercel se tudo passar
- Notifica se algo quebrar
```

### 4. DocumentaÃ§Ã£o Inline
```javascript
// ComentÃ¡rios curtos, JSDoc para funÃ§Ãµes
// NÃƒO escreva novelas de cÃ³digo
```

### 5. Teste de FumaÃ§a (Smoke Tests)
```javascript
// Teste rÃ¡pido: sistema online?
test("GET /api/eventos returns 200", async () => {
  const res = await fetch("http://localhost:3001/api/eventos");
  expect(res.status).toBe(200);
});
```

---

## ðŸš« O que NUNCA fazer (mesmo que pedir)

- âŒ Refatorar "para ficar bonito" (deixa para V2.0)
- âŒ Adicionar features que nÃ£o estÃ£o no MVP
- âŒ Usar dependÃªncias "porque Ã© cool"
- âŒ Otimizar performance antes de ter problema (profile first)
- âŒ Escrever code que "poderia ser reutilizado" (YAGNI)
- âŒ Criar abstraÃ§Ãµes "para o futuro" (3 linhas iguais = OK, refatora depois)

---

## âœ… Checklist: DecisÃµes Confirmadas

- [x] TypeScript: **NÃƒO** (JavaScript + JSDoc)
- [x] Redux: **NÃƒO** (Context API)
- [x] Docker: **NÃƒO** (Vercel + Apps Script)
- [x] Database: **Google Sheets** (nÃ£o Firestore)
- [x] WhatsApp: **Link wa.me** (nÃ£o Evolution)
- [x] Backend: **REST simples** (nÃ£o GraphQL)
- [x] Frontend: **React + Vite** (rÃ¡pido)
- [x] Testes: **Jest 70%** (nÃ£o 80%)

---

## ðŸ“– PrÃ³ximas Leituras

1. **CODE_STANDARDS.md** - PadrÃµes especÃ­ficos (lint, format, naming)
2. **ROADMAP_SOLO.md** - Semana a semana
3. **LEARNING_PATH.md** - Se precisa ramp-up tÃ©cnico
