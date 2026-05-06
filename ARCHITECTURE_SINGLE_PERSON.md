# ARCHITECTURE_SINGLE_PERSON.md - Decisões para Acelerar

**Objetivo:** Simplificar a arquitetura ao máximo para 1 desenvolvedor em 7 semanas
**Data:** 2026-05-05

---

## 🎯 Princípio Guia

> "YAGNI: You Ain't Gonna Need It"
> Se não precisa agora, não implemente. Se precisar em V2.0, refatora.

---

## ❌ O QUE NÃO VAMOS USAR (E POR QUÊ)

### 1. Redux / Zustand
- ❌ **Por quê NÃO:** Context API + useReducer é suficiente para carrinho de fotos
- ✅ **Use:** Context API (`src/context/CarrinhoContext.js`)
- **Economiza:** ~3 dias de setup e manutenção

### 2. TypeScript
- ❌ **Por quê NÃO:** Compile time vai atrasar desenvolvimento
- ✅ **Use:** JavaScript puro + JSDoc para documentação
- **Economiza:** ~5 dias (setup, tipos, refatoração)

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
- ❌ **Por quê NÃO:** REST é mais simples de debug e deploy rápido
- ✅ **Use:** REST puro (GET/POST)
- **Economiza:** ~5 dias de setup

### 4. Microserviços
- ❌ **Por quê NÃO:** Overhead de coordenação, você está sozinho
- ✅ **Use:** Monolito (tudo em 1 repo, 3 pastas: frontend, backend, google-apps-script)
- **Economiza:** ~7 dias de complexity

### 5. Docker
- ❌ **Por quê NÃO:** Vercel não precisa, Google Apps Script não suporta
- ✅ **Use:** Vercel Functions como está, Google Apps Script online
- **Economiza:** ~2 dias de config

### 6. Database Relacional (PostgreSQL, MySQL)
- ❌ **Por quê NÃO:** Overhead de setup, migrations, backups
- ✅ **Use:** Google Sheets como "banco de dados" (já autosalva, backup automático)
- **Economiza:** ~10 dias

### 7. ORM (Sequelize, Prisma, TypeORM)
- ❌ **Por quê NÃO:** Overhead para 1 pessoa
- ✅ **Use:** Biblioteca `google-spreadsheet` (simple wrapper)
- **Economiza:** ~3 dias

### 8. Evolution API WhatsApp
- ❌ **Por quê NÃO:** Requer VPS, setup complexo, manutenção
- ✅ **Use:** Link simples `https://wa.me/55...?text=...` (zero setup)
- **Economiza:** ~5 dias + custo VPS (R$50/mês)

### 9. Firestore / Realtime Database
- ❌ **Por quê NÃO:** Google Sheets é suficiente, menos APIs pra gerenciar
- ✅ **Use:** Google Sheets (simples, familiar, backup automático)
- **Economiza:** ~4 dias + API calls desnecessárias

### 10. Testing Framework Complexo
- ❌ **Por quê NÃO:** Jest puro já é poderoso
- ✅ **Use:** Jest (unit + integration), Playwright (E2E)
- **Economiza:** ~2 dias de aprendizado

---

## ✅ O QUE VAMOS USAR

### Frontend
```
├── React 18+ (Vite)
├── Tailwind CSS (estilo rápido)
├── Context API (state global)
├── React Hook Form + Zod (forms + validação)
├── axios (HTTP client)
└── lucide-react (ícones)
```

**Stack rápido:** Vite compila em <100ms, React é familiar, Tailwind é CSS pronto

### Backend
```
├── Node.js 18+ (Vercel Functions)
├── Express (leve)
├── Zod (validação)
├── axios (calls HTTP para Mercado Pago)
├── crypto (criptografia nativa)
└── jest (testes)
```

**Stack rápido:** Vercel Functions = deployment 1-click, zero infra

### Google Apps Script
```
├── JavaScript nativo do Google
├── Drive API v3
├── Sheets API v4
├── UrlFetchApp (para chamar APIs)
└── jest + mocks (testes local)
```

**Stack rápido:** Tudo pronto, sem dependências externas

---

## 📊 Decisões de Trade-offs

