# DEFINITION_OF_DONE.md - Quando Uma Feature É "Pronta"

**Objetivo:** Critérios claros para considerar uma feature/task terminada
**Desenvolvedor:** 1 pessoa
**Aplicável:** Todo commit, toda PR, todo feature

---

## 📋 CHECKLIST COMPLETO

Uma feature é considerada **PRONTA PARA PRODUÇÃO** quando:

### 1️⃣ IMPLEMENTAÇÃO TÉCNICA
- [ ] Código escrito conforme especificação
- [ ] Sem `console.log()` ou `debugger` deixado
- [ ] Sem hardcoding (credenciais, URLs, numbers)
- [ ] Sem `TODO`/`FIXME` sem descrição clara
- [ ] Sem `any` types (se tiver TypeScript, mas não temos)
- [ ] Sem dependências desnecessárias

### 2️⃣ CÓDIGO LIMPO
- [ ] ESLint passa: `npm run lint` sem warnings/errors
- [ ] Prettier formatado: `npm run format`
- [ ] Nomes descritivos (variáveis, funções, componentes)
- [ ] Máximo de linhas respeita limite:
  - Função: <50 linhas
  - Componente React: <100 linhas
  - Arquivo: <300 linhas

### 3️⃣ TESTES
- [ ] Testes unitários escritos (se lógica pura)
- [ ] Testes de integração (se usa API/DB)
- [ ] Testes E2E para fluxo do usuário crítico
- [ ] Todos os testes passando: `npm test` ✓
- [ ] Coverage mantido em 70%+ (mínimo MVP)
- [ ] Cenários de erro testados

### 4️⃣ DOCUMENTAÇÃO
- [ ] Função documentada (JSDoc ou comentário)
  ```javascript
  /**
   * Calcula taxa Mercado Pago
   * @param {number} subtotal - em reais
   * @returns {number} taxa em reais
   */
  function calcularTaxa(subtotal) { ... }
  ```
- [ ] Endpoint documentado (método, URL, body, resposta)
  ```markdown
  POST /api/criar-pagamento
  Body: { whatsapp, fotoIds, totalComTaxa }
  Response: { transactionId, qrCode, expiresIn }
  ```
- [ ] User guide atualizado (se feature visível)
- [ ] README atualizado (se mudou setup)

### 5️⃣ SEGURANÇA
- [ ] Sem credenciais em código (tudo em `.env`)
- [ ] Input validado com Zod (backend)
- [ ] Sem SQL injection risk (Google Sheets API é safe)
- [ ] Sem XSS risk (React sanitizes por default)
- [ ] Sem CSRF risk (stateless APIs)
- [ ] Rate limiting considerado (endpoints críticos)
- [ ] Error messages não expostos sensíveis (ex: "Invalid token", não "Database connection error")

### 6️⃣ PERFORMANCE
- [ ] Sem N+1 queries (não aplica, sheets é simples)
- [ ] Imagens otimizadas (lazy loading no frontend)
- [ ] Sem rendering desnecessário (React memo se needed)
- [ ] Carregamento <3 segundos esperado

### 7️⃣ RESPONSIVIDADE
- [ ] Testado em mobile (375px)
- [ ] Testado em tablet (768px)
- [ ] Testado em desktop (1280px)
- [ ] Buttons >=44px de altura (accessibility)
- [ ] Sem text overflow (mobile)
- [ ] Touch-friendly (buttons não apertados)

### 8️⃣ COMPATIBILIDADE
- [ ] Funciona em Chrome/Firefox/Safari (Desktop)
- [ ] Funciona em iOS Safari / Android Chrome (Mobile)
- [ ] Sem console errors (DevTools)
- [ ] Sem console warnings (apenas OK desculpar)

### 9️⃣ GIT / COMMIT
- [ ] Commit message descritivo (não "fix", but "fix: WhatsApp validation regex")
- [ ] Commit pequeno (1 feature per commit, max 5 arquivos)
- [ ] Sem merge conflicts
- [ ] Branch deletado após merge

### 🔟 VERIFICAÇÃO FINAL
- [ ] Funciona localmente: `npm run dev` ✓
- [ ] Funciona em staging (se tiver)
- [ ] Não quebra features existentes (manual testing)
- [ ] Logs não poluído (apenas erros importantes)

---

## ⚡ SIMPLIFIED CHECKLIST (Quick Version)

Para dia-a-dia, mínimo essencial:

```markdown
## Feature: [Nome da Feature]

- [ ] Código funciona
- [ ] Testes passam (npm test)
- [ ] ESLint/Prettier OK (npm run lint)
- [ ] Documentado (JSDoc / comentário)
- [ ] Testado no browser (mobile + desktop)
- [ ] Sem credenciais hardcoded
- [ ] Commit descritivo
- [ ] Não quebra nada
```

---

## 🚫 NÃO FAZER (Common Mistakes)

