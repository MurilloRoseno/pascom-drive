# 📑 ÍNDICE COMPLETO - Sistema de Venda de Fotos

**Status:** ✅ Todos os 9 documentos criados
**Data:** 2026-05-05
**Desenvolvedor:** 1 pessoa
**Timeline:** 1-2 meses (7 semanas)

---

## 🎯 COMECE AQUI

### Se é sua primeira vez:
1. Leia: **MVP_FINAL.md** (5 min) - Entenda o que será construído
2. Leia: **INSTALL_ME.md** (10 min) - Faça setup local
3. Leia: **LEARNING_PATH.md** (20 min) - Aprenda tecnologias se necessário
4. Leia: **CODE_STANDARDS.md** (15 min) - Padrões do projeto

### Se já tem experiência:
1. Leia: **INSTALL_ME.md** (rápido setup)
2. Leia: **ARCHITECTURE_SINGLE_PERSON.md** (decisões técnicas)
3. Comece: **ROADMAP_SOLO.md** (implementação)

---

## 📚 DOCUMENTOS POR PROPÓSITO

### 📋 PLANEJAMENTO & ESCOPO
| Doc | Propósito | Quando ler |
|-----|-----------|-----------|
| **MVP_FINAL.md** | O que ESTÁ e NÃO ESTÁ no MVP | Início (entender escopo) |
| **ROADMAP_SOLO.md** | Timeline: 7 semanas, semana-a-semana | Antes de começar código |
| **ARCHITECTURE_SINGLE_PERSON.md** | Por que fazemos assim e não assado | Antes de escrever código |

### 🛠️ TÉCNICO & SETUP
| Doc | Propósito | Quando ler |
|-----|-----------|-----------|
| **INSTALL_ME.md** | Setup local em 30 min | Agora, antes de qualquer coisa |
| **SETUP_INSTRUCTIONS.md** | Credenciais Google/Vercel/MP | Depois do setup local |
| **LEARNING_PATH.md** | Ramp-up React/Node/Apps Script | Se precisar aprender techs |
| **CODE_STANDARDS.md** | ESLint/Prettier/naming/padrões | Antes de escrever código |

### ✅ QUALIDADE & OPERAÇÕES
| Doc | Propósito | Quando ler |
|-----|-----------|-----------|
| **DEFINITION_OF_DONE.md** | Quando considerar feature pronta | Todo dia (antes de commit) |
| **INCIDENT_RESPONSE.md** | O que fazer quando quebra | Quando algo está wrong |

---

## 🔄 WORKFLOW RECOMENDADO

```
DIA 1 (Quarta-feira):
├─ Ler MVP_FINAL.md (5 min) ✓
├─ Ler INSTALL_ME.md (10 min) ✓
├─ Setup local: npm install, .env.local (15 min) ✓
├─ Verificar que npm run dev funciona (5 min) ✓
├─ Ler LEARNING_PATH.md (20 min, skip se experienced) ✓
└─ Ler CODE_STANDARDS.md (15 min) ✓
   └─ Total dia 1: ~1 hora

DIA 2 (Quinta-feira):
├─ Ler SETUP_INSTRUCTIONS.md (30 min) ✓
├─ Google Cloud setup (30 min) ✓
├─ Mercado Pago sandbox (15 min) ✓
├─ Vercel setup (10 min) ✓
├─ Testar Google Sheets connection (10 min) ✓
└─ Ler ARCHITECTURE_SINGLE_PERSON.md (20 min) ✓
   └─ Total dia 2: ~2 horas

DIA 3 onwards:
├─ Ler ROADMAP_SOLO.md (30 min) ✓
├─ Começar Semana 1-2 (Apps Script)
└─ Use DEFINITION_OF_DONE.md todo dia antes de commit

Se quebra algo:
└─ Vá para INCIDENT_RESPONSE.md
```

---

## 📄 DOCUMENTOS DETALHADOS

### 1. MVP_FINAL.md
**Tamanho:** ~200 linhas
**Tempo leitura:** 5 minutos
**O que contém:**
- ✅ O que ESTÁ incluído no V1.0
- ❌ O que EXPLICITAMENTE NÃO está
- 📊 Definition of Done para MVP
- 🚫 Mudanças de scope PROIBIDAS

**Quando ler:** PRIMEIRO, para entender scope

**Exemplo:**
```
✅ INCLUÍDO:
- Fluxo completo: upload → galeria → pagamento Pix → entrega WhatsApp
- Google Apps Script automação
- React frontend básico
- Jest testes 70%+

❌ EXCLUÍDO:
- Evolution API WhatsApp (usar link wa.me simples)
- Dark mode
- Admin dashboard visual
```

