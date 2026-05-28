# Setup e Ambiente

## Pré-Requisitos

- Node.js LTS.
- npm.
- Conta Google Cloud com Sheets/Drive APIs.
- Google Spreadsheet compartilhado com service account.
- Projeto Mercado Pago com credenciais sandbox/produção.
- Projeto Vercel.
- clasp para deploy Apps Script, usado via `npx`.

## Instalação Local

```bash
git clone <repo>
cd Drive

cd frontend
npm install

cd ../backend
npm install

cd ../google-apps-script
npm install
```

## Desenvolvimento Local

Terminal 1:

```bash
cd frontend
npm run dev
```

Terminal 2:

```bash
cd backend
npm run dev
```

Validação:

```bash
curl http://localhost:3001/api/health
```

## Variáveis Frontend

Arquivo local sugerido: `frontend/.env.local`.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Opcional em produção integrada | Base da API; em local normalmente `http://localhost:3001` |

## Variáveis Backend

Arquivo local sugerido: `backend/.env`.

| Variável | Obrigatória | Uso |
| --- | --- | --- |
| `PORT` | Não | Porta local, padrão `3001` |
| `FRONTEND_URL` | Sim local/CORS | Origem permitida |
| `PUBLIC_APP_URL` | Sim produção | URLs de retorno/download |
| `SPREADSHEET_ID` | Sim | Google Spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Sim | Service account |
| `GOOGLE_PRIVATE_KEY` | Sim se sem B64 | Chave privada multiline |
| `GOOGLE_PRIVATE_KEY_B64` | Alternativa | Chave privada em Base64 |
| `MP_ACCESS_TOKEN` | Sim | Mercado Pago |
| `MP_WEBHOOK_SECRET` | Sim | HMAC webhook |
| `MP_USE_SANDBOX` | Não | Indica ambiente sandbox |
| `GALLERY_SESSION_SECRET` | Sim | Tokens de galeria |
| `GALLERY_CODE_SALT` | Sim | Hash de código |
| `DOWNLOAD_JWT_SECRET` | Sim | Links de download |
| `FORENSIC_WATERMARK_SECRET` | Sim producao | HMAC do fingerprint forense por pedido/download |
| `MEDIA_TOKEN_SECRET` | Opcional | Assinatura dedicada de tokens temporarios de preview; se ausente usa segredo de galeria/download |
| `WATERMARK_API_SECRET` | Sim | Endpoints de processamento |
| `CACHE_INVALIDATION_SECRET` | Sim | Invalidação de cache |
| `SMTP_HOST` | Opcional | Entrega por e-mail |
| `SMTP_PORT` | Opcional | Entrega por e-mail |
| `SMTP_SECURE` | Opcional | TLS SMTP |
| `SMTP_USER` | Opcional | Usuário SMTP |
| `SMTP_APP_PASSWORD` | Opcional | Senha/app password |
| `SMTP_FROM_NAME` | Opcional | Remetente |
| `SMTP_REPLY_TO` | Opcional | Reply-to |

## Propriedades Apps Script

Configure em Script Properties:

| Propriedade | Uso |
| --- | --- |
| `SOURCE_FOLDER_ID` | Pasta de entrada |
| `ORIGINAIS_FOLDER_ID` | Pasta de originais |
| `AMOSTRAS_FOLDER_ID` | Pasta de previews |
| `THUMBNAILS_FOLDER_ID` | Pasta de thumbnails |
| `SPREADSHEET_ID` | Planilha operacional |
| `BACKEND_URL` | URL pública do backend |
| `WATERMARK_API_SECRET` | Segredo compartilhado com backend |
| `CACHE_INVALIDATION_SECRET` | Segredo para limpar cache |
| `ADMIN_EMAIL` | Alertas operacionais |

## Scripts Disponíveis

Frontend:

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run test:coverage
```

Backend:

```bash
npm run dev
npm start
npm run lint
npm test
npm run test:coverage
```

Apps Script:

```bash
npm test
npm run test:coverage
npm run validate:release
npm run push:production
```

## Build

```bash
cd frontend
npm run build
```

O backend não tem etapa de build; Vercel empacota `backend/api/index.js` com `@vercel/node`.

## Produção

1. Configure variáveis no painel Vercel.
2. Configure Google service account e compartilhe a planilha.
3. Configure webhook Mercado Pago apontando para `/api/webhook/mercado-pago`.
4. Configure propriedades Apps Script.
5. Faça deploy Vercel.
6. Publique Apps Script.
7. Teste fluxo sandbox completo.

## Docker

Não há Docker oficial no projeto atual. Não adicione Docker ao MVP sem justificativa operacional, porque a estratégia definida é Vercel + Apps Script.

## CI/CD

O CI/CD formal não está documentado como pipeline no repositório atual. O fluxo real é:

```text
Alteração local
  -> npm test por pacote alterado
  -> git commit
  -> git push
  -> Vercel auto-deploy
  -> clasp push separado para Apps Script
```

Recomendação futura: adicionar GitHub Actions para `frontend npm test`, `backend npm test` e `google-apps-script npm test`.

## Segurança de Ambiente

- Nunca commite `.env`, `.env.local`, JSON de service account ou tokens.
- Ao imprimir `.env`, masque valores.
- Use credenciais sandbox para testes.
- Rotacione segredos se aparecerem em logs.

## Checklist de Setup

- `GET /api/health` responde.
- `GET /api/eventos` responde sem crash.
- Frontend carrega home.
- Planilha tem abas esperadas.
- Apps Script consegue ler pastas.
- Mercado Pago sandbox cria preferência.
- Webhook sandbox chega e valida assinatura.
- Download de pedido aprovado funciona em ambiente de teste.
