# SETUP_INSTRUCTIONS.md - Configurar Credenciais Reais

**Tempo:** ~30 minutos
**Pré-requisito:** Ter feito INSTALL_ME.md

---

## 1️⃣ GOOGLE CLOUD PROJECT

### Passo 1: Criar projeto
1. Vá para https://console.cloud.google.com/
2. Login com conta Google (crie uma se necessário)
3. Crie novo projeto: "paroquia-fotos-venda"
4. Aguarde criação (~30s)

### Passo 2: Ativar APIs
1. Search "Google Sheets API" → Enable
2. Search "Google Drive API" → Enable
3. Search "Google Apps Script API" → Enable

### Passo 3: Criar Credenciais de Serviço
1. Ir para "Credentials" (menu esquerdo)
2. "Create Credentials" → "Service Account"
3. Nome: "paroquia-fotos-backend"
4. Clique em serviço criado
5. Aba "Keys" → "Add Key" → JSON
6. Download `paroquia-fotos-backend-key.json`
7. Salvar em: `backend/config/google-key.json` (**NÃO commitar**)

### Passo 4: Compartilhar Google Sheet com serviço
1. Crie novo Google Sheet em drive.google.com
2. Nome: "Fotos - Paróquia (Desenvolvimento)"
3. Copie ID da sheet (URL contém: `spreadsheetId=XXXXX`)
4. Salve ID em `.env.local`:
   ```
   GOOGLE_SHEETS_ID=XXXXX
   ```
5. Compartilhe sheet com email do serviço:
   - Email: `paroquia-fotos-backend@paroquia-fotos-venda.iam.gserviceaccount.com`
   - Permissão: Editor

### Passo 5: Testar conexão
```bash
cd backend
npm test -- google-sheets.test.js
# Deve passar (conseguiu conectar ao Sheet)
```

---

## 2️⃣ MERCADO PAGO (SANDBOX)

### Passo 1: Criar conta
1. Vá para https://www.mercadopago.com.br/
2. "Criar conta" → email pessoal
3. Verificar email
4. Complete perfil (nome, CPF, etc)

### Passo 2: Acessar credentials de teste
1. Login no Mercado Pago
2. "Configurações" → "Credenciais" (ou Settings)
3. Copie tokens **SANDBOX** (NOT produção):
   - **Access Token:** `TEST_1234567890abcdef...`
   - **Client ID:** `1234567890`
4. Coloque em `.env.local`:
   ```
   MERCADO_PAGO_ACCESS_TOKEN=TEST_...
   MERCADO_PAGO_CLIENT_ID=1234567890
   ```

### Passo 3: Webhook (sandbox)
1. MP Settings → Webhooks
2. URL: `http://localhost:3001/webhook/mercado-pago` (dev)
   Ou: `https://seu-dominio.vercel.app/webhook/mercado-pago` (prod depois)
3. Eventos: `payment.created`, `payment.updated`
4. Copie **Webhook Secret:**
   ```
   MERCADO_PAGO_WEBHOOK_SECRET=xxx...
   ```

### Passo 4: Testar Pix
1. Crie novo Pix no seu account teste (adicione uma conta real)
2. Tente pagamento pequeno em sandbox
3. Verifique que webhook foi recebido
4. Usaremos webhook.site para testar antes

---

## 3️⃣ VERCEL (HOSTING BACKEND)

### Passo 1: Criar conta
1. Vá para https://vercel.com/
2. "Sign Up" com GitHub (ou email)
3. Autorize Vercel acessar repositório

### Passo 2: Importar projeto
1. "Add New..." → "Project"
2. Selecione repositório GitHub `paroquia-fotos-venda`
3. Configurações:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Output Directory:** não muda (Vercel Functions)

### Passo 3: Environment Variables (Secrets)
1. Project Settings → Environment Variables
2. Adicione cada secret (valores de `.env.local`):
   ```
   MERCADO_PAGO_ACCESS_TOKEN = TEST_...
   MERCADO_PAGO_WEBHOOK_SECRET = xxx...
   GOOGLE_SHEETS_ID = XXXXX
   GOOGLE_DRIVE_API_KEY = AIza_...
   ENCRYPTION_KEY = xxx... (32 bytes aleatorios)
   NODE_ENV = production
   ```

### Passo 4: Deploy
1. Todo push em `main` = deploy automático
2. URL será: `https://seu-projeto.vercel.app/api/fotos`

### Passo 5: Testar Deploy
```bash
curl https://seu-projeto.vercel.app/api/fotos
# Deve retornar JSON de fotos (ou erro se sheet não conectou)
```

