# INCIDENT_RESPONSE.md - O Que Fazer Quando Quebra

**Objetivo:** Guia rápido para resolver problemas em produção
**Desenvolvedor:** 1 pessoa
**Tempo resposta:** Crítico (<1h), Alto (<4h), Médio (<1 dia)

---

## 🚨 PRIORIDADE: CRÍTICA

### 1. SISTEMA TODO DOWN (Usuário não consegue acessar)

**Sintomas:**
- Frontend não carrega (http://dominio.vercel.app = erro 500/timeout)
- Backend não responde (API calls falham)
- Google Sheet não abre/salva

**Primeira ação (5 min):**
```bash
# 1. Verificar status Vercel
# Vá para: https://vercel.com/seu-projeto
# Status = Deploy em progresso? Red X?

# 2. Verificar Google Cloud
# Vá para: https://console.cloud.google.com/
# Quota exceeded? API down?

# 3. Verificar logs
# Vercel: Deployments → último deploy → Logs
# Google Cloud: Cloud Logging

# 4. Rollback se necessário
git revert HEAD~1
git push  # redeploy automático
```

**Se não resolve (15 min):**
```
[ ] Limpar cache: Vercel "Redeploy"
[ ] Verificar variáveis ambiente estão lá (Vercel Settings)
[ ] Google Sheets está online? Tenta acessar direto
[ ] Mercado Pago status? (https://status.mercadopago.com)
```

**Se ainda não resolve (30 min):**
```
[ ] Chamar Vercel Support (tem opção no console)
[ ] Chamar Google Cloud Support
[ ] Comunicar paróquia: Sistema temporariamente down
[ ] Monitorar logs a cada 2min
```

---

### 2. WEBHOOK NÃO CHEGA (Clientes pagam mas não recebem fotos)

**Sintomas:**
- Payment status fica "pending" (não muda para "approved")
- Fotos não são entregues via WhatsApp
- Google Sheet não atualiza após pagamento

**Primeira ação (5 min):**
```bash
# 1. Verificar se webhook foi recebido
# Vá para: Mercado Pago → Settings → Webhooks
# Veja "recent deliveries" - foi entregue?

# 2. Verificar SE MERCADO PAGO RECEBEU pagamento
# Vá para: MP dashboard → Transações
# Seu pagamento tá lá com status "approved"?

# 3. Se webhook foi entregue, check logs
# Vercel: /webhook/mercado-pago logs
# Procure por erro HMAC, parse error, etc
```

**Se webhook foi entregue mas erro em logs:**
```bash
# Tipicamente erro de validação HMAC ou database
[ ] Verifique MERCADO_PAGO_WEBHOOK_SECRET está correto em Vercel
[ ] Verifique Google Sheet está acessível e não locked
[ ] Verifique rate limit não está bloqueando

# Se achou erro, fix + redeploy
git commit -m "fix: webhook HMAC validation"
git push
```

**Se webhook NÃO foi entregue:**
```
[ ] Mercado Pago URL correta? (Settings → Webhooks)
[ ] URL retorna 200 OK? Teste com curl:
    curl -X POST https://seu-dominio.vercel.app/webhook/mercado-pago \
      -H "Content-Type: application/json" \
      -d '{"test": true}'
[ ] Mercado Pago firewall bloqueando? (improvável)
[ ] Status de Mercado Pago API (https://status.mercadopago.com)
```

**Manual workaround:**
```javascript
// Se webhook não volta, trigger manual
// Apps Script: Função que busca transações "Approved" e envia WhatsApp

function enviarWhatsAppManuais() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rows = sheet.getRange('A:L').getValues();
  
  for (const row of rows) {
    if (row[6] === 'Pago' && !row[7]) { // Status=Pago, WhatsApp não enviado
      enviarWhatsApp(row);
    }
  }
}

// Roda uma vez e vê se funciona
```

---

### 3. MERCADO PAGO API REJEITANDO (Erro ao criar Pix)

**Sintomas:**
- "Invalid access token"
- "Invalid signature"
- "Request timeout"

**Primeira ação (5 min):**
```bash
# 1. Verificar token
# Vercel Settings → Env vars
# Verificar: MERCADO_PAGO_ACCESS_TOKEN começa com "TEST_" (dev)?

# 2. Mercado Pago status?
# https://status.mercadopago.com - check API status

# 3. Token expirou?
# Mercado Pago credentials renovam? (improvável)
```

**Se token está OK:**
```bash
# Testar diretamente
curl -X GET https://api.mercadopago.com/v1/payments/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Se retorna erro, token inválido
# Vá para MP → Settings → Credentials → copie novamente
# Atualize em Vercel secrets
```

---

## ⚠️ PRIORIDADE: ALTA

### 4. GOOGLE SHEETS NÃO ATUALIZA

**Sintomas:**
- Fotos processadas não aparecem em Google Sheet
- Status "Aguardando" não muda para "Pago"
- Webhook processa mas Sheet vazio

**Primeira ação (10 min):**
```bash
# 1. Verificar if Sheet está locked/editing
# Abra Google Sheet manualmente
# Tem alguém editando? Tira ele

# 2. Verificar se credenciais estão OK
# Google Cloud → Service Account → Keys
# Verificar se ainda existe a key

# 3. Verificar se Sheet foi compartilhado
# Google Sheet → Share
# Email: paroquia-fotos-backend@projeto.iam.gserviceaccount.com
# Verificar se tem acesso EDITOR

# 4. Teste direto
# Apps Script console
function testarSheets() {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow(['TEST', 'row']);
}
// Execute → deve adicionar linha
```

**Se credenciais estão OK:**
```bash
# Pode ser quota excedida
# Google Cloud → APIs & Services → Quotas
# Verificar se estamos no limite

# Ou campo de Sheet não existe
# Verificar estrutura: ID | Evento | Foto Original | ... | Status
```

---

### 5. MARCA D'ÁGUA NÃO FUNCIONA

**Sintomas:**
- Apps Script error "ImageMagick not found"
- Fotos salvas mas SEM tarja
- Apps Script logs mostram erro na marca

**Primeira ação (10 min):**
```bash
# 1. Check Apps Script logs
# Apps Script Editor → Executions
# Procure linha falhada

# 2. Se é erro de ImageMagick
# Usar fallback: somente salvar cópia (sem tarja)
// Marca.gs
function aplicarMarcaDAgua(arquivo) {
  // Se ImageMagick falha, apenas copiar
  const pasta = DriveApp.getFoldersByName('Processadas_Amostras').next();
  const copia = pasta.createFile(arquivo.getBlob());
  return { sucesso: true, arq: copia };
}
```

**Se quer marque de verdade:**
```bash
# Opção 1: Usar API online
# https://cloudconvert.com (tem free tier)
# Chamar via UrlFetchApp

# Opção 2: Usar biblioteca Google Docs
# Inserir imagem em Doc, exportar como PNG
# (mais lento mas funciona)
```

---

## 📋 PRIORIDADE: MÉDIA

### 6. PERFORMANCE DEGRADADA

**Sintomas:**
- Galeria carrega lento (>3s)
- QR Code polling travando
- API timeout

**Primeira ação (15 min):**
```bash
# 1. Testar no DevTools
# F12 → Network → reload
# Qual requisição está lenta?

# 2. Se é GET /api/fotos que é lento
# Pode ser Google Sheets grande
# Check quantas linhas tem em Sheets

# 3. Se é /api/criar-pagamento que é lento
# Pode ser Mercado Pago API lenta
# Teste: curl -w "@curl-format.txt" ... (mostra timing)

# 4. Cache nos headers
# Vercel auto-caches, mas verify:
# GET /api/fotos → Cache-Control: public, max-age=300
```

**Mitigação rápida:**
```javascript
// Reduzir dados retornados
// Em vez de todas fotos, apenas últimas 50
async function buscarFotos() {
  const fotos = await getFromSheets();
  return fotos.slice(0, 50); // Limitar
}

// Ou paginar
// GET /api/fotos?page=1&limit=20
```

---

### 7. CLIENTE PAGA MAS RECIBE ERRO "Pagamento não confirmado"

**Sintomas:**
- Usuário vê QR Code, escaneia, paga Pix
- Tela continua "Aguardando..." e nunca muda
- Status API não atualiza

**Primeira ação (10 min):**
```bash
# 1. Verificar em Mercado Pago dashboard
# O pagamento foi recebido? Status = "approved"?

# 2. Verificar em Google Sheet
# Tem linha com transactionId deste pagamento?
# Qual é o status (Pendente, Pago, etc)?

# 3. Se Sheet tem mas status é "Pendente"
# Significa webhook não foi processado
# Ver item "WEBHOOK NÃO CHEGA" acima
```

**Solução rápida (cliente):**
```
1. Peça para fazer reload da página
2. Pode que webhook chegou mas frontend não atualizou
3. Se ainda não muda, diga:
   "Fotos foram pagas, admin vai enviar via WhatsApp em breve"
4. Você envia manualmente (Apps Script):
   function enviarParaCliente() {
     // Busca linhas com Status = "Pago"
     // Envia WhatsApp manualmente
   }
```

---

## 🔧 TROUBLESHOOTING: Checklist Geral

### "Não sei o que está quebrado"

```bash
# 1. Verifique status geral
[ ] Frontend carrega? (http://dominio.com)
[ ] API responde? (curl http://dominio/api/fotos)
[ ] Google Sheet online? (drive.google.com)
[ ] Mercado Pago online? (mercadopago.com)

# 2. Check logs
Vercel Deployments → último → Logs
Google Cloud → Cloud Logging
Apps Script → Executions

# 3. Vercel Redeploy
Vercel Console → Project → Deployments → Redeploy last

# 4. Google Cloud check
https://console.cloud.google.com/
Status de APIs → Alguma vermelha?

# 5. Se tudo acima OK, issue é cliente-side
# F12 → Console
# Que erro mostra?
```

---

## 📞 ESCALAÇÃO: Quando Chamar Suporte

### Vercel Support
**Quando:** API está down, deploy não funciona, secrets perdidos
**Como:** Vercel Console → Settings → Support → Chat/Email
**SLA:** ~1h para resposta

### Google Cloud Support
**Quando:** API quota excedida, autenticação falha, limite atingido
**Como:** Google Cloud Console → Support → Create ticket
**SLA:** ~2h para resposta

### Mercado Pago Support
**Quando:** Webhook não chega, token inválido, taxa incorreta
**Como:** Mercado Pago App → Suporte
**SLA:** ~4h para resposta

---

## ✅ CHECKLIST: Antes de Comunicar "Resolvido"

Após fix, verificar:
```bash
[ ] Testes passam (npm test)
[ ] Frontend carrega sem erro (F12 → Console vazio)
[ ] API responde (curl /api/fotos = 200)
[ ] Google Sheet atualiza (adicionar linha manual, aparece em 5s)
[ ] Webhook chega (teste com webhook.site)
[ ] Mercado Pago transaction mostra "approved"
[ ] Logs não têm erro (Vercel → Logs, Google Cloud → Logging)
[ ] Manual testing: comprar 1 foto end-to-end
```

---

## 📊 STATUSPAGE (Comunicação Paróquia)

Se sistema fica down >15 min, comunicar:

**Mensagem template:**
```
🔧 Sistema temporariamente indisponível

Desculpe, o sistema de venda de fotos está em manutenção.
Você não consegue comprar fotos agora, mas voltaremos em breve.

ETA: [seu_tempo_estimado]

Dúvidas: [seu_email]
```

---

## 🎓 APRENDIZADO: Prevenir Futuros Incidentes

Depois de resolver, SEMPRE:
```markdown
## Incident: [Nome do Problema]

**O que aconteceu:**
[Descrição]

**Raiz causa:**
[Por que quebrou]

**Como resolveu:**
[Ação que funcionou]

**Como prevenir:**
- [ ] Adicionar teste (se existe test)
- [ ] Alertar se X acontecer (monitoring)
- [ ] Documentar em TROUBLESHOOTING.md
```

**Exemplo:**
```markdown
## Incident: Webhook não chegou por token inválido

Raiz causa: Token expirou / foi regenerado

Como prevenir:
- [ ] Adicionar alerta: IF webhook status code = 401 → email admin
- [ ] Documentar em .env que token pode expirar (não é permanente)
- [ ] Adicionar teste de webhook monthly
```

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- **MONITORING.md** - Como saber que quebrou (alertas)
- **TROUBLESHOOTING.md** - Guia mais detalhado
- **BACKUPA_RECOVERY.md** - Se precisar restaurar dados
