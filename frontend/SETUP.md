# Frontend - Setup e Configuracao

Guia para rodar o frontend localmente e publicar no Vercel sem depender de configuracao implícita.

---

## Pre-requisitos

- Node.js 20+
- npm 10+
- Backend rodando em `:3001` para desenvolvimento local

---

## Instalacao local

```bash
cd frontend
npm install
```

---

## Variaveis de ambiente

### Frontend

| Variavel | Obrigatoria em producao? | Onde colocar | Exemplo |
|---|---|---|---|
| `VITE_API_BASE_URL` | Sim, se frontend e backend nao compartilham a mesma origem | `.env.local` no dev e Vercel Environment Variables em producao | `https://pascom-drive.vercel.app` |

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Se o backend estiver local:

```bash
VITE_API_BASE_URL=http://localhost:3001
```

Se frontend e backend estiverem no mesmo projeto Vercel, a variavel pode ficar vazia para usar mesma origem.

> Variaveis do Vite sao lidas em build time. Trocar `VITE_API_BASE_URL` exige novo build ou redeploy.

### Nao coloque no frontend

Estas variaveis pertencem ao backend ou ao Apps Script:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `WHATSAPP_NUMBER`
- `SHEET_ID`
- `SOURCE_FOLDER_ID`
- `ORIGINAIS_FOLDER_ID`
- `AMOSTRAS_FOLDER_ID`

Detalhes completos estao em [SETUP_INSTRUCTIONS.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/SETUP_INSTRUCTIONS.md) e [VERCEL_SETUP.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/VERCEL_SETUP.md).

---

## Como rodar

```bash
npm run dev
npm run build
npm run preview
npm test
npm run test:watch
npm run test:coverage
npm run lint
```

- `npm run dev`: sobe em `http://localhost:3000`
- Proxy local: `/api/* -> http://localhost:3001`

---

## Deploy no Vercel

1. Importe o repositorio no Vercel.
2. Configure:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Defina `VITE_API_BASE_URL` apontando para o backend publicado.
4. Faça push na branch monitorada pelo projeto.

---

## Pegadinhas conhecidas

- `src/lib/api.js` usa `import.meta.env.VITE_API_BASE_URL`, nao `process.env`.
- Os testes Jest continuam mockando `process.env.VITE_API_BASE_URL`; se mudar a estrategia de leitura, ajuste os mocks.
- `.env.local` nao deve ser commitado.
- O proxy do `vite.config.js` so vale em `npm run dev`.

---

## Referencias

- [INSTALL_ME.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/INSTALL_ME.md)
- [SETUP_INSTRUCTIONS.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/SETUP_INSTRUCTIONS.md)
- [VERCEL_SETUP.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/VERCEL_SETUP.md)
- [ARCHITECTURE_SINGLE_PERSON.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/ARCHITECTURE_SINGLE_PERSON.md)
- [DESIGN_SYSTEM.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/frontend/DESIGN_SYSTEM.md)
