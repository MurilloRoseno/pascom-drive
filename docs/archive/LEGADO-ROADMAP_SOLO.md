# ROADMAP_SOLO.md - 7 Semanas para MVP Pronto

**Desenvolvedor:** 1 pessoa
**Carga horária:** 40-50h/semana (segunda-sexta, 8-10h/dia)
**Data início:** Segunda-feira (semana 1)
**Data alvo:** Pronto produção na quinta-feira (semana 7)

---

## 📅 SEMANA 1-2: Google Apps Script (Processamento)

**Foco:** Automatizar marca d'água + registro em Sheets
**Horas:** ~80h (semana cheia)
**Entrega:** Sistema de processamento funcionando

### Dia 1-2: Setup + Hello World
- [ ] Criar projeto Google Apps Script (via clasp)
- [ ] Entender Drive API, Sheets API (tutoriais Google ~2h)
- [ ] Setup local: npm + jest mocks (~1h)
- [ ] Rodar teste hello-world do Apps Script (~30m)

### Dia 3-4: Marca d'Água
- [ ] Função `aplicarMarcaDAgua()` - baixar imagem do Drive
- [ ] Sobrepor logo + texto diagonal (ImageMagick ou UrlFetchApp)
- [ ] Salvar em `/Processadas_Amostras/` e `/Processadas_Originais/`
- [ ] Testes unitários
- [ ] Debug com foto real (~2h)

### Dia 5-7: Google Sheets + Monitoramento
- [ ] Estrutura Google Sheet: colunas (ID, Evento, Links, Status, etc)
- [ ] Função `registrarFotoProcessada()` - salvar metadados
- [ ] Função `buscarFotosComStatusPago()` - find para entrega
- [ ] Trigger automático: `ScriptApp.newTrigger().everyMinutes(5)`
- [ ] Erro handling: retry automático, email para admin
- [ ] Testes (mocks de Sheet/Drive)

### Dia 8-10: Integração End-to-End
- [ ] E2E test: upload foto → processa → aparece em Sheet em <5min
- [ ] Validação: ID único, timestamps, paths corretos
- [ ] Manual testing com fotógrafo real (se possível)

**Checklist Semana 1-2:**
- [ ] `/Processadas_Originais/` criada (fotos sem tarja)
- [ ] `/Processadas_Amostras/` criada (fotos com tarja)
- [ ] Google Sheet com >5 fotos de teste processadas
- [ ] Trigger rodando a cada 5 min (verificável no Apps Script logs)
- [ ] Erro handling: foto corrompida → email para admin
- [ ] Testes passando (70%+ coverage)

---

## 📅 SEMANA 2-3: Frontend Básico (Galeria + Seleção)

**Foco:** Interface visual para cliente selecionar fotos
**Horas:** ~80h
**Entrega:** Galeria funcional, design system aplicado

### Dia 1-2: Setup Vite + Tailwind
- [ ] `npm create vite@latest frontend -- --template react`
- [ ] Instalar Tailwind CSS, configurar
- [ ] Copiar Design System da paróquia (colors_and_type.css)
- [ ] Página vazia rodando em http://localhost:3000

### Dia 3-4: Componentes Base
- [ ] `FotoCard.jsx` - card com imagem, preço, checkbox
- [ ] `GaleriaGrid.jsx` - grid responsivo (4 col desktop, 2 tablet, 1 mobile)
- [ ] `FiltroEvento.jsx` - dropdown para filtrar por evento
- [ ] `Resumo.jsx` - mostra subtotal, taxa, total em tempo real
- [ ] Estilos Tailwind + Design System

### Dia 5-6: Lógica React
- [ ] Hook de eventos - fetch /api/eventos
- [ ] Hook `useCarrinho()` - localStorage para selecionadas
- [ ] Estado global Context (CarrinhoContext)
- [ ] Lazy loading de imagens (Intersection Observer)
- [ ] Filtro por evento (client-side)

