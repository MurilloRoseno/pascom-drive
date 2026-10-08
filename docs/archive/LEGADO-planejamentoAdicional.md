# Planejamento Adicional para Sistema de Venda de Fotos - Paróquia São Rafael

## 📋 Status Atual do Planejamento

### ✅ JÁ COBERTO (4 documentos)
1. **arquitetura.md** - Stack técnico completo, estrutura de pastas, componentes
2. **projeto.md** - Automação das 5 etapas, integração com Google Apps Script
3. **segurança.md** - Gestão de credenciais, RBAC, criptografia, LGPD
4. **tdd.md** - Estratégia de testes, cobertura, ferramentas (Jest, Playwright)

### ❌ LACUNAS IDENTIFICADAS

---

## 1️⃣ PLANO DE INFRAESTRUTURA & DEVOPS

**Falta definir:**
- [ ] Ambientes (dev, staging, produção) e como separar dados
- [ ] CI/CD pipeline detalhado (GitHub Actions, quando roda testes, deploy automático vs manual)
- [ ] Estratégia de branch (main, develop, feature branches)
- [ ] Versionamento semântico e tagging
- [ ] Processo de rollback (como voltar em caso de erro)
- [ ] Configuração de domínio & DNS
- [ ] Certificado SSL/TLS (Let's Encrypt via Vercel)
- [ ] Configuração de Google Cloud (project ID, credenciais de serviço)
- [ ] Setup do Vercel (project, env vars produção)

**Documentos a criar:**
- DEPLOYMENT.md
- ENVIRONMENTS.md
- CI-CD.md

---

## 2️⃣ PLANO DE MONITORAMENTO, LOGS & OBSERVABILIDADE

**Falta definir:**
- [ ] Qual ferramenta de logging (Sentry, LogRocket, DataDog, CloudWatch)?
- [ ] Dashboards de monitoramento (P95 latência, taxa de erro, uptime)
- [ ] Alertas automáticos (quando escalar?)
- [ ] Retenção de logs (quanto tempo guardar)
- [ ] Health checks (como saber se o sistema está down)
- [ ] Métricas de negócio (fotos vendidas, receita, taxa de conversão)
- [ ] APM (Application Performance Monitoring) configurado?

**Documentos a criar:**
- MONITORING.md
- OBSERVABILITY.md
- METRICS.md

---

## 3️⃣ PLANO DE OPERAÇÕES & SUPORTE

**Falta definir:**
- [ ] Runbook para fotógrafos (como fazer upload, troubleshoot)
- [ ] Runbook para admins (como processar erros, reenviar fotos)
- [ ] Runbook para clientes (dúvidas sobre pagamento, links expirados)
- [ ] SLA - Service Level Agreement (99.5% uptime? Tempo de resposta máximo?)
- [ ] Escalação de incidentes (quem chamar em caso de emergência)
- [ ] Horário de suporte (24/7 ou horário comercial?)
- [ ] Chat/email para suporte ao cliente
- [ ] Process de reembolso (se cliente não receber fotos)
- [ ] Troubleshooting common issues (webhook que não chega, foto corrompida)

**Documentos a criar:**
- OPERATIONS.md
- SLA.md
- RUNBOOK_PHOTOGRAPHER.md
- RUNBOOK_ADMIN.md
- RUNBOOK_CUSTOMER.md
- INCIDENT_RESPONSE.md

---

## 4️⃣ PLANO DE UX/DESIGN

**Falta definir:**
- [ ] Wireframes/mockups das 4 páginas (galeria, compra step 1-4, admin dashboard)
- [ ] User flows (jornada do fiel, do fotógrafo, do admin)
- [ ] Design System já existe, mas precisa de:
  - Componentes customizados para este projeto (FotoCard, QRCodeDisplay, etc)
  - Temas/dark mode (se for necessário)
  - Acessibilidade WCAG AA (contrast ratio, keyboard navigation)
- [ ] Prototipagem interativa (Figma/Adobe XD)
- [ ] Testes de usabilidade com usuários reais
- [ ] Copy/microcopy (mensagens de erro, botões, labels)

**Documentos a criar:**
- DESIGN.md
- WIREFRAMES.md (ou arquivo Figma)
- ACCESSIBILITY.md
- COPYWRITING.md

---

## 5️⃣ PLANO DE DOCUMENTAÇÃO & ONBOARDING

**Falta definir:**
- [ ] README.md principal do projeto (qual é? como começar?)
- [ ] INSTALL.md (passo a passo de instalação local)
- [ ] GETTING_STARTED.md para desenvolvedores
- [ ] API documentation (Swagger/OpenAPI?)
- [ ] Guia do fotógrafo (como usar o sistema)
- [ ] Guia do admin (como gerenciar pedidos, reenviar)
- [ ] Guia do cliente (FAQ, como pagar, receber fotos)
- [ ] Glossário (FOTO_001, Pix, tarja, etc)
- [ ] Video tutorials (opcional mas útil)

**Documentos a criar:**
- INSTALLATION.md
- DEVELOPER_GUIDE.md
- USER_GUIDE_PHOTOGRAPHER.md
- USER_GUIDE_ADMIN.md
- USER_GUIDE_CUSTOMER.md
- API_DOCUMENTATION.md
- FAQ.md

---

## 6️⃣ PLANO DE PRIORIZAÇÃO & MVP

**Falta definir:**
- [ ] O que é o **MVP exato** (Minimum Viable Product)?
  - V1.0: apenas fotógrafos (upload) + admin (processar) + clientes (ver fotos)?
  - Ou incluir pagamento desde o início?
  - Ou começar com link de WhatsApp (sem Evolution API)?
- [ ] Roadmap detalhado: V1.0 → V1.1 → V2.0
- [ ] Features nice-to-have vs must-have (priorização)
- [ ] Timeline realista (quanto tempo para cada fase?)
- [ ] Decisões de scope (excluir o quê?)

**Documentos a criar:**
- MVP.md
- ROADMAP.md
- PRIORITIZATION.md

---

## 7️⃣ PLANO DE INTEGRAÇÃO COM SISTEMAS EXISTENTES

**Falta definir:**
- [ ] A Paróquia já tem site/blog? Integrar fotos lá?
- [ ] Sistema de agendamento de missas? Integrar eventos?
- [ ] Sistema de geração de certificados? Integrar com entrega?
- [ ] Integrações com outras APIs (Slack para notificar admin, etc)?
- [ ] Export de dados para contabilidade?

**Documentos a criar:**
- INTEGRATIONS.md

---

## 8️⃣ PLANO DE CAPACITAÇÃO DA EQUIPE

**Falta definir:**
- [ ] Quem são os desenvolvedores? Qual é o nível de experiência?
- [ ] Precisa treinar em React? Node.js? Google Apps Script?
- [ ] Workshopes/sprints de aprendizado antes de começar?
- [ ] Como compartilhar knowledge (pair programming, code reviews)?
- [ ] Documentação de padrões do projeto (coding standards, git workflow)

**Documentos a criar:**
- TEAM_SETUP.md
- CODING_STANDARDS.md
- LEARNING_PATH.md

---

## 9️⃣ PLANO DE COMUNICAÇÃO & STAKEHOLDERS

**Falta definir:**
- [ ] Quem são os stakeholders? (Padres, PASCOM, fiéis, fotógrafos)
- [ ] Como comunicar status (weekly updates, demos, feedback)
- [ ] Plano de marketing/comunicação do launch (como anunciar o novo sistema)
- [ ] Gestão de expectativas (o que cada um pode esperar)
- [ ] Feedback loops (como coletar feedback dos usuários)

**Documentos a criar:**
- STAKEHOLDERS.md
- COMMUNICATION_PLAN.md
- LAUNCH_PLAN.md

---

## 🔟 PLANO DE BACKUP & DISASTER RECOVERY

**Falta definir:**
- [ ] Backup automático do Google Drive? Google Sheets?
- [ ] Backup de banco de dados Vercel/Redis?
- [ ] RTO (Recovery Time Objective) - quanto tempo para recuperar?
- [ ] RPO (Recovery Point Objective) - quanto dado pode perder?
- [ ] Testes de restore periódicos
- [ ] Plano se Google Drive ficar indisponível (fallback)
- [ ] Plano se Mercado Pago ficar indisponível (manual refund)

**Documentos a criar:**
- BACKUP_RECOVERY.md
- CONTINGENCY_PLAN.md

---

## 1️⃣1️⃣ PLANO DE PERFORMANCE & SLAS

**Falta definir:**
- [ ] SLOs (Service Level Objectives) explícitos:
  - Uptime: 99.5%? 99.9%?
  - P95 latência API: <500ms?
  - P99 latência API: <1s?
  - Carregamento da galeria: <3s?
- [ ] Benchmarks de performance (baseline)
- [ ] Plano de otimização (se P95 > 500ms, o quê fazer?)
- [ ] Capacity planning (quantos usuários simultâneos?)

**Documentos a criar:**
- SLA.md
- PERFORMANCE_TARGETS.md

---

## 1️⃣2️⃣ PLANO JURÍDICO & COMPLIANCE

**Falta definir (além de LGPD):**
- [ ] Termos de Uso do sistema
- [ ] Política de Privacidade
- [ ] Contrato de Processamento de Dados (DPA) com:
  - Google (Drive, Sheets, Apps Script)
  - Vercel (hospedagem)
  - Mercado Pago (pagamentos)
  - Evolution API (WhatsApp) - se usar
- [ ] Conformidade com PCI DSS? (não armazenar dados de cartão)
- [ ] Direitos autorais das fotos (quem é o dono?)
- [ ] Consentimento de imagem (para batizados, casamentos)

**Documentos a criar:**
- LEGAL.md
- TERMS_OF_SERVICE.md
- PRIVACY_POLICY.md
- DPA_CHECKLIST.md

---

## 1️⃣3️⃣ PLANO FINANCEIRO & ROI

**Falta definir:**
- [ ] Custo de desenvolvimento (horas/salário)
- [ ] Custo de infraestrutura (Vercel, Evolution API, Sentry, etc - mensal)
- [ ] Receita estimada (fotos vendidas × R$10 × taxa conversão)
- [ ] Break-even point (quando o sistema se paga?)
- [ ] ROI (Return on Investment)
- [ ] Pricing strategy (por que R$10 por foto?)
- [ ] Taxa de conveniência (por que 2.99% + R$0,30?)

**Documentos a criar:**
- FINANCIAL_PLAN.md
- COST_ANALYSIS.md

---

## 1️⃣4️⃣ PLANO DE MIGRAÇÃO & GO-LIVE

**Falta definir:**
- [ ] Como fazer transição do sistema antigo (manual) para novo?
- [ ] Importar dados históricos? (fotos antigas, clientes antigos)
- [ ] Período de "teste" (como executar ambos em paralelo?)
- [ ] Data de go-live (quando "desligar" o sistema antigo?)
- [ ] Rollback plan (se der ruim, volta para quê?)
- [ ] Teste de carga antes do launch (teste com 100 usuários?)
- [ ] Suporte 24/7 no dia do launch?

**Documentos a criar:**
- GO_LIVE_PLAN.md
- MIGRATION_PLAN.md

---

## 1️⃣5️⃣ PLANO DE QUALIDADE & CODE REVIEW

**Falta definir:**
- [ ] Critérios de aceitação para cada feature
- [ ] Definition of Done (além de testes)
- [ ] Processo de code review (quem revisa? quanto tempo?)
- [ ] Lint/formatter configurado (Prettier, ESLint)?
- [ ] Pre-commit hooks (rodar testes antes de commit)?
- [ ] Checklist de segurança (secrets, SQL injection, XSS)?

**Documentos a criar:**
- DEFINITION_OF_DONE.md
- CODE_REVIEW_GUIDELINES.md
- QUALITY_GATES.md

---

## 📊 RESUMO: O QUE PRIORIZAR AGORA

**CRÍTICO (antes de escrever code):**
1. MVP.md - definir exatamente o que é V1.0
2. ROADMAP.md - timeline realista
3. TEAM_SETUP.md - quem vai fazer o quê
4. ENVIRONMENTS.md - como separar dev/staging/prod
5. MONITORING.md - como saber se algo quebrou

**IMPORTANTE (primeiras semanas):**
6. DEPLOYMENT.md / CI-CD.md
7. LEGAL.md / TERMS_OF_SERVICE.md
8. INSTALLATION.md / DEVELOPER_GUIDE.md
9. INCIDENT_RESPONSE.md
10. GO_LIVE_PLAN.md

**PODE DEIXAR PARA DEPOIS:**
- FINANCIAL_PLAN.md (se não for business case obrigatório)
- VIDEO TUTORIALS (após MVP pronto)
- DARK MODE / Acessibilidade avançada

---

## 🎯 CONTEXTO: UMA PESSOA, 1-2 MESES, MVP COMPLETO

**Suas respostas:**
- ✅ MVP: Fluxo **COMPLETO** (upload → pagamento Pix → entrega)
- ✅ Timeline: 1-2 meses (tempo normal, não urgente)
- ⚠️ **CRÍTICO**: Você é a ÚNICA pessoa desenvolvendo isso
- ✅ Escopo: Sistema isolado (sem integração com outros sistemas)

**Implicações:**
1. **Documentação é ESSENCIAL** - você precisa ser muito independente
2. **Testes são ainda mais críticos** - sem code review, testes substituem validação
3. **Setup deve ser automático** - scripts para instalar tudo de uma vez
4. **Reduzir scope onde possível** - para caber em 1-2 meses

---

## 🚨 AVISO: ESCOPO REALISTA PARA 1 PESSOA EM 1-2 MESES

**O que É viável:**
- ✅ Google Apps Script (marca d'água, Drive, Sheets) - **10 dias**
- ✅ Frontend básico (galeria + fluxo 4 steps) - **10 dias**
- ✅ Backend APIs (criar pag, status, webhook) - **7 dias**
- ✅ Integração Mercado Pago (Pix + webhook) - **5 dias**
- ✅ Testes (unitários + alguns E2E) - **10 dias**
- ✅ Deploy e documentação - **5 dias**
- **Total: ~47 dias (7 semanas)** ✓ Cabe em 1-2 meses

**O que É problemático (remover do MVP):**
- ❌ Evolution API WhatsApp (muito setup, use link wa.me simplesmente)
- ❌ Dark mode, temas customizáveis
- ❌ Admin dashboard completo (deixar básico)
- ❌ Analytics avançado, dashboards complexos
- ❌ Teste de penetração, audit security completo

---

## 🎯 DOCUMENTOS QUE VOCÊ PRECISA CRIAR ANTES DE COMEÇAR

### CRÍTICO (sem isso, vai ficar perdido):

**1. MVP_FINAL.md** (3 linhas, mas essencial!)
```markdown
# MVP V1.0 - Escopo Fechado

## Incluído:
- Fotógrafo faz upload → Apps Script processa + marca d'água
- Cliente vê galeria → seleciona fotos → insere WhatsApp
- Clica "Pagar" → Mercado Pago gera Pix → cliente confirma
- Webhook recebe confirmação → Apps Script envia link Drive via WhatsApp

## EXCLUÍDO (V2.0):
- Evolution API (usar link wa.me simples)
- Dark mode
- Admin dashboard (apenas Google Sheets por agora)
```

**2. INSTALL_ME.md** (passo-a-passo automático)
```markdown
# Como Configurar Tudo em 30 minutos

## 1. Clone o repositório
## 2. Rode script_setup.sh (cria .env, instala deps, configura Google Cloud)
## 3. npm run dev (inicia tudo local)
## 4. Acesse http://localhost:3000

Pronto! Sistema rodando.
```

**3. ARCHITECTURE_SINGLE_PERSON.md** (decisões simplificadas)
```markdown
# Arquitetura para 1 Desenvolvedor

## Decisões para simplificar:
- NÃO usar Redux (Context API suficiente)
- NÃO fazer microserviços (Vercel Functions é suficiente)
- NÃO usar TypeScript (JavaScript + JSDoc é mais rápido)
- Google Sheets como "banco de dados" (não usar Firestore)
- Link wa.me para WhatsApp (não usar Evolution API)
- Jest com cobertura 70% (não 80%)
```

**4. ROADMAP_SOLO.md** (timeline realista)
```markdown
# Semana a Semana (1 pessoa, 7 semanas)

Semana 1-2: Google Apps Script
Semana 2-3: Frontend básico
Semana 3-4: Backend APIs
Semana 4-5: Mercado Pago + Webhook
Semana 5-6: Testes + correções
Semana 7: Deploy + documentação

Cada semana = 40-50h de trabalho
```

**5. LEARNING_PATH.md** (não conheça tudo? comece aqui)
```markdown
# Se você NÃO conhecer bem:
- React: Comece pelos components, depois hooks (3h tutorial)
- Node.js: Comece com endpoints GET/POST em Vercel (2h)
- Google Apps Script: Leia colab de Google, depois adapte (4h)
- Google Sheets API: Use biblioteca pronta, não reinvente (1h)

Tempo total de ramp-up: ~10h, depois seguir.
```

---

### IMPORTANTE (antes de escrever 1 linha de código):

**6. SETUP_INSTRUCTIONS.md**
- Google Cloud: criar projeto, gerar credenciais
- Vercel: conectar GitHub, configurar env vars
- Mercado Pago: criar conta sandbox, pegar tokens
- GitHub: template de repo, .gitignore, etc

**7. ENVIRONMENTS_SIMPLE.md**
- .env.local (local, com valores fake)
- .env.production (Vercel secrets dashboard)

**8. CODE_STANDARDS.md**
- ESLint config
- Prettier config
- Padrão de nome de funções/componentes
- Padrão de pastas

---

### PODE DEIXAR PRA DEPOIS (ou ignorar no MVP):

**Não crie agora:**
- FINANCIAL_PLAN.md (não relevante ainda)
- PERFORMANCE_TARGETS.md (P95 <500ms é suficiente)
- Dark mode styles
- Accessibility WCAG AA completo (WCAG A é OK)
- Legal/DPA detalhado (básico é suficiente)

---

## 📋 CHECKLIST: PLANEJAR ANTES DE CODAR

- [ ] **MVP_FINAL.md** criado e fechado (sem mudanças de scope)
- [ ] **INSTALL_ME.md** escrito (script setup automático pronto)
- [ ] **ARCHITECTURE_SINGLE_PERSON.md** definido (decisões de simplificação)
- [ ] **ROADMAP_SOLO.md** com timeline semana-a-semana
- [ ] **LEARNING_PATH.md** - quanto tempo preciso para aprender techs novas?
- [ ] **SETUP_INSTRUCTIONS.md** - Google Cloud/Vercel/MP credenciais prontas
- [ ] **CODE_STANDARDS.md** - ESLint/Prettier/folders
- [ ] **DEFINITION_OF_DONE.md** - o quê significa "pronto" (testes? coverage?)
- [ ] **INCIDENT_RESPONSE.md** básico - "se X quebrar, faça Y"

---

## ⏱️ TEMPO DE PLANEJAMENTO RECOMENDADO

**Antes de escrever código:**
- Ler todos os 4 documentos existentes (arquitetura, projeto, segurança, tdd) - **2h**
- Criar os 5 documentos CRÍTICOS acima - **3h**
- Setup local (Google Cloud, Vercel, Mercado Pago) - **2h**
- Teste de "hello world" em cada tech (React, Node, Apps Script) - **2h**

**Total:** ~9 horas de planejamento = **1 dia de trabalho**

Depois disso, você pode codar com confiança por 6 semanas.

---

## 🚀 PASSO IMEDIATO

Você deveria começar escrevendo os 5 documentos CRÍTICOS que listei:
1. MVP_FINAL.md
2. INSTALL_ME.md
3. ARCHITECTURE_SINGLE_PERSON.md
4. ROADMAP_SOLO.md
5. LEARNING_PATH.md

Depois, fazer setup de Google Cloud + Vercel + Mercado Pago.

Só aí, começar a implementação no dia 1 da Semana 1.

Quer que eu crie um template para cada um desses documentos?