---

## 4️⃣ GITHUB REPOSITORY

### Passo 1: Criar repositório
```bash
# Se ainda não existe
git init
git remote add origin https://github.com/seu-user/paroquia-fotos-venda.git
git branch -M main
git add .
git commit -m "Initial commit: MVP setup"
git push -u origin main
```

### Passo 2: Configurar `.gitignore`
```bash
# Arquivo: .gitignore
.env.local
.env.production.local
node_modules/
backend/config/google-key.json
dist/
.DS_Store
```

### Passo 3: Proteger secrets
- NÃO faça commit de `.env.local`
- NÃO faça commit de `google-key.json`
- Tudo via Vercel secrets ou `.env.production` (only in CI/CD)

### Passo 4: GitHub Secrets (para CI/CD depois)
1. Settings → Secrets and variables
2. Environment secrets (usaremos mais tarde)

---

## 5️⃣ AMBIENTE LOCAL (.env.local)

### Criar arquivo
```bash
# File: .env.local (no root, NÃO commitar)

# Frontend
VITE_API_URL=http://localhost:3001

# Backend
MERCADO_PAGO_ACCESS_TOKEN=TEST_1234567890abcdef
MERCADO_PAGO_CLIENT_ID=1234567890
MERCADO_PAGO_WEBHOOK_SECRET=fake_secret_123
GOOGLE_SHEETS_ID=1a2b3c4d5e6f7g8h9i10
GOOGLE_DRIVE_API_KEY=AIza_fakeKeyForDev123
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
NODE_ENV=development
```

**⚠️ NUNCA commitar isso!**

---

## 6️⃣ TESTAR TUDO

### Teste 1: Backend local
```bash
cd backend
npm run dev
# Acesse: http://localhost:3001/api/fotos
# Deve retornar: [{ id: "FOTO_001", evento: "Missa", ... }]
```

### Teste 2: Frontend local
```bash
cd frontend
npm run dev
# Acesse: http://localhost:3000
# Deve carregar galeria com fotos
```

### Teste 3: Google Sheets
```bash
# Verifique que Sheet tem estrutura:
# | ID | Evento | Foto Original | Foto Amostra | WhatsApp | Status | ...
```

### Teste 4: Mercado Pago Webhook
```bash
# Use webhook.site para testar:
# 1. Vá para https://webhook.site/
# 2. Copie URL única
# 3. Adicione em MP settings temporariamente
# 4. Teste pagamento
# 5. Veja se webhook foi recebido em webhook.site
```

### Teste 5: Vercel Deploy
```bash
# Após push para GitHub:
# Vercel deploy automático
# Acesse: https://seu-projeto.vercel.app/api/fotos
```

---

## ✅ Checklist: Pronto?

- [ ] Google Cloud project criado
- [ ] APIs ativadas (Sheets, Drive, Apps Script)
- [ ] Credenciais de serviço baixadas
- [ ] Google Sheet compartilhado com serviço
- [ ] `.env.local` criado com credenciais
- [ ] Mercado Pago sandbox tokens em `.env.local`
- [ ] Webhook secret configurado
- [ ] Vercel project criado e conectado
- [ ] Secrets adicionados no Vercel
- [ ] Backend roda local: http://localhost:3001/api/fotos ✓
- [ ] Frontend roda local: http://localhost:3000 ✓
- [ ] Google Sheets conecta sem erro
- [ ] GitHub repo criado e `.gitignore` correto

**Se todas ✓:** Você está pronto para começar! Vá para ROADMAP_SOLO.md

---

## 🆘 Problemas Comuns

### "ENOENT: no such file or directory, open '.../google-key.json'"
→ Você não baixou credenciais do Google Cloud
→ Solução: Passo 1.3 acima

### "Cannot read property 'gserviceaccount' of undefined"
→ Google Sheet não foi compartilhado com serviço
→ Solução: Passo 1.4, verifique email do serviço

### "Invalid access token" (Mercado Pago)
→ Token sandbox usado em produção ou vice-versa
→ Solução: Use TEST_ prefix para sandbox

### "Webhook not received"
→ URL webhook errada em MP settings
→ Solução: Use https://webhook.site para debug

### "Port 3001 already in use"
→ Outro processo usando porta
→ Solução: `lsof -i :3001` (Mac/Linux) ou find em Task Manager (Windows)

---

## 📖 Próximas Etapas

1. ✅ Setup completo
2. 📝 Ler CODE_STANDARDS.md (padrões)
3. 🛣️ Seguir ROADMAP_SOLO.md (implementação)