### Dia 7-8: Fluxo Step-by-Step
- [ ] `pages/index.jsx` - Galeria pública (step 1)
- [ ] `pages/compra/index.jsx` - Multi-step (steps 2-4)
- [ ] Navegação entre steps (botões "Próximo" / "Voltar")
- [ ] Scroll to top no change de step

### Dia 9-10: Testes
- [ ] Testes unitários de cálculos (subtotal, taxa)
- [ ] Testes de componentes (FotoCard, GaleriaGrid)
- [ ] Testes E2E (Playwright): selecionar foto → avançar step
- [ ] Responsividade mobile (DevTools)

**Checklist Semana 2-3:**
- [ ] http://localhost:3000 mostra galeria com fotos mock
- [ ] Pode selecionar fotos (checkbox funciona)
- [ ] Resumo atualiza em tempo real
- [ ] Pode clicar "Próximo" (navega para step 2)
- [ ] Layout responsivo mobile/tablet/desktop
- [ ] Sem mock data hardcoded (fetch /api/eventos)
- [ ] Testes passando (70%+ coverage)

---

## 📅 SEMANA 3-4: Backend APIs (Vercel Functions)

**Foco:** Endpoints REST para galeria + pagamento
**Horas:** ~70h
**Entrega:** APIs testadas em sandbox

### Dia 1-2: Setup Vercel + Express
- [ ] Vercel: conectar GitHub, primeiro deploy
- [ ] `backend/api/eventos.js` - GET /api/eventos (lista eventos publicados)
- [ ] Teste com curl: `curl http://localhost:3001/api/eventos`

### Dia 3-4: Mercado Pago Client
- [ ] Lib `backend/lib/mercado-pago.js` - wrapper para MP API
- [ ] Função `criarPagamentoPix()` - chama MP v1/payments
- [ ] Função `verificarPagamento()` - check status
- [ ] Testes com sandbox MP tokens
- [ ] Teste manual: gerar Pix, escanear (não paga, é sandbox)

### Dia 5-6: Endpoints Pagamento
- [ ] `backend/api/checkout-preference.js` - POST /api/checkout/preference
  - Validar WhatsApp (regex)
  - Validar fotos selecionadas (IDs)
  - Validar total (>0, <10.000)
  - Registrar em Google Sheet
  - Chamar Mercado Pago
  - Retornar QR Code
- [ ] `backend/api/status-pagamento.js` - GET /api/status-pagamento
  - Poll status pagamento a cada 2s (frontend faz)
  - Timeout 30 min
- [ ] Testes unitários + integration

### Dia 7-8: Webhook Mercado Pago
- [ ] `backend/api/webhook/mercado-pago.js` - POST /webhook/mercado-pago
- [ ] Validar assinatura HMAC-SHA256
- [ ] Idempotência (x-request-id)
- [ ] Atualizar Sheet: status "Pagamento Confirmado"
- [ ] Testes: mock webhook, verificar assinatura
- [ ] Testar em webhook.site (forward webhooks)

### Dia 9-10: Rate Limiting + Error Handling
- [ ] Middleware rate limit: 100 req/15min (geral), 5 req/min (pagamento)
- [ ] Erro handling centralizado (try-catch, return 500)
- [ ] Logs: auditLog() sem PII
- [ ] CORS: apenas seu domínio
- [ ] Testes de error cases

**Checklist Semana 3-4:**
- [ ] `GET /api/eventos` retorna lista de eventos publicados
- [ ] `POST /api/checkout/preference` valida campos corretamente
- [ ] `GET /api/status-pagamento` returna "pending" / "approved"
- [ ] Webhook recebe, valida, atualiza Sheet
- [ ] Sem credenciais hardcoded (.env.local)
- [ ] Rate limiting funcionando
- [ ] Testes passando (70%+ coverage)

---

## 📅 SEMANA 4-5: Integração Completa (Frontend + Backend)

**Foco:** Fluxo de compra end-to-end funcional
**Horas:** ~80h
**Entrega:** Cliente pode comprar (sandbox)