| Decisão | Benefício | Trade-off |
|---------|-----------|-----------|
| **Google Sheets como DB** | Setup 0, backup automático | Limite ~500k linhas, lento com >10k registros |
| **Link wa.me vs Evolution API** | Zero setup, grátis | Não personalizado, sem delivery confirmation |
| **Context API vs Redux** | Menos código, mais rápido | Prop drilling em componentes profundos (não aplica aqui) |
| **Jest 70% vs 80% coverage** | -1 dia de testes | Edge cases podem não estar cobertos |
| **Google Sheets como logs** | Simples, visível | Limite de size (~500MB), não ideal para analytics |
| **Sem TypeScript** | -5 dias | Menos verificação em tempo de compilação |

---

## 🏗️ Estrutura de Pastas (Simples)

```
paroquia-fotos-venda/
├── frontend/
│   ├── src/
│   │   ├── components/        (componentes React)
│   │   ├── pages/             (páginas)
│   │   ├── hooks/             (custom hooks)
│   │   ├── context/           (Context API)
│   │   ├── styles/            (CSS + Tailwind)
│   │   └── lib/               (utilitários)
│   ├── __tests__/             (testes)
│   └── package.json
│
├── backend/
│   ├── api/                   (Vercel Functions: /api/*.js)
│   ├── lib/                   (shared utilities)
│   ├── middleware/            (auth, cors, rate limit)
│   ├── __tests__/             (testes)
│   └── package.json
│
├── google-apps-script/
│   ├── Code.gs                (trigger principal)
│   ├── Marca.gs               (marca d'água)
│   ├── Drive.gs               (Drive operations)
│   ├── Sheet.gs               (Sheets operations)
│   ├── WhatsApp.gs            (envio WhatsApp)
│   ├── __tests__/             (testes local)
│   └── appsscript.json        (manifest)
│
├── .env.local                 (desenvolvimento)
├── jest.config.js             (testes)
├── .eslintrc.json             (linter)
├── .prettierrc.json           (formatter)
└── package.json               (deps raiz)
```

**Simples:** Cada pasta = uma responsabilidade

---

## 🔄 Fluxo de Dados (Simplified)

```
ENTRADA: Fotógrafo upload (Drive)
    ↓
PROCESSAMENTO: Apps Script (5 min trigger)
    ↓
DADOS: Google Sheets (source of truth)
    ↓
BACKEND: Vercel Functions (APIs REST)
    ↓
FRONTEND: React (galeria + fluxo compra)
    ↓
PAGAMENTO: Mercado Pago API
    ↓
WEBHOOK: Vercel Function (validação HMAC)
    ↓
ENTREGA: Apps Script (enviar WhatsApp link)
    ↓
SAÍDA: Cliente recebe link Drive via wa.me
```

**Simples:** Fluxo linear, sem loops complexos

---

## ⚡ Otimizações para 1 Pessoa

### 1. Automação de Setup
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
→ Impede commit com bugs óbvios

### 3. CI/CD Automático
```yaml
# .github/workflows/deploy.yml
- Testes rodam automático
- Deploy para Vercel se tudo passar
- Notifica se algo quebrar
```

### 4. Documentação Inline
```javascript
// Comentários curtos, JSDoc para funções
// NÃO escreva novelas de código
```

### 5. Teste de Fumaça (Smoke Tests)
```javascript
// Teste rápido: sistema online?
test("GET /api/fotos returns 200", async () => {
  const res = await fetch("http://localhost:3001/api/fotos");
  expect(res.status).toBe(200);
});
```

---

## 🚫 O que NUNCA fazer (mesmo que pedir)

- ❌ Refatorar "para ficar bonito" (deixa para V2.0)
- ❌ Adicionar features que não estão no MVP
- ❌ Usar dependências "porque é cool"
- ❌ Otimizar performance antes de ter problema (profile first)
- ❌ Escrever code que "poderia ser reutilizado" (YAGNI)
- ❌ Criar abstrações "para o futuro" (3 linhas iguais = OK, refatora depois)

---

## ✅ Checklist: Decisões Confirmadas

- [x] TypeScript: **NÃO** (JavaScript + JSDoc)
- [x] Redux: **NÃO** (Context API)
- [x] Docker: **NÃO** (Vercel + Apps Script)
- [x] Database: **Google Sheets** (não Firestore)
- [x] WhatsApp: **Link wa.me** (não Evolution)
- [x] Backend: **REST simples** (não GraphQL)
- [x] Frontend: **React + Vite** (rápido)
- [x] Testes: **Jest 70%** (não 80%)

---

## 📖 Próximas Leituras

1. **CODE_STANDARDS.md** - Padrões específicos (lint, format, naming)
2. **ROADMAP_SOLO.md** - Semana a semana
3. **LEARNING_PATH.md** - Se precisa ramp-up técnico
