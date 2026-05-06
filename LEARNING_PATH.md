# LEARNING_PATH.md - Ramp-up Técnico (Se Necessário)

**Objetivo:** Guia de aprendizado para tecnologias principais
**Tempo Total:** ~20-30 horas (se começar do zero)
**Começar por:** React (mais importante para frontend)

---

## 📊 Avaliação Rápida: Você já conhece?

### Experiência Necessária
```
☐ JavaScript ES6+ (spread, destructuring, async/await)
☐ React (components, hooks, useState, useEffect, Context)
☐ Node.js (express, rest API, middleware)
☐ Google Apps Script (Drive API, Sheets API)
☐ SQL / Database concepts (Google Sheets será nosso DB)
```

### Se você marcou <3 checkboxes:
→ Comece com **REACT** (8h) + **NODE.JS** (6h)

### Se você marcou 3-4:
→ Comece direto com **GOOGLE APPS SCRIPT** (4h)

### Se marcou todas:
→ Pode começar coding agora! Vá para ROADMAP_SOLO.md

---

## 🎯 PARTE 1: React (8 horas)

**Por que React?** Frontend é 40% do projeto, você vai passar semanas aqui.

### 1.1 Conceitos Básicos (2h)
- **O que é React?** - Library para UI com componentes reutilizáveis
- **Components:** Blocos de construção (FotoCard, Header, Button)
- **JSX:** Sintaxe que parece HTML mas é JavaScript
- **Props:** Passar dados entre componentes

**Recursos:**
```
📺 Vídeo: "React in 100 Seconds" (Fireship) - 2 min
📚 Artigo: React Docs - "Thinking in React" - 15 min
📝 Prática: Criar 3 componentes simples (Card, Button, Input) - 1h
```

### 1.2 Hooks (3h) - **CRÍTICO**
- **useState:** Adicionar estado local (selectedPhotos, whatsapp)
- **useEffect:** Executar após render (fetch fotos, setup)
- **useContext:** Acessar estado global (carrinho)
- **Custom hooks:** useCarrinho(), useFotos() (você vai criar)

**Recursos:**
```
📺 Vídeo: "React Hooks Explained" (Scrimba) - 20 min
📚 Docs: React Hooks API - 30 min
📝 Prática: Recriar contador com useState (5 min)
📝 Prática: Fetch dados com useEffect + Loading state (30 min)
📝 Prática: Context API para carrinho de compras (1h)
```

### 1.3 Padrões Reais do Projeto (3h)
- **Forms:** React Hook Form + Zod (você vai usar para WhatsApp input)
- **HTTP Requests:** axios (fetch fotos, pagamento)
- **Rendering Lists:** map() para galeria de fotos
- **Conditional Rendering:** if/ternary para steps

**Recursos:**
```
📝 Prática: Criar form WhatsApp com validação Zod (1h)
📝 Prática: Galeria de fotos com fetch + loading + error (1h)
📝 Prática: Multi-step form (steps 1-4, navegação) (1h)
```

---

## 🎯 PARTE 2: Node.js / Express (6 horas)

**Por que Express?** Backend é 30% do projeto, precisas de APIs REST.

### 2.1 Conceitos Básicos (1h)
- **O que é Node.js?** - JavaScript server-side
- **Express:** Framework para REST APIs
- **Endpoints:** GET, POST, PUT, DELETE
- **Middleware:** Funções que rodam antes do endpoint (auth, cors, logs)

**Recursos:**
```
📺 Vídeo: "Express.js Crash Course" (Traversy) - 30 min
📚 Docs: Express Basics - 20 min
📝 Prática: Criar servidor "hello world" em Express (10 min)
```

### 2.2 REST APIs & Vercel Functions (2h) - **CRÍTICO**
- **GET /api/fotos** - retornar lista de fotos
- **POST /api/criar-pagamento** - validar, criar Pix
- **GET /api/status-pagamento** - polling
- **Validação:** Zod schemas (você vai usar)
- **Error Handling:** try-catch, return 500 status

**Recursos:**
```
📝 Prática: Criar GET /api/fotos que retorna JSON (30 min)
📝 Prática: Criar POST /api/criar-pagamento com Zod validation (1h)
📝 Prática: Error handling, logging (20 min)
```

### 2.3 Webhooks & Integração (2h)
- **Webhook:** URL que recebe POST de Mercado Pago
- **HMAC Validation:** Verificar se é Mercado Pago mesmo
- **Idempotência:** Não processar 2x
- **Call Google Sheets API:** Atualizar status

**Recursos:**
```
📝 Prática: Criar POST /webhook/mercado-pago (1h)
📝 Prática: Validar assinatura HMAC (30 min)
📝 Prática: Chamar Google Sheets API (30 min)
```

---

## 🎯 PARTE 3: Google Apps Script (4 horas)

**Por que Apps Script?** Automação é 20% do projeto, mas crítico.

### 3.1 Conceitos Básicos (1h)
- **O que é Apps Script?** - JavaScript rodando no Google Cloud
- **Drive API:** Listar, baixar, salvar arquivos
- **Sheets API:** Ler, escrever dados
- **Triggers:** Executar código em horários ou eventos

**Recursos:**
```
📚 Docs: Google Apps Script Intro - 30 min
📝 Prática: Hello World em Apps Script (online editor) - 15 min
📝 Prática: Listar arquivos do Drive (15 min)
```

### 3.2 Processamento de Fotos (2h) - **CRÍTICO**
- **Baixar arquivo:** `DriveApp.getFileById().getBlob()`
- **Aplicar marca:** UrlFetchApp + ImageMagick (ou local)
- **Salvar resultado:** Criar novo arquivo
- **Registrar metadata:** Adicionar linha em Google Sheet