### ❌ Considerar pronto quando:
- [ ] "Mas funciona no meu computador"
  → Testou em mobile? Em staging? Com dados reais?
  
- [ ] "Vou adicionar testes depois"
  → 80% das vezes "depois" nunca chega. Testa antes de commitar.
  
- [ ] "É apenas CSS, não precisa testes"
  → E2E screenshots (Playwright) pegam visual regressions.
  
- [ ] "Mergear para main depois reviso"
  → Revisar = testar = integração. Faz antes.
  
- [ ] "Coverage vai para 60%, mas é OK por agora"
  → 60% coverage = metade do código não está testado. Aumenta.

- [ ] "Usuário nunca vai fazer isso (X edge case)"
  → Testa mesmo assim. Sempre tem um usuário criativo.

---

## 📊 DEFINIÇÃO DE PRONTO POR TIPO

### Feature Frontend (Component React)
```
DONE quando:
- [ ] Componente renderiza sem erro
- [ ] Responsive (mobile + desktop)
- [ ] Todos props passados corretamente
- [ ] Interativo (click, input, etc)
- [ ] Testes E2E (Playwright)
- [ ] Sem console errors
```

### Feature Backend (API Endpoint)
```
DONE quando:
- [ ] Endpoint retorna 200 (happy path)
- [ ] Validação Zod passa
- [ ] Error cases retornam 400/500
- [ ] Webhook recebe/processa corretamente
- [ ] Rate limiting funciona
- [ ] Testes com mocks de Sheets/MP
- [ ] Logs não expõem PII
```

### Feature Google Apps Script
```
DONE quando:
- [ ] Trigger automático roda
- [ ] Marca d'água aplicada corretamente
- [ ] Metadados registrados em Sheet
- [ ] Retry automático em erro
- [ ] Admin notificado via email se erro
- [ ] Testes local com jest mocks
```

### Feature Completa (E2E)
```
DONE quando:
- [ ] Frontend → Backend → Apps Script funcionam juntos
- [ ] Fluxo usuário funciona: compra foto, recebe link
- [ ] Todos testes passam
- [ ] Sem errors em logs produção (simulado)
```

---

## 🔄 QUANDO USAR ESTA CHECKLIST

### 1. Antes de fazer COMMIT
```bash
# Rode isto
npm run lint:fix && npm run format && npm test

# Se tudo passar ✓, você pode committar
```

### 2. Antes de fazer PUSH
```bash
# Teste manual 1x em browser (dev tools ligado)
npm run dev
# Navega, clicks, verifica console
```

### 3. Antes de MERGEAR para main
```bash
# Rode novamente em clean checkout
git checkout main
git pull origin main
git merge seu-branch
npm test
npm run dev
# Teste manual ponto 2 novamente
```

### 4. Antes de DEPLOY produção
- [ ] Todos commites estão em main?
- [ ] Testes passam em CI/CD?
- [ ] Coverage ainda 70%+?
- [ ] Secrets configurados em Vercel?
- [ ] Database (Google Sheets) tem backup?

---

## 📈 RASTREANDO PROGRESS

### Diário
```
Feature: [Foto Card Component]

Dia 1: ✅ Componente criado (renderiza)
Dia 2: ✅ Testes unitários (70% coverage)
Dia 3: ✅ E2E Playwright (seleciona foto, checkbox)
Dia 4: ✅ Responsivo (mobile + desktop)
Dia 5: ✅ Mergear para main
```

### Semanal
```
Semana 2: Frontend Básico
- [ ] FotoCard ✅
- [ ] GaleriaGrid ✅
- [ ] FiltroEvento ⏳ (in progress)
- [ ] Resumo ⬜ (to do)
- [ ] FluxoCompra ⬜ (to do)
```

---

## ✅ FINAL CHECK (Antes de Dizer "Pronto!")

Se você conseguir responder SIM para tudo abaixo:
- [ ] "Se outra pessoa usar este código, ela entenderia?"
- [ ] "Se quebrasse agora, eu saberia por quê (tests diriam)?"
- [ ] "Se escalar mais usuários, isto quebraria?"
- [ ] "Se alguém hacker testasse, encontraria vulnerabilidade?"
- [ ] "Se usuário fizer algo inesperado, sistema não quebra?"

**→ PRONTO PARA PRODUÇÃO**

---

## 📞 Quando Está "Bom Demais"

Às vezes você vai querer refatorar/melhorar código que JÁ funciona.

**PARAR** quando:
- ✅ Funciona
- ✅ Testado
- ✅ Documentado
- ⏹️ STOP - não refatore "por refatorar"

**Motivo:** Você está sozinho em 7 semanas. Perfeição = delays.

---

## 📚 Referências

- **CODE_STANDARDS.md** - Como escrever código limpo
- **ROADMAP_SOLO.md** - Timeline da implementação
- **.husky/pre-commit** - Scripts automáticos