### Dia 1-2: Frontend → Backend
- [ ] Frontend GET /api/eventos (ao invés de mock)
- [ ] Testes E2E: página carrega, galeria mostra fotos reais
- [ ] Erro handling no frontend (rede down, timeout)

### Dia 3-5: Steps 2-4: WhatsApp + Resumo + QR Code
- [ ] **Step 2:** Input WhatsApp com máscara (11 9 9999-9999)
  - Validação regex
  - Disabled button até valid
- [ ] **Step 3:** Resumo final
  - Mostra fotos selecionadas
  - Mostra WhatsApp
  - Mostra cálculo (subtotal, taxa, total)
  - Checkbox "Confirmo"
- [ ] **Step 4:** QR Code Pix + Polling
  - POST /api/checkout/preference (send WhatsApp, fotos, total)
  - Renderizar QR Code (qrcode.js)
  - GET /api/status-pagamento a cada 2s
  - "Aguardando..." → "✓ Pagamento Confirmado!"
  - Salvar historico localstorage

### Dia 6-7: Simular Pagamento
- [ ] Verificar que Sheet atualiza com nova transação
- [ ] Simular webhook Mercado Pago (manualmente ou webhook.site)
- [ ] Verificar que frontend muda status para "Confirmado"

### Dia 8-10: Testes E2E Completos
- [ ] Playwright: upload foto → galeria → selecionar → WhatsApp → QR → pagar
- [ ] Teste de erro: WhatsApp inválido → message erro
- [ ] Teste de erro: timeout pagamento → volta pra início
- [ ] Teste mobile: responsividade durante fluxo

**Checklist Semana 4-5:**
- [ ] Cliente seleciona fotos em galeria
- [ ] Clica "Próximo" → insere WhatsApp
- [ ] Clica "Próximo" → vê resumo
- [ ] Clica "Pagar" → vê QR Code Pix
- [ ] QR Code atualiza status a cada 2s
- [ ] Google Sheet mostra transação nova com status "Pendente"
- [ ] Testes E2E passando (happy path)

---

## 📅 SEMANA 5-6: Entrega WhatsApp + Testes Completos

**Foco:** Enviar fotos via WhatsApp + test suite completo
**Horas:** ~70h
**Entrega:** Fluxo completo funcionando, testes 70%+

### Dia 1-3: Entrega WhatsApp (Apps Script)
- [ ] Função `enviarWhatsApp()` - disparada após pagamento
- [ ] Gerar links Drive compartilhados
- [ ] Montar mensagem personalizada
- [ ] Enviar via `https://wa.me/55${numero}?text=...`
- [ ] Atualizar Sheet: status "Entregue"
- [ ] Retry automático (máx 3x se erro)
- [ ] Testes (mock UrlFetchApp)

### Dia 4-5: Stress Tests
- [ ] loadtest: 50 usuários simultâneos na galeria
- [ ] loadtest: 10 pagamentos/min
- [ ] Verificar: não quebraNem qué problemas de performance
- [ ] Logs: não há errors críticos

### Dia 6-8: Cobertura de Testes
- [ ] Rodar `npm test -- --coverage`
- [ ] Garantir 70%+ de coverage
- [ ] Adicionar testes faltando
- [ ] Fix bugs encontrados por testes

### Dia 9-10: Documentação + Manual Testing
- [ ] Update API_DOCUMENTATION.md (endpoints)
- [ ] Update DEVELOPER_GUIDE.md (como rodar tudo)
- [ ] Manual testing com personas:
  - Fotógrafo: upload foto
  - Cliente: compra fotos
  - Admin: verifica Sheets

**Checklist Semana 5-6:**
- [ ] Cliente recebe link Drive via WhatsApp <2 min após pagamento
- [ ] Link Download funciona
- [ ] Google Sheet completo (ID, evento, WhatsApp, status, timestamp, etc)
- [ ] Jest coverage 70%+
- [ ] Stress tests passando (50 users, 10 pag/min)
- [ ] Sem errors críticos em logs

