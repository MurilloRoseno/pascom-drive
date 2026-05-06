# CLAUDE.md — Pascom Drive Photo Sales Automation

**Platform:** Paróquia São Rafael - Sistema de Venda de Fotos  
**Mission:** Automação completa (upload → processamento → venda → entrega) sem intervenção manual  
**Developer:** 1 pessoa, 7 semanas, YAGNI-first  
**Status:** Congelado MVP (sem mudanças scope até V1.0 pronto)

---

## 🎯 Platform & Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Frontend** | React 18 + Vite + Tailwind | Rápido, responsivo, familiar |
| **Backend** | Node.js + Vercel Functions | Zero infra, auto-deploy, serverless |
| **Automation** | Google Apps Script | Drive/Sheets nativo, zero setup |
| **Database** | Google Sheets | Backup automático, leve, nada to manage |
| **Payments** | Mercado Pago (Pix) | Taxa 2.99% + R$0.30, webhook HMAC |
| **Communication** | WhatsApp (link wa.me) | MVP zero custo, simples |

---

## 📚 Documentation Hub (Leia Primeiro)

**START HERE:** Leia [INDEX.md](./INDEX.md) para navegação completa. Resumo:

| Doc | Purpose | When |
|-----|---------|------|
| [INDEX.md](./INDEX.md) | Navigation central | **FIRST** |
| [MVP_FINAL.md](./MVP_FINAL.md) | Scope + exclusões | Before any feature |
| [ARCHITECTURE_SINGLE_PERSON.md](./ARCHITECTURE_SINGLE_PERSON.md) | Decisões arquitetura | Before coding |
| [CODE_STANDARDS.md](./CODE_STANDARDS.md) | ESLint, naming, patterns | Before commit |
| [ROADMAP_SOLO.md](./ROADMAP_SOLO.md) | Timeline 7 semanas | Planning |
| [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) | Checklist pronto | Daily before commit |
| [INSTALL_ME.md](./INSTALL_ME.md) | Setup local | Immediately |
| [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) | Credenciais (Google, MP, Vercel) | After install |
| [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) | Troubleshooting | When broken |

---

## 🔗 Graphify Knowledge Graph

Esta repo tem graphify index em `graphify-out/`:
- **Antes de responder arquitetura Q:** Leia `graphify-out/GRAPH_REPORT.md`
- **Para "como X se relaciona com Y":** Use `graphify query "<question>"`, `graphify path "<A>" "<B>"`, ou `graphify explain "<concept>"`
- **Após mudanças código:** Execute `graphify update .` (AST-only, sem custo API)

---

## 🔨 The Harness — Hard Limits (Execution Boundaries)

**These boundaries prevent agent-drift and keep codebase maintainable.**

| Category | Limit | Rule |
|----------|-------|------|
| **Bug Fix** | ≤50 linhas | 1 commit per fix |
| **New Feature** | ≤300 linhas | Per session |
| **File Size** | ≤500 linhas | Extract to utils if exceeded |
| **Testing** | Always required | Never claim "done" without `npm test` ✅ |
| **Verification** | Critical logic | Always test Mercado Pago sandbox for payments |
| **Validation** | Always Zod | NUNCA skip em endpoints |

**Never do:**
- ❌ Hardcode credenciais em código
- ❌ Refactor "para ficar bonito" (deixa V2.0)
- ❌ Skip testes "porque é urgent"
- ❌ Adicionar features fora MVP scope
- ❌ Claim pronto sem rodar DEFINITION_OF_DONE.md checklist

---

## 👤 Ownership & Workflow (1-Dev Simplified)

**Não há ownership matrix (1 pessoa toca tudo), mas há segregação lógica:**

| Area | Workflow | Validation |
|------|----------|-----------|
| `frontend/**` | Code → ESLint → Test | `npm test` + Lighthouse |
| `backend/api/**` | Code → ESLint → Test | `npm test` + Zod validation |
| `google-apps-script/**` | Code → Jest mocks → E2E sandbox | Manual sandbox test |

**Deployment:** Edit Local → Validate (lint + test) → Commit → Git push → Vercel auto-deploy

---

## 🔐 Security & Environment Hygiene