---

### 2. INSTALL_ME.md
**Tamanho:** ~150 linhas
**Tempo execução:** 30 minutos
**O que contém:**
- Opção 1: Setup automático com script
- Opção 2: Setup manual passo-a-passo
- Troubleshooting básico
- Como saber se deu certo

**Quando ler:** AGORA (segunda coisa após MVP)

**Resultado esperado:**
```bash
✅ Frontend: http://localhost:3000 (galeria carrega)
✅ Backend: http://localhost:3001 (API responde)
✅ Testes: npm test (passam)
```

---

### 3. ARCHITECTURE_SINGLE_PERSON.md
**Tamanho:** ~400 linhas
**Tempo leitura:** 15 minutos
**O que contém:**
- O que NÃO usamos (TypeScript, Redux, Docker, etc.) e POR QUÊ
- O que USAMOS (React, Vite, Context API, Jest)
- Trade-offs de cada decisão
- Estrutura de pastas simplificada

**Quando ler:** Antes de escrever código, para entender decisões

**Exemplo:**
```javascript
// NÃO: Redux (overhead para 1 pessoa)
// SIM: Context API (suficiente)
function useCarrinho() {
  const [selecionadas, setSelecionadas] = useState([]);
  // ...
  return { selecionadas, adicionar, remover };
}
```

---

### 4. ROADMAP_SOLO.md
**Tamanho:** ~600 linhas
**Tempo execução:** 7 semanas
**O que contém:**
- Semana 1-2: Apps Script (~80h)
- Semana 2-3: Frontend (~80h)
- Semana 3-4: Backend APIs (~70h)
- Semana 4-5: Integração (~80h)
- Semana 5-6: Entrega + Testes (~70h)
- Semana 6-7: Deploy (~60h)

**Quando seguir:** Depois do setup, durante desenvolvimento

**Formato:**
```
## 📅 SEMANA 1-2: Google Apps Script

Dia 1-2: Setup local
- [ ] Criar projeto Apps Script
- [ ] Setup npm + jest mocks
- Tempo: 2 horas

Dia 3-4: Marca d'Água
- [ ] Função aplicarMarcaDAgua()
- [ ] Testes unitários
- Tempo: 8 horas

... (continue semana)
```

---

### 5. LEARNING_PATH.md
**Tamanho:** ~400 linhas
**Tempo leitura:** 20 minutos
**Tempo aprendizado:** 20-44 horas (depende do nível)
**O que contém:**
- Avaliação rápida de skill (você conhece JavaScript? React? Node?)
- Learning path por tech (React 8h, Node 6h, Apps Script 4h)
- Recursos externos (vídeos, docs, playgrounds)

**Quando ler:** Se não conhece bem React/Node/Apps Script

**Exemplo:**
```
Se você é INICIANTE (0 de 5 skills):
├─ Dia 1: React basics + hooks (8h)
├─ Dia 2-3: React prática (16h)
├─ Dia 4: Node.js basics (4h)
├─ Dia 5: Node.js APIs (4h)
├─ Dia 6: Apps Script basics (4h)
├─ Dia 7: Apps Script prática (4h)
└─ Total: ~44 horas (1+ semana)
```

---

### 6. SETUP_INSTRUCTIONS.md
**Tamanho:** ~300 linhas
**Tempo execução:** 30 minutos
**O que contém:**
- Google Cloud setup (APIs, credenciais, Sheet)
- Mercado Pago sandbox (tokens, webhook)
- Vercel hosting (secrets, deploy)
- GitHub repository (.gitignore, etc)
- Local .env.local
- Testes de tudo

**Quando ler:** Depois do setup local, para credenciais reais

**Checklist final:**
```
✅ Google Cloud project criado
✅ Mercado Pago sandbox tokens
✅ Vercel project conectado
✅ .env.local criado
✅ Backend local funciona
✅ Frontend local funciona
✅ Google Sheets conecta
```

---

### 7. CODE_STANDARDS.md
**Tamanho:** ~500 linhas
**Tempo leitura:** 15 minutos
**O que contém:**
- JavaScript naming (variáveis, funções)
- React patterns (components, hooks, state)
- Node.js patterns (endpoints, validation, middleware)
- Estrutura de pastas
- ESLint + Prettier config
- Testes nomenclatura
- Proibições absolutas (nunca fazer)

**Quando ler:** Antes de escrever código, como referência

**Exemplo:**
```javascript
// ✅ BOM
const totalComTaxa = calcularTotal(fotos);

// ❌ RUIM
const t = calcTotal(f);
```