---

## 📅 SEMANA 6-7: Cleanup + Deploy Produção

**Foco:** Segurança, documentação, deploy
**Horas:** ~60h
**Entrega:** Sistema pronto para paróquia usar

### Dia 1-2: Setup Google Cloud + Credenciais Produção
- [ ] Criar projeto Google Cloud (produção)
- [ ] Gerar credenciais de serviço
- [ ] Criar Google Sheet produção
- [ ] Testar conexão backend → Sheets produção

### Dia 3-4: Mercado Pago Produção
- [ ] Criar conta Mercado Pago produção
- [ ] Gerar tokens produção
- [ ] Registrar webhook URL em produção (Vercel)
- [ ] Testar com Pix real (pequeno valor)

### Dia 5: Deploy Vercel
- [ ] Setup secrets no Vercel dashboard
- [ ] Deploy backend
- [ ] Setup custom domain (se tiver)
- [ ] Teste: chamadas reais ao backend

### Dia 6: Deploy Google Apps Script
- [ ] Publicar versão produção
- [ ] Testar trigger automático (5 min)
- [ ] Verify: marca d'água aplicada corretamente

### Dia 7: QA + Documentação Final
- [ ] Rodar todos testes 1 última vez
- [ ] Teste manual completo (upload → compra → entrega)
- [ ] Update README.md
- [ ] Update TROUBLESHOOTING.md
- [ ] Criar USER_GUIDE (para fotógrafos, clientes, admin)

**Checklist Final:**
- [ ] Sistema rodando em produção
- [ ] Testes passando (100% suite)
- [ ] Coverage 70%+
- [ ] Documentação completa
- [ ] Admin pode verificar tudo em Google Sheets
- [ ] Pronto para paróquia usar!

---

## 📊 Resumo Timeline

| Semana | Foco | Horas | Status |
|--------|------|-------|--------|
| 1-2 | Apps Script + Processamento | 80h | ⬜ To Do |
| 2-3 | Frontend (Galeria) | 80h | ⬜ To Do |
| 3-4 | Backend APIs | 70h | ⬜ To Do |
| 4-5 | Integração Completa | 80h | ⬜ To Do |
| 5-6 | Entrega + Testes | 70h | ⬜ To Do |
| 6-7 | Deploy + Docs | 60h | ⬜ To Do |
| **TOTAL** | **MVP Pronto** | **440h** | **Cabe em 7 semanas!** |

---

## 🎯 Como Acompanhar Progresso

### Diário (fim do dia):
- [ ] Testes ainda passando?
- [ ] Código commitado e pusheado?
- [ ] README atualizado com novidades?

### Semanal (sexta-feira):
- [ ] Todos items da semana completados?
- [ ] Coverage mantido em 70%+?
- [ ] Deploy automático em staging (se tiver)?

### Bloqueadores Conhecidos:
- **Semana 2:** Se ImageMagick não funcionar, usar online API
- **Semana 4:** Se MP webhook não chegar, testar em webhook.site primeiro
- **Semana 5:** Se performance ruim, profile com DevTools

---

## 📚 Documentos Relacionados

- **MVP_FINAL.md** - O que está incluído/excluído
- **ARCHITECTURE_SINGLE_PERSON.md** - Por que não usamos X tech
- **CODE_STANDARDS.md** - Como nomear/estruturar código
- **DEFINITION_OF_DONE.md** - Quando considerar pronto

---

## ⚡ Speed Hacks (Ativado para 1 Pessoa)

1. **Reutilizar código:** Copy-paste é OK, DRY depois
2. **Mock agressivo:** Teste local com dados fake
3. **Skip perfeccionismo:** "Good enough" bate "perfect"
4. **Automação:** Scripts salvam horas (setup.sh, lint:fix)
5. **Documentar no código:** Comentários > documentação separada

**Lembre:** Melhor algo pronto em 7 semanas do que masterpiece em 4 meses.