**Recursos:**
```
📝 Prática: Baixar imagem do Drive, salvar cópia (30 min)
📝 Prática: Aplicar marca d'água (1h) - mais complexo, google Help
📝 Prática: Registrar em Google Sheets (30 min)
```

### 3.3 Triggers & Automação (1h)
- **Time-based trigger:** Executar a cada 5 minutos
- **onEdit trigger:** Executar quando sheet muda
- **Error Handling:** Enviar email se erro

**Recursos:**
```
📝 Prática: Criar trigger automático (15 min)
📝 Prática: Error handling com email (30 min)
📝 Prática: Test suite local com Jest (15 min)
```

---

## 🎯 PARTE 4: Complementares (6 horas)

### 4.1 Tailwind CSS (1h)
- Classes utility: `flex`, `text-center`, `bg-blue-500`
- Responsividade: `md:`, `lg:`, `sm:`
- Customização com Design System (cores roxo litúrgico, etc)

**Recursos:**
```
📺 Vídeo: "Tailwind in 100 Seconds" (Fireship) - 2 min
📝 Prática: Estilizar card de foto com Tailwind (30 min)
```

### 4.2 Jest (Testing) (2h)
- Unit tests: funções puras (calcularSubtotal, validarWhatsApp)
- Mocks: mockar Google Sheets, Mercado Pago
- Coverage: rodar com `--coverage`

**Recursos:**
```
📺 Vídeo: "Jest Testing Crash Course" - 30 min
📝 Prática: Escrever 3 testes unitários (1h)
```

### 4.3 Git & GitHub (1h)
- `git clone`, `git add`, `git commit`, `git push`
- Branch workflow: main, develop, feature branches
- Pull requests (você vai fazer quando pronto)

**Recursos:**
```
📺 Vídeo: "Git & GitHub for Beginners" - 30 min
📝 Prática: Clonar repo, fazer commit, push (30 min)
```

### 4.4 Vercel Deployment (1h)
- Conectar GitHub
- Set environment variables
- Deploy automático no push

**Recursos:**
```
📝 Prática: Deploy hello-world em Vercel (30 min)
```

---

## 🛣️ PLANO RECOMENDADO

### Se você é INICIANTE (0 de 5 skills):
```
Dia 1: React basics + hooks (8h)
Dia 2-3: React prática (FotoCard, galeria) (16h)
Dia 4: Node.js basics (4h)
Dia 5: Node.js APIs (4h)
Dia 6: Google Apps Script basics (4h)
Dia 7: Google Apps Script prática (4h)
Dia 8: Tailwind + Git + Vercel (4h)
─────────────────────────────
Total: ~44 horas (1+ semana em tempo integral)
```

**→ Comece HOJE. Depois vá para INSTALL_ME.md**

---

### Se você conhece JAVASCRIPT mas não React (3 de 5):
```
Dia 1-2: React basics + hooks (8h)
Dia 3: Node.js (4h)
Dia 4: Google Apps Script (4h)
─────────────────────────────
Total: ~20 horas (2-3 dias)
```

**→ Comece amanhã. Pode começar coding logo.**

---

### Se você é SÊNIOR (5 de 5):
```
Scan: ARCHITECTURE_SINGLE_PERSON.md (30 min)
Scan: ROADMAP_SOLO.md (30 min)
```

**→ Pode começar coding AGORA. Vá para INSTALL_ME.md**

---

## 📚 Recursos Externos (Curados)

### Video Tutorials (YouTube)
- **React:** Scrimba "Learn React" (free, interactive)
- **Node.js:** Traversy "Express Crash Course" (30 min)
- **Apps Script:** Google's own videos (official)

### Documentação
- **React:** https://react.dev (oficial, excelente)
- **Node.js:** https://nodejs.org/docs (oficial)
- **Express:** https://expressjs.com (oficial)
- **Google Apps Script:** https://developers.google.com/apps-script (oficial)
- **Tailwind:** https://tailwindcss.com/docs (oficial)

### Playgrounds (praticar sem setup)
- **React:** CodePen.io ou CodeSandbox.io
- **Node.js:** Repl.it (online Node environment)
- **Google Apps Script:** script.google.com (online editor)

### Cursos Pagos (Se quiser mais estruturado)
- **Udemy - Complete React Course** (~20h)
- **Udemy - The Complete Node.js** (~30h)

**→ Não recomendo para este projeto (tempo aperto), aprenda fazendo!**

---

## ✅ Checklist: Quando Você Está Pronto?

- [ ] Consegue criar componente React com useState/useContext
- [ ] Consegue criar endpoint Express (GET/POST) com validação
- [ ] Consegue baixar arquivo do Drive + salvar em outro lugar
- [ ] Consegue escrever teste Jest e ver passar
- [ ] Consegue fazer git clone/add/commit/push

**Se todas ✓:** Vai para ROADMAP_SOLO.md e começa coding!

---

## 📞 Preso?

1. **Conceito não entendi:** Google "[conceito] explicado em português"
2. **Código não roda:** Copie erro → Google → StackOverflow
3. **Não acha recurso:** Procure oficial docs (react.dev, nodejs.org)

**Dica:** Melhor aprender fazendo. Comece com "Hello World" básico, depois complexidade aumenta.

---

## 🎯 Próximo Documento

Depois de ter conhecimento dos basics:
→ **INSTALL_ME.md** (setup local)
→ **CODE_STANDARDS.md** (padrões do projeto)
→ **ROADMAP_SOLO.md** (implementação semana a semana)
