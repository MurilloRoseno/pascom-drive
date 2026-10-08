# LEARNING_PATH.md - Ramp-up TÃ©cnico (Se NecessÃ¡rio)

**Objetivo:** Guia de aprendizado para tecnologias principais
**Tempo Total:** ~20-30 horas (se comeÃ§ar do zero)
**ComeÃ§ar por:** React (mais importante para frontend)

---

## ðŸ“Š AvaliaÃ§Ã£o RÃ¡pida: VocÃª jÃ¡ conhece?

### ExperiÃªncia NecessÃ¡ria
```
â˜ JavaScript ES6+ (spread, destructuring, async/await)
â˜ React (components, hooks, useState, useEffect, Context)
â˜ Node.js (express, rest API, middleware)
â˜ Google Apps Script (Drive API, Sheets API)
â˜ SQL / Database concepts (Google Sheets serÃ¡ nosso DB)
```

### Se vocÃª marcou <3 checkboxes:
â†’ Comece com **REACT** (8h) + **NODE.JS** (6h)

### Se vocÃª marcou 3-4:
â†’ Comece direto com **GOOGLE APPS SCRIPT** (4h)

### Se marcou todas:
â†’ Pode comeÃ§ar coding agora! VÃ¡ para ROADMAP_SOLO.md

---

## ðŸŽ¯ PARTE 1: React (8 horas)

**Por que React?** Frontend Ã© 40% do projeto, vocÃª vai passar semanas aqui.

### 1.1 Conceitos BÃ¡sicos (2h)
- **O que Ã© React?** - Library para UI com componentes reutilizÃ¡veis
- **Components:** Blocos de construÃ§Ã£o (FotoCard, Header, Button)
- **JSX:** Sintaxe que parece HTML mas Ã© JavaScript
- **Props:** Passar dados entre componentes

**Recursos:**
```
ðŸ“º VÃ­deo: "React in 100 Seconds" (Fireship) - 2 min
ðŸ“š Artigo: React Docs - "Thinking in React" - 15 min
ðŸ“ PrÃ¡tica: Criar 3 componentes simples (Card, Button, Input) - 1h
```

### 1.2 Hooks (3h) - **CRÃTICO**
- **useState:** Adicionar estado local (selectedPhotos, whatsapp)
- **useEffect:** Executar apÃ³s render (fetch fotos, setup)
- **useContext:** Acessar estado global (carrinho)
- **Custom hooks:** useCarrinho(), useEventos() (vocÃª vai criar)

**Recursos:**
```
ðŸ“º VÃ­deo: "React Hooks Explained" (Scrimba) - 20 min
ðŸ“š Docs: React Hooks API - 30 min
ðŸ“ PrÃ¡tica: Recriar contador com useState (5 min)
ðŸ“ PrÃ¡tica: Fetch dados com useEffect + Loading state (30 min)
ðŸ“ PrÃ¡tica: Context API para carrinho de compras (1h)
```

### 1.3 PadrÃµes Reais do Projeto (3h)
- **Forms:** React Hook Form + Zod (vocÃª vai usar para WhatsApp input)
- **HTTP Requests:** axios (fetch fotos, pagamento)
- **Rendering Lists:** map() para galeria de fotos
- **Conditional Rendering:** if/ternary para steps

**Recursos:**
```
ðŸ“ PrÃ¡tica: Criar form WhatsApp com validaÃ§Ã£o Zod (1h)
ðŸ“ PrÃ¡tica: Galeria de fotos com fetch + loading + error (1h)
ðŸ“ PrÃ¡tica: Multi-step form (steps 1-4, navegaÃ§Ã£o) (1h)
```

---

## ðŸŽ¯ PARTE 2: Node.js / Express (6 horas)

**Por que Express?** Backend Ã© 30% do projeto, precisas de APIs REST.

### 2.1 Conceitos BÃ¡sicos (1h)
- **O que Ã© Node.js?** - JavaScript server-side
- **Express:** Framework para REST APIs
- **Endpoints:** GET, POST, PUT, DELETE
- **Middleware:** FunÃ§Ãµes que rodam antes do endpoint (auth, cors, logs)

