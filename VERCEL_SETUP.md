# 🚀 Vercel Setup - Passo-a-Passo

**Repositório GitHub:** https://github.com/MurilloRoseno/pascom-drive

---

## Passo 1: Acessar Vercel

1. Vá para https://vercel.com
2. Faça login com sua conta GitHub (ou crie uma)
3. No dashboard, clique em **"Add New..."** → **"Project"**

---

## Passo 2: Importar Repositório GitHub

1. Selecione **"Import Git Repository"**
2. Procure por **`pascom-drive`**
3. Clique em **"Import"**

---

## Passo 3: Configurar Projeto

Na tela de configuração:

1. **Project Name:** `pascom-drive` (ou escolha outro nome)
2. **Framework Preset:** `Other` (ou `Node.js`)
3. **Root Directory:** deixe em branco (monorepo no root)
4. **Build Command:** deixe em branco
5. **Output Directory:** deixe em branco

---

## Passo 4: Variáveis de Ambiente (CRÍTICO)

Na seção **"Environment Variables"**, adicione **todas** estas variáveis:

### Variáveis de Desenvolvimento (staging)
```
SPREADSHEET_ID              = <seu-sheet-id-dev>
GOOGLE_SERVICE_ACCOUNT_EMAIL = <seu-service-account-email>
GOOGLE_PRIVATE_KEY          = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
SOURCE_FOLDER_ID            = <seu-source-folder-id>
ORIGINAIS_FOLDER_ID         = <seu-originais-folder-id>
AMOSTRAS_FOLDER_ID          = <seu-amostras-folder-id>
ADMIN_EMAIL                 = murillo.roseno.lima@gmail.com
MP_ACCESS_TOKEN             = TEST-<seu-token-sandbox-mp>
MP_WEBHOOK_SECRET           = <seu-webhook-secret-mp>
DOWNLOAD_JWT_SECRET        = <segredo-aleatorio-longo>
GALLERY_SESSION_SECRET     = <segredo-aleatorio-longo-diferente>
GALLERY_CODE_SALT          = <salt-aleatorio-longo>
SMTP_HOST                  = smtp.gmail.com
SMTP_PORT                  = 465
SMTP_SECURE                = true
SMTP_USER                  = murillo.roseno.lima@gmail.com
SMTP_APP_PASSWORD          = <senha-de-app-do-gmail-sem-espacos>
SMTP_FROM_NAME             = Paroquia Sao Rafael - Fotos
SMTP_REPLY_TO              = murillo.roseno.lima@gmail.com
PUBLIC_APP_URL             = https://pascom-drive.vercel.app
FRONTEND_URL                = http://localhost:3000
NODE_ENV                    = development
```

**Como obter cada variável:**

| Variável | Onde encontrar |
|----------|---|
| `SPREADSHEET_ID` | Google Sheet URL: `.../d/{AQUI}/edit` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Arquivo JSON: `"client_email": "..." ` |
| `GOOGLE_PRIVATE_KEY` | Arquivo JSON: `"private_key": "..."`  (com `\n` literal entre linhas) |
| `SOURCE_FOLDER_ID` | Google Drive: URL da pasta `/drive/folders/{AQUI}` |
| `ORIGINAIS_FOLDER_ID` | Google Drive: idem |
| `AMOSTRAS_FOLDER_ID` | Google Drive: idem |
| `MP_ACCESS_TOKEN` | Mercado Pago: Conta → Credenciais → Access Token (sandbox) |
| `MP_WEBHOOK_SECRET` | Mercado Pago: Webhooks → seu webhook |
| `DOWNLOAD_JWT_SECRET` | Segredo privado para links temporários de entrega |
| `GALLERY_SESSION_SECRET` | Segredo privado para sessões de galerias protegidas |
| `GALLERY_CODE_SALT` | Salt privado compartilhado com Apps Script para hash dos códigos |
| `SMTP_APP_PASSWORD` | Google: senha de app da conta Gmail usada apenas para entrega SMTP; cadastre como segredo no Vercel |

---

## Passo 5: Deploy

1. Clique em **"Deploy"**
2. Aguarde o build terminar (~5 min)
3. Quando verde ✅, clique em **"Visit"** para testar

**URL será algo como:** `https://pascom-drive.vercel.app`

---

## Passo 6: Testar Backend

```bash
curl https://pascom-drive.vercel.app/api/health
```

Deve retornar:
```json
{ "status": "ok" }
```

---

## Passo 7: Registrar Webhook Mercado Pago

No dashboard Mercado Pago:

1. Vá para **Integrações** → **Webhooks**
2. Adicione novo webhook:
   - **URL:** `https://pascom-drive.vercel.app/api/webhook/mercado-pago`
   - **Eventos:** `payment.updated`
3. Salve o **Secret** e configure em `MP_WEBHOOK_SECRET` no Vercel

---

## Passo 8: Setup Google Apps Script (Production)

No Google Apps Script editor:

1. Vá para **Project Settings** (⚙️)
2. Na seção **Script Properties**, adicione:

| Property | Value |
|----------|-------|
| `SPREADSHEET_ID` | `<seu-sheet-id-prod>` |
| `SOURCE_FOLDER_ID` | `<seu-source-folder-id-prod>` |
| `ORIGINAIS_FOLDER_ID` | `<seu-originais-folder-id-prod>` |
| `AMOSTRAS_FOLDER_ID` | `<seu-amostras-folder-id-prod>` |
| `ADMIN_EMAIL` | `murillo.roseno.lima@gmail.com` |
| `GALLERY_CODE_SALT` | `<mesmo-salt-privado-configurado-no-backend>` |

3. Volte ao editor e execute `inicializarEstrutura()` uma vez para criar/migrar as abas seguras
4. Execute `criarTriggers()` uma única vez

---

## Passo 9: Configurar Frontend CORS

Se estiver usando frontend localmente, configure `VITE_API_BASE_URL`:

```bash
# .env.local (frontend)
VITE_API_BASE_URL=https://pascom-drive.vercel.app
```

---

## ✅ Checklist Final

- [ ] Repositório criado em GitHub
- [ ] Vercel project criado e conectado
- [ ] Todas as env vars configuradas no Vercel
- [ ] Deploy completou com sucesso (✅ green)
- [ ] `GET /api/health` retorna 200 OK
- [ ] Webhook Mercado Pago registrado
- [ ] Google Apps Script Properties setadas
- [ ] `criarTriggers()` rodou uma vez

---

## 🐛 Se der erro

**Erro: "Cannot find module 'google-spreadsheet'"**
→ Vercel node_modules não instalou. Verifique `backend/package.json` tem dependency.

**Erro: "Invalid Google credentials"**
→ `GOOGLE_PRIVATE_KEY` incorreto. Copie literal do arquivo JSON (com `\n` mesmo).

**Erro: "Webhook signature invalid"**
→ `MP_WEBHOOK_SECRET` incorreto. Verifique no Mercado Pago.

**Erro: "CORS blocked"**
→ Configure `FRONTEND_URL` correto no `.env` do backend.

---

## 📞 Próximos Passos

1. ✅ Vercel setup
2. ⬜ Phase 4: Frontend-Backend Integração
3. ⬜ Phase 5: Testes Completos
4. ⬜ Phase 6: Deploy Produção

---

**Docs:**
- [Vercel Docs](https://vercel.com/docs)
- [Google Apps Script Docs](https://developers.google.com/apps-script)
- [Mercado Pago API](https://www.mercadopago.com.br/developers/es/reference)
