# Deploy Guide

Guia de deploy real do Pascom Drive. Este repositorio tem `frontend/` e `backend/`, ambos usados em producao.

---

## Estrutura publicada

- `frontend/`: React + Vite
- `backend/`: Express usado como Vercel Functions
- `google-apps-script/`: automacao separada do deploy Vercel

---

## Deploy do frontend

1. Importe o repositorio no Vercel.
2. Crie ou ajuste um projeto com:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Configure `VITE_API_BASE_URL`.
   - Use a URL publica do backend se estiver em projeto separado.
   - Deixe vazio apenas se o frontend for servido pela mesma origem do backend.

---

## Deploy do backend

1. Crie ou ajuste um projeto Vercel apontando para a raiz do repositorio ou para `backend/`, conforme o setup atual do time.
2. Garanta que as variaveis abaixo existam:
   - `MERCADO_PAGO_ACCESS_TOKEN`
   - `MERCADO_PAGO_WEBHOOK_SECRET`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `FRONTEND_URL`
3. Confirme que os endpoints esperados respondem:
   - `GET /api/health`
   - `GET /api/eventos`
   - `POST /api/checkout/quote`
   - `POST /api/checkout/preference`
   - `GET /api/status-pagamento`

---

## Checklist de validacao

- `frontend`: `npm run lint`, `npm test`, `npm run build`
- `backend`: `npm run lint`, `npm test`
- `google-apps-script`: `npm test`
- Testar fluxo real de galeria protegida
- Testar cotacao e criacao de pagamento no sandbox do Mercado Pago
- Confirmar webhook chegando e atualizando pedido

---

## O que nao fazer

- Esta repo contem apenas o produto Pascom Drive
- Nao publicar frontend sem `VITE_API_BASE_URL` coerente
- Nao expor mensagens internas de erro em producao
- Nao commitar arquivos `.env`

---

## Referencias

- [INSTALL_ME.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/INSTALL_ME.md)
- [SETUP_INSTRUCTIONS.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/SETUP_INSTRUCTIONS.md)
- [VERCEL_SETUP.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/VERCEL_SETUP.md)
- [frontend/SETUP.md](/C:/Users/muril/OneDrive/Documentos/claude/Pessoal/Pascom/Drive/frontend/SETUP.md)