**Secret Masking:** Claude lê `.env` para contexto, SEMPRE mask outputs:
```bash
sed -E 's/=.{10,}/=<redacted>/g' .env.local
```

**No-Commit Rule:** NUNCA `git add`:
- `.env`, `.env.local`
- Credenciais, tokens, API keys
- Dados locais, uploads temporários

**Boundary Checks (DO NOT SKIP):**
- ✅ **HMAC validation** para Mercado Pago webhook (segurança crítica)
- ✅ **Zod validation** em TODOS endpoints
- ✅ **PII masking:** WhatsApp criptografado em Sheets (AES-256-GCM)
- ✅ **Rate limiting:** 100 req/15min geral, 5 req/min pagamento
- ✅ **Audit trail:** Coluna "Timestamp" em toda transação

---

## 📊 Data Integrity Rules (Google Sheets)

- **Append-Only:** Status nunca deleta, adiciona nova linha com novo status
- **Soft Deletes:** Se precisa "remover", marca como "Cancelado" (não delete)
- **Timezone:** Todos timestamps em `America/São_Paulo` (NUNCA UTC a menos que convertido explicitamente)
- **Audit Trail:** Toda transação tem timestamp: upload, pagamento, entrega

---

## 🧠 Claude Code Workflow (Using This Context)

Sequência típica ao usar Claude Code neste projeto:

1. **Explore:** Leia [ARCHITECTURE_SINGLE_PERSON.md](./ARCHITECTURE_SINGLE_PERSON.md) ou `graphify query "<concept>"`
2. **Understand:** Leia [CODE_STANDARDS.md](./CODE_STANDARDS.md) para padrões da área
3. **Plan:** Se feature > 100 linhas, use skill `superpowers:writing-plans`
4. **Implement:** Respeite hard limits (50/300/500), nunca skip testes
5. **Verify:** Rode [DEFINITION_OF_DONE.md](./DEFINITION_OF_DONE.md) checklist antes de commit
6. **Test:** `npm test` + navegador (mobile + desktop)

---

## 🛠️ Recommended Skills

- `superpowers:writing-plans` — complex features
- `superpowers:test-driven-development` — payments/auth logic
- `superpowers:verification-before-completion` — before claiming done
- `simplify` — after implementing, review for reuse
- `context7` — docs React, Node.js, Vercel Functions

---

## 💾 Memory & Continuity

**Location:** `~/.claude/projects/C--Users-muril-OneDrive-Documentos-claude-Pessoal-Pascom-Drive/memory/`

**Update** após cada sessão não-trivial (refactoring, feature, bug investigation)

**Check** antes de começar: leia memory files + `graphify-out/GRAPH_REPORT.md` para contexto completo

---

## ✅ Key Decisions (Closed)

**Decisões técnicas confirmadas (veja [ARCHITECTURE_SINGLE_PERSON.md](./ARCHITECTURE_SINGLE_PERSON.md) para detalhes):**

| Decision | Choice | Why |
|----------|--------|-----|
| State Management | Context API | Simples, suficiente |
| Language | JavaScript + JSDoc | -5 dias vs TypeScript |
| Database | Google Sheets | Backup auto, zero setup |
| WhatsApp | Link wa.me | MVP zero custo |
| Testing | Jest 70% coverage | Suficiente, -1 dia |
| ORM | google-spreadsheet lib | Leve vs Prisma |
| Deployment | Git push → Vercel | Auto, sem SSH |

**Essas decisões NÃO mudam até V2.0.**

---

## 🚀 Ready to Start?

1. ✅ Leia [MVP_FINAL.md](./MVP_FINAL.md) (5 min)
2. ✅ Rode [INSTALL_ME.md](./INSTALL_ME.md) (30 min)
3. ✅ Leia [CODE_STANDARDS.md](./CODE_STANDARDS.md) (15 min)
4. ✅ Entenda [ARCHITECTURE_SINGLE_PERSON.md](./ARCHITECTURE_SINGLE_PERSON.md) (15 min)
5. ✅ Comece [ROADMAP_SOLO.md](./ROADMAP_SOLO.md) Semana 1

**Total onboarding:** ~2 horas. Você está pronto!

---

**Last updated:** 2026-05-05  
**Developer:** Solo (1 pessoa)  
**Timeline:** 7 semanas até V1.0 pronto