**Recursos:**
```
ðŸ“º VÃ­deo: "Express.js Crash Course" (Traversy) - 30 min
ðŸ“š Docs: Express Basics - 20 min
ðŸ“ PrÃ¡tica: Criar servidor "hello world" em Express (10 min)
```

### 2.2 REST APIs & Vercel Functions (2h) - **CRÃTICO**
- **GET /api/eventos** - retornar lista de fotos
- **POST /api/checkout/preference** - validar, criar Pix
- **GET /api/status-pagamento** - polling
- **ValidaÃ§Ã£o:** Zod schemas (vocÃª vai usar)
- **Error Handling:** try-catch, return 500 status

**Recursos:**
```
ðŸ“ PrÃ¡tica: Criar GET /api/eventos que retorna JSON (30 min)
ðŸ“ PrÃ¡tica: Criar POST /api/checkout/preference com Zod validation (1h)
ðŸ“ PrÃ¡tica: Error handling, logging (20 min)
```

### 2.3 Webhooks & IntegraÃ§Ã£o (2h)
- **Webhook:** URL que recebe POST de Mercado Pago
- **HMAC Validation:** Verificar se Ã© Mercado Pago mesmo
- **IdempotÃªncia:** NÃ£o processar 2x
- **Call Google Sheets API:** Atualizar status

**Recursos:**
```
ðŸ“ PrÃ¡tica: Criar POST /webhook/mercado-pago (1h)
ðŸ“ PrÃ¡tica: Validar assinatura HMAC (30 min)
ðŸ“ PrÃ¡tica: Chamar Google Sheets API (30 min)
```

---

## ðŸŽ¯ PARTE 3: Google Apps Script (4 horas)

**Por que Apps Script?** AutomaÃ§Ã£o Ã© 20% do projeto, mas crÃ­tico.

### 3.1 Conceitos BÃ¡sicos (1h)
- **O que Ã© Apps Script?** - JavaScript rodando no Google Cloud
- **Drive API:** Listar, baixar, salvar arquivos
- **Sheets API:** Ler, escrever dados
- **Triggers:** Executar cÃ³digo em horÃ¡rios ou eventos

**Recursos:**
```
ðŸ“š Docs: Google Apps Script Intro - 30 min
ðŸ“ PrÃ¡tica: Hello World em Apps Script (online editor) - 15 min
ðŸ“ PrÃ¡tica: Listar arquivos do Drive (15 min)
```

### 3.2 Processamento de Fotos (2h) - **CRÃTICO**
- **Baixar arquivo:** `DriveApp.getFileById().getBlob()`
- **Aplicar marca:** UrlFetchApp + ImageMagick (ou local)
- **Salvar resultado:** Criar novo arquivo
- **Registrar metadata:** Adicionar linha em Google Sheet

**Recursos:**
```
ðŸ“ PrÃ¡tica: Baixar imagem do Drive, salvar cÃ³pia (30 min)
ðŸ“ PrÃ¡tica: Aplicar marca d'Ã¡gua (1h) - mais complexo, google Help
ðŸ“ PrÃ¡tica: Registrar em Google Sheets (30 min)
```

### 3.3 Triggers & AutomaÃ§Ã£o (1h)
- **Time-based trigger:** Executar a cada 5 minutos
- **onEdit trigger:** Executar quando sheet muda
- **Error Handling:** Enviar email se erro

**Recursos:**
```
ðŸ“ PrÃ¡tica: Criar trigger automÃ¡tico (15 min)
ðŸ“ PrÃ¡tica: Error handling com email (30 min)
ðŸ“ PrÃ¡tica: Test suite local com Jest (15 min)
```

---

## ðŸŽ¯ PARTE 4: Complementares (6 horas)

### 4.1 Tailwind CSS (1h)
- Classes utility: `flex`, `text-center`, `bg-blue-500`
- Responsividade: `md:`, `lg:`, `sm:`
- CustomizaÃ§Ã£o com Design System (cores roxo litÃºrgico, etc)

**Recursos:**
```
ðŸ“º VÃ­deo: "Tailwind in 100 Seconds" (Fireship) - 2 min
ðŸ“ PrÃ¡tica: Estilizar card de foto com Tailwind (30 min)
```

