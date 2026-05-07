# Frontend — Setup e Configuração

Guia completo para rodar o frontend localmente e fazer deploy no Vercel.

---

## Pré-requisitos

- Node.js 20+
- npm 10+
- Backend rodando localmente em `:3001` (para dev) — veja [`../backend/README.md`](../INSTALL_ME.md)

---

## Instalação local

```bash
cd frontend
npm install
```

---

## Variáveis de ambiente

### Frontend (apenas uma variável)

| Variável | Obrigatória em prod? | Onde colocar | Como obter | Exemplo |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | Sim | `.env.local` (dev) · Vercel Settings (prod) | **Dev:** `http://localhost:3001` · **Prod:** URL do projeto no Vercel Dashboard → Project → Settings → Domains → copiar `*.vercel.app`. Se frontend e backend forem o mesmo projeto Vercel, pode deixar vazio (mesma origem). | `https://pascom-drive.vercel.app` |

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
# edite .env.local conforme necessário
```

> **Atenção:** Variáveis Vite são **build-time**, não runtime. Trocar `VITE_API_BASE_URL` exige um novo build/redeploy.

---

### Variáveis que NÃO pertencem ao frontend

Nunca coloque estas no `.env.local` ou no Vercel do projeto frontend — elas ficam no **backend** (Vercel Functions) ou no **Apps Script** (Script Properties):

| Variável | Onde fica | Como obter |
|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | Backend · Vercel env | [Mercado Pago Dashboard](https://www.mercadopago.com.br/developers) → Suas integrações → Credenciais |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Backend · Vercel env | Mercado Pago Dashboard → Webhooks → Assinatura secreta |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Backend · Vercel env | [Google Cloud Console](https://console.cloud.google.com) → IAM → Service Accounts → Keys → JSON |
| `WHATSAPP_NUMBER` | Backend · Vercel env | Número da paróquia (ex: `5511999999999`) |
| `SHEET_ID` | Apps Script · Script Properties | ID da planilha Google Sheets (da URL) |
| `SOURCE_FOLDER_ID` | Apps Script · Script Properties | ID da pasta "Fotos Recebidas" no Drive |
| `ORIGINAIS_FOLDER_ID` | Apps Script · Script Properties | ID da pasta "Originais" no Drive |
| `AMOSTRAS_FOLDER_ID` | Apps Script · Script Properties | ID da pasta "Processadas Amostras" no Drive |

Detalhes completos em [`SETUP_INSTRUCTIONS.md`](../SETUP_INSTRUCTIONS.md) e [`VERCEL_SETUP.md`](../VERCEL_SETUP.md).

---

## Como rodar

```bash
# Servidor de desenvolvimento (http://localhost:3000)
# Proxy: /api/* → http://localhost:3001
npm run dev

# Build de produção → gera dist/
npm run build

# Servir o build local (para testar antes do deploy)
npm run preview

# Testes
npm test
npm run test:watch
npm run test:coverage

# Lint
npm run lint
```

---

## Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e conecte o repositório
2. Configure o projeto:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Adicione a variável de ambiente:
   - Settings → Environment Variables
   - Nome: `VITE_API_BASE_URL`
   - Valor: URL do backend Vercel (ex: `https://pascom-drive.vercel.app`)
   - Escopo: Production + Preview
4. Push em `master` → Vercel redeploy automático

---

## Pegadinhas conhecidas

- **`process.env` vs `import.meta.env`:** O código em `src/lib/api.js` usa `process.env.VITE_API_BASE_URL`. O Vite injeta `process.env.VITE_*` no bundle em build-time, então funciona. Se migrar para `import.meta.env`, atualizar os mocks nos testes Jest.
- **`.env.local` não é commitado** — já está no `.gitignore`. Use `.env.example` como referência.
- **Trocar URL do backend = rebuild** — env vars Vite são embutidas no JS na hora do build, não lidas em runtime.
- **Proxy de dev** (`vite.config.js`) só funciona em `npm run dev`. Em preview/produção, o frontend chama `VITE_API_BASE_URL` diretamente.

---

## Referências

- [`INSTALL_ME.md`](../INSTALL_ME.md) — setup completo do projeto
- [`SETUP_INSTRUCTIONS.md`](../SETUP_INSTRUCTIONS.md) — credenciais Google, Mercado Pago
- [`VERCEL_SETUP.md`](../VERCEL_SETUP.md) — deploy e variáveis do backend
- [`ARCHITECTURE_SINGLE_PERSON.md`](../ARCHITECTURE_SINGLE_PERSON.md) — decisões de arquitetura
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — componentes e tokens visuais do frontend