---

### 8. DEFINITION_OF_DONE.md
**Tamanho:** ~400 linhas
**Tempo leitura:** 10 minutos
**O que contém:**
- Checklist completo (10 pontos: código, testes, docs, segurança, perf, etc)
- Simplified checklist (versão rápida)
- Quando usar a checklist
- Definição de pronto por tipo (Frontend, Backend, Apps Script, E2E)
- Rastreamento de progresso

**Quando usar:** TODO DIA antes de commitar

**Checklist rápido:**
```
✅ Código funciona
✅ Testes passam (npm test)
✅ ESLint/Prettier OK
✅ Documentado (JSDoc)
✅ Testado browser (mobile + desktop)
✅ Sem credenciais hardcoded
✅ Commit descritivo
✅ Não quebra nada
```

---

### 9. INCIDENT_RESPONSE.md
**Tamanho:** ~300 linhas
**Tempo leitura:** 10 minutos
**O que contém:**
- 3 incidentes CRÍTICOS (sistema down, webhook falha, MP rejeita)
- 4 incidentes ALTOS (Sheet não atualiza, marca falha, perf ruim, cliente erro)
- Troubleshooting geral
- Quando chamar suporte (Vercel, Google, MP)
- Checklist pós-resolve
- Prevenção futura

**Quando ler:** Quando algo quebra (deve ser rápido)

**Exemplo:**
```
🚨 CRÍTICO: Sistema todo down

Primeira ação (5 min):
[ ] Verificar Vercel status
[ ] Verificar Google Cloud status
[ ] Verificar logs
[ ] Rollback se necessário

Se não resolve (15 min):
[ ] Limpar cache Vercel
[ ] Verificar env vars
[ ] ...
```

---

## 🎓 RECOMENDADO: LEITURA NA ORDEM

### Semana 0 (Setup):
```
1. MVP_FINAL.md (5 min)
2. INSTALL_ME.md (30 min)
3. LEARNING_PATH.md (20 min, se necessário)
4. SETUP_INSTRUCTIONS.md (30 min)
5. CODE_STANDARDS.md (15 min)
6. ARCHITECTURE_SINGLE_PERSON.md (15 min)
└─ Total: ~2 horas
```

### Semana 1 onwards:
```
1. ROADMAP_SOLO.md (seguir semana a semana)
2. DEFINITION_OF_DONE.md (diariamente antes de commit)
3. INCIDENT_RESPONSE.md (quando algo quebra)
```

---

## 🔍 BUSCAR RÁPIDO

**"Como faço X?"**
- Não sei como começar → **INSTALL_ME.md**
- Não sei React/Node → **LEARNING_PATH.md**
- Não sei padrões código → **CODE_STANDARDS.md**
- Não sei quando pronto → **DEFINITION_OF_DONE.md**
- Não sei timeline → **ROADMAP_SOLO.md**
- Algo quebrou → **INCIDENT_RESPONSE.md**
- Qual é o escopo? → **MVP_FINAL.md**
- Por que não usamos X tech? → **ARCHITECTURE_SINGLE_PERSON.md**
- Como configurar credenciais? → **SETUP_INSTRUCTIONS.md**

---

## ✅ FINAL: Você Está Pronto?

Se conseguiu:
- [x] Ler MVP_FINAL.md
- [x] Rodar INSTALL_ME.md (setup local funciona)
- [x] Ler ARCHITECTURE_SINGLE_PERSON.md
- [x] Ler CODE_STANDARDS.md
- [x] Entender DEFINITION_OF_DONE.md

**→ Você está pronto para começar ROADMAP_SOLO.md SEMANA 1!**

---

## 📞 Suporte Rápido

**Se ficar preso:**
1. Google "[problema] [tecnologia]" (ex: "React state update error")
2. Procure em INCIDENT_RESPONSE.md se é problema conhecido
3. Check docs oficiais (react.dev, nodejs.org, google.com/apps-script)
4. StackOverflow com [tag-específica]

**Em 7 semanas:**
- ✅ Semana 1-2: Apps Script pronto
- ✅ Semana 2-3: Frontend básico pronto
- ✅ Semana 3-4: Backend APIs pronto
- ✅ Semana 4-5: Integração pronto
- ✅ Semana 5-6: Testes + Entrega pronto
- ✅ Semana 6-7: Deploy + Documentação pronto

---

**Bom trabalho! Você tem um plano sólido para 7 semanas.**

🚀 **Comece agora: execute `INSTALL_ME.md`**