### 4.2 Jest (Testing) (2h)
- Unit tests: funÃ§Ãµes puras (calcularSubtotal, validarWhatsApp)
- Mocks: mockar Google Sheets, Mercado Pago
- Coverage: rodar com `--coverage`

**Recursos:**
```
ðŸ“º VÃ­deo: "Jest Testing Crash Course" - 30 min
ðŸ“ PrÃ¡tica: Escrever 3 testes unitÃ¡rios (1h)
```

### 4.3 Git & GitHub (1h)
- `git clone`, `git add`, `git commit`, `git push`
- Branch workflow: main, develop, feature branches
- Pull requests (vocÃª vai fazer quando pronto)

**Recursos:**
```
ðŸ“º VÃ­deo: "Git & GitHub for Beginners" - 30 min
ðŸ“ PrÃ¡tica: Clonar repo, fazer commit, push (30 min)
```

### 4.4 Vercel Deployment (1h)
- Conectar GitHub
- Set environment variables
- Deploy automÃ¡tico no push

**Recursos:**
```
ðŸ“ PrÃ¡tica: Deploy hello-world em Vercel (30 min)
```

---

## ðŸ›£ï¸ PLANO RECOMENDADO

### Se vocÃª Ã© INICIANTE (0 de 5 skills):
```
Dia 1: React basics + hooks (8h)
Dia 2-3: React prÃ¡tica (FotoCard, galeria) (16h)
Dia 4: Node.js basics (4h)
Dia 5: Node.js APIs (4h)
Dia 6: Google Apps Script basics (4h)
Dia 7: Google Apps Script prÃ¡tica (4h)
Dia 8: Tailwind + Git + Vercel (4h)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Total: ~44 horas (1+ semana em tempo integral)
```

**â†’ Comece HOJE. Depois vÃ¡ para INSTALL_ME.md**

---

### Se vocÃª conhece JAVASCRIPT mas nÃ£o React (3 de 5):
```
Dia 1-2: React basics + hooks (8h)
Dia 3: Node.js (4h)
Dia 4: Google Apps Script (4h)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Total: ~20 horas (2-3 dias)
```

**â†’ Comece amanhÃ£. Pode comeÃ§ar coding logo.**

---

### Se vocÃª Ã© SÃŠNIOR (5 de 5):
```
Scan: ARCHITECTURE_SINGLE_PERSON.md (30 min)
Scan: ROADMAP_SOLO.md (30 min)
```

**â†’ Pode comeÃ§ar coding AGORA. VÃ¡ para INSTALL_ME.md**

---

## ðŸ“š Recursos Externos (Curados)

### Video Tutorials (YouTube)
- **React:** Scrimba "Learn React" (free, interactive)
- **Node.js:** Traversy "Express Crash Course" (30 min)
- **Apps Script:** Google's own videos (official)

### DocumentaÃ§Ã£o
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

**â†’ NÃ£o recomendo para este projeto (tempo aperto), aprenda fazendo!**

---

## âœ… Checklist: Quando VocÃª EstÃ¡ Pronto?

- [ ] Consegue criar componente React com useState/useContext
- [ ] Consegue criar endpoint Express (GET/POST) com validaÃ§Ã£o
- [ ] Consegue baixar arquivo do Drive + salvar em outro lugar
- [ ] Consegue escrever teste Jest e ver passar
- [ ] Consegue fazer git clone/add/commit/push

**Se todas âœ“:** Vai para ROADMAP_SOLO.md e comeÃ§a coding!

---

## ðŸ“ž Preso?

1. **Conceito nÃ£o entendi:** Google "[conceito] explicado em portuguÃªs"
2. **CÃ³digo nÃ£o roda:** Copie erro â†’ Google â†’ StackOverflow
3. **NÃ£o acha recurso:** Procure oficial docs (react.dev, nodejs.org)

**Dica:** Melhor aprender fazendo. Comece com "Hello World" bÃ¡sico, depois complexidade aumenta.

---

## ðŸŽ¯ PrÃ³ximo Documento

Depois de ter conhecimento dos basics:
â†’ **INSTALL_ME.md** (setup local)
â†’ **CODE_STANDARDS.md** (padrÃµes do projeto)
â†’ **ROADMAP_SOLO.md** (implementaÃ§Ã£o semana a semana)
