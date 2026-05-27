# MVP V1.0 - Escopo Fechado para Produção

**Status:** Congelado - Sem mudanças de scope até V1.0 pronto
**Data:** 2026-05-05
**Desenvolvedor:** 1 pessoa
**Timeline:** 1-2 meses (7 semanas)

---

## ✅ INCLUÍDO NO MVP V1.0

### 1️⃣ Entrada de Dados (Google Drive)
- [ ] Fotógrafos fazem upload de fotos em `/ACERVO_PAROQUIA/Eventos/[Data_Evento]/`
- [ ] Estrutura de pastas criada automaticamente via Apps Script
- [ ] Suporte para JPG, PNG, HEIC (máx 50MB cada)
- [ ] Sem validação de qualidade (apenas formato/tamanho)

### 2️⃣ Processamento (Google Apps Script)
- [ ] Trigger automático a cada 5 minutos detecta fotos novas
- [ ] Marca d'água aplicada automaticamente (logo + texto "Amostra")
- [ ] ID único gerado: `FOTO_001`, `FOTO_002`, etc
- [ ] 2 versões salvas:
  - `/Processadas_Originais/` (sem tarja, para entrega)
  - `/Processadas_Amostras/` (com tarja, para galeria)
- [ ] Metadados registrados em Google Sheets
- [ ] Retry automático se erro (máx 3 tentativas)

### 3️⃣ Vitrine - Frontend (React/Vite)
- [ ] Galeria pública com 4 colunas (desktop), 2 (tablet), 1 (mobile)
- [ ] Lazy loading de imagens (carrega ao scroll)
- [ ] Filtro por evento (dropdown simples)
- [ ] Seleção de múltiplas fotos (checkbox)
- [ ] Resumo em tempo real (subtotal, taxa, total)
- [ ] Responsivo mobile-first (botões 44px mínimo)
- [ ] Sem dark mode (apenas light)
- [ ] Sem admin dashboard visual (usar Google Sheets)

### 4️⃣ Pagamento (Mercado Pago + Pix)
- [ ] Fluxo 4-steps:
  1. Selecionar fotos
  2. Inserir WhatsApp (com máscara: 11 9 9999-9999)
  3. Revisar resumo (fotos, WhatsApp, total)
  4. QR Code Pix + polling (a cada 2s)
- [ ] Geração de Pix Dinâmico (não estático)
- [ ] Taxa: 2.99% + R$0,30 por transação
- [ ] Máximo por transação: R$10.000
- [ ] Timeout: 30 minutos (transação expira)
- [ ] Webhook com validação HMAC-SHA256
- [ ] Idempotência: mesmo webhook 2x = processa 1x

### 5️⃣ Entrega (WhatsApp + Google Drive)
- [ ] Link wa.me simples (SEM Evolution API)
  ```
  https://wa.me/55[NUMERO]?text=Aqui estão suas fotos...
  ```
- [ ] Links compartilhados do Drive:
  - Permissão: `anyoneWithTheLink` (qualquer um com link)
  - Acesso: `READER` (apenas visualizar, não editar)
  - Sem expiração
- [ ] Apps Script envia WhatsApp a cada 2 minutos (fotos "Pago" não entregues)
- [ ] Status atualizado em Sheets: "Entregue"
- [ ] Retry: máx 3 tentativas

### 6️⃣ Testes (Jest + Playwright)
- [ ] Jest para unit tests (funções de cálculo, validação)
- [ ] Jest para integration tests (APIs mock, Google Sheets mock)
- [ ] Playwright para E2E (fluxo completo do usuário)
- [ ] Cobertura mínima: 70% (não 80%)
- [ ] Testes críticos DEVEM passar antes de deploy

### 7️⃣ Segurança Básica
- [ ] Credenciais em .env.local e Vercel secrets (NUNCA em código)
- [ ] HTTPS obrigatório (Vercel default)
- [ ] CORS restrito (apenas seu domínio)
- [ ] Rate limiting: 100 req/15min (geral), 5 req/min (pagamento)
- [ ] Validação Zod em todos endpoints
- [ ] WhatsApp criptografado em Sheets (AES-256-GCM)
- [ ] Sem PII em logs

---

## ❌ EXPLICITAMENTE EXCLUÍDO DO MVP (V2.0)

### Recursos que NÃO estão no V1.0:
- ❌ Evolution API WhatsApp (usar link wa.me)
- ❌ Dark mode
- ❌ Admin dashboard visual (usar Google Sheets)
- ❌ Analytics avançado / dashboards
- ❌ Testes de penetração
- ❌ Acessibilidade WCAG AA completa (apenas WCAG A)
- ❌ Backup automático (será feito manualmente)
- ❌ Múltiplos idiomas
- ❌ Sistema de permissões granular (RBAC apenas básico)
- ❌ Notificações por email/SMS
- ❌ Reembolso automático
- ❌ Sistema de cupom/desconto
- ❌ Galeria de eventos anteriores (histórico)
- ❌ Upload de logo customizável
- ❌ Geolocalização
- ❌ Integração com Instagram/redes sociais

---

## 📊 DEFINIÇÃO DE PRONTO (Definition of Done)

Uma feature é considerada "pronta" para o MVP quando:

### Código
- [ ] Implementado conforme especificação
- [ ] Sem console.log ou debugger deixado
- [ ] Seguindo CODE_STANDARDS.md
- [ ] ESLint pass (sem warnings)
- [ ] Prettier formatado

### Testes
- [ ] Testes unitários criados (se lógica pura)
- [ ] Testes de integração criados (se usa API/Sheets)
- [ ] Testes E2E criados (se é fluxo do usuário)
- [ ] Todos os testes passando
- [ ] Coverage mínimo 70%

### Documentação
- [ ] Função documentada (JSDoc ou comentário)
- [ ] Endpoint documentado (método, URL, body, resposta)
- [ ] User guide atualizado (se feature visible)

### Segurança
- [ ] Sem hardcoding de credenciais
- [ ] Input validado (Zod no backend)
- [ ] Sem SQL injection / XSS
- [ ] Rate limiting considerado

### Verificação Final
- [ ] Testado em browser (desktop + mobile)
- [ ] Testado em staging (antes de prod)
- [ ] Não quebra features existentes

---

## 🚫 MUDANÇAS DE SCOPE PROIBIDAS

**Se alguém pedir:**
- "Podemos adicionar X feature?" → Resposta: "V2.0 roadmap"
- "Podemos melhorar Y?" → Resposta: "Depois do MVP"
- "Por que não Z?" → Resposta: "Constraints de tempo/pessoa, V2.0"

**Scope congelado até V1.0 lançado em produção.**

---

## ✨ SUCESSO DO MVP

MVP V1.0 é sucesso quando:
1. ✅ Fotógrafo faz upload → App Script processa em <5 min
2. ✅ Cliente vê foto na galeria com tarja
3. ✅ Cliente seleciona fotos → insere WhatsApp → vê QR Pix
4. ✅ Cliente paga Pix → recebe link Drive via WhatsApp em <2 min
5. ✅ Admin vê tudo em Google Sheets (simples, funcional)
6. ✅ Sem erros críticos em 24h de uso real
7. ✅ Timeline: finalizado em 7 semanas

---

## 📅 Próximo Passo

Documento `ROADMAP_SOLO.md` detalha semana-a-semana como implementar tudo isso.
