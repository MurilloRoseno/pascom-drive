# INSTALL_ME.md - Setup Completo em 30 Minutos

**Tempo estimado:** 30 minutos
**Pré-requisitos:** Node.js 18+, Git, conta Google, conta Vercel

---

## 🚀 OPÇÃO 1: Setup Automático (RECOMENDADO)

### Passo 1: Clone e rode o script
```bash
git clone https://github.com/seu-user/paroquia-fotos-venda.git
cd paroquia-fotos-venda
chmod +x scripts/setup.sh
./scripts/setup.sh
```

O script automático faz:
- ✅ Cria `.env.local` com valores fake
- ✅ Instala dependências (`npm install`)
- ✅ Configura ESLint + Prettier
- ✅ Cria database local (se necessário)
- ✅ Roda hello-world tests
- ✅ Mostra próximos passos

### Passo 2: Inicia o desenvolvimento
```bash
npm run dev
```

Acesse:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

## 🛠️ OPÇÃO 2: Setup Manual (Se script falhar)

### 1. Clone o repositório
```bash
git clone https://github.com/seu-user/paroquia-fotos-venda.git
cd paroquia-fotos-venda
```

### 2. Instale dependências
```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd google-apps-script && npm install && cd ..
```

### 3. Crie arquivo `.env.local`
```bash
# Frontend
VITE_API_URL=http://localhost:3001

# Backend
MERCADO_PAGO_ACCESS_TOKEN=TEST_1234567890
GOOGLE_DRIVE_API_KEY=AIza_fake_key_test
GOOGLE_SHEETS_ID=fake-sheet-id
ENCRYPTION_KEY=fake-encryption-key-32-bytes
WEBHOOK_SECRET=fake-webhook-secret
NODE_ENV=development
```

### 4. Inicie o servidor dev
```bash
# Terminal 1: Frontend
cd frontend
npm run dev
# Acessa: http://localhost:3000

# Terminal 2: Backend
cd backend
npm run dev
# Acessa: http://localhost:3001

# Terminal 3 (opcional): Google Apps Script local
cd google-apps-script
npm run watch
```

### 5. Rode testes
```bash
npm test
```

---

## 🔑 Próximo: Configurar Credenciais Reais

Depois do setup inicial, leia `SETUP_INSTRUCTIONS.md` para:
- Google Cloud (criar projeto, gerar credenciais)
- Vercel (conectar GitHub)
- Mercado Pago (tokens sandbox/produção)

---

## ❌ Se algo der errado

### Erro: "npm: command not found"
→ Instale Node.js: https://nodejs.org/ (v18+)

### Erro: "Cannot find module 'xxx'"
→ Rode: `npm install` novamente

### Erro: "Port 3000 já em uso"
→ Mude em `package.json`: `"dev": "vite --port 3001"`

### Erro: "MERCADO_PAGO_ACCESS_TOKEN não definido"
→ Verifique `.env.local` (deve existir e ter valores)

### Erro: "Google Sheets API error"
→ Isso é OK em dev! Sheets vai falhar até você configurar credenciais reais

### Erro: ".env.local não encontrado"
→ Crie manualmente com valores fake (ver Passo 3 acima)

---

## ✅ Como saber se deu certo?

### Frontend rodando:
```
VITE v4.4.9  ready in 234 ms

➜  Local:   http://localhost:3000/
➜  press h to show help
```

### Backend rodando:
```
Server running on http://localhost:3001
```

### Testes passando:
```
PASS  __tests__/unit/calculos.test.js
  ✓ calcularSubtotal (12ms)
  ✓ calcularTaxa (2ms)
  ✓ validarWhatsApp (1ms)

Test Suites: 1 passed, 1 total
Tests: 3 passed, 3 total
```

---

## 📚 Próximas Leituras

1. **LEARNING_PATH.md** - Se não conhece React/Node/Apps Script
2. **CODE_STANDARDS.md** - Padrões do projeto
3. **ROADMAP_SOLO.md** - O que implementar primeira semana

---

## 🆘 Suporte

Se ficar preso:
1. Verifique `.env.local` (credenciais)
2. Rode `npm install` novamente
3. Limpe cache: `rm -rf node_modules package-lock.json && npm install`
4. Procure no arquivo `TROUBLESHOOTING.md`
