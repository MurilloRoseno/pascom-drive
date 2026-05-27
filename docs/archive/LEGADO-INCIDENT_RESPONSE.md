# INCIDENT_RESPONSE.md - O Que Fazer Quando Quebra

**Objetivo:** Guia rÃ¡pido para resolver problemas em produÃ§Ã£o
**Desenvolvedor:** 1 pessoa
**Tempo resposta:** CrÃ­tico (<1h), Alto (<4h), MÃ©dio (<1 dia)

---

## ðŸš¨ PRIORIDADE: CRÃTICA

### 1. SISTEMA TODO DOWN (UsuÃ¡rio nÃ£o consegue acessar)

**Sintomas:**
- Frontend nÃ£o carrega (http://dominio.vercel.app = erro 500/timeout)
- Backend nÃ£o responde (API calls falham)
- Google Sheet nÃ£o abre/salva

**Primeira aÃ§Ã£o (5 min):**
```bash
# 1. Verificar status Vercel
# VÃ¡ para: https://vercel.com/seu-projeto
# Status = Deploy em progresso? Red X?

# 2. Verificar Google Cloud
# VÃ¡ para: https://console.cloud.google.com/
# Quota exceeded? API down?

# 3. Verificar logs
# Vercel: Deployments â†’ Ãºltimo deploy â†’ Logs
# Google Cloud: Cloud Logging

# 4. Rollback se necessÃ¡rio
git revert HEAD~1
git push  # redeploy automÃ¡tico
```

**Se nÃ£o resolve (15 min):**
```
[ ] Limpar cache: Vercel "Redeploy"
[ ] Verificar variÃ¡veis ambiente estÃ£o lÃ¡ (Vercel Settings)
[ ] Google Sheets estÃ¡ online? Tenta acessar direto
[ ] Mercado Pago status? (https://status.mercadopago.com)
```

**Se ainda nÃ£o resolve (30 min):**
```
[ ] Chamar Vercel Support (tem opÃ§Ã£o no console)
[ ] Chamar Google Cloud Support
[ ] Comunicar parÃ³quia: Sistema temporariamente down
[ ] Monitorar logs a cada 2min
```

---

### 2. WEBHOOK NÃƒO CHEGA (Clientes pagam mas nÃ£o recebem fotos)

**Sintomas:**
- Payment status fica "pending" (nÃ£o muda para "approved")
- Fotos nÃ£o sÃ£o entregues via WhatsApp
- Google Sheet nÃ£o atualiza apÃ³s pagamento

**Primeira aÃ§Ã£o (5 min):**
```bash
# 1. Verificar se webhook foi recebido
# VÃ¡ para: Mercado Pago â†’ Settings â†’ Webhooks
# Veja "recent deliveries" - foi entregue?

# 2. Verificar SE MERCADO PAGO RECEBEU pagamento
# VÃ¡ para: MP dashboard â†’ TransaÃ§Ãµes
# Seu pagamento tÃ¡ lÃ¡ com status "approved"?

# 3. Se webhook foi entregue, check logs
# Vercel: /webhook/mercado-pago logs
# Procure por erro HMAC, parse error, etc
```

**Se webhook foi entregue mas erro em logs:**
```bash
# Tipicamente erro de validaÃ§Ã£o HMAC ou database
[ ] Verifique MERCADO_PAGO_WEBHOOK_SECRET estÃ¡ correto em Vercel
[ ] Verifique Google Sheet estÃ¡ acessÃ­vel e nÃ£o locked
[ ] Verifique rate limit nÃ£o estÃ¡ bloqueando

# Se achou erro, fix + redeploy
git commit -m "fix: webhook HMAC validation"
git push
```

**Se webhook NÃƒO foi entregue:**
```
[ ] Mercado Pago URL correta? (Settings â†’ Webhooks)
[ ] URL retorna 200 OK? Teste com curl:
    curl -X POST https://seu-dominio.vercel.app/webhook/mercado-pago \
      -H "Content-Type: application/json" \
      -d '{"test": true}'
[ ] Mercado Pago firewall bloqueando? (improvÃ¡vel)
[ ] Status de Mercado Pago API (https://status.mercadopago.com)
```

**Manual workaround:**
```javascript
// Se webhook nÃ£o volta, trigger manual
// Apps Script: FunÃ§Ã£o que busca transaÃ§Ãµes "Approved" e envia WhatsApp

function enviarWhatsAppManuais() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const rows = sheet.getRange('A:L').getValues();
  
  for (const row of rows) {
    if (row[6] === 'Pago' && !row[7]) { // Status=Pago, WhatsApp nÃ£o enviado
      enviarWhatsApp(row);
    }
  }
}

// Roda uma vez e vÃª se funciona
```

---

### 3. MERCADO PAGO API REJEITANDO (Erro ao criar Pix)

**Sintomas:**
- "Invalid access token"
- "Invalid signature"
- "Request timeout"

**Primeira aÃ§Ã£o (5 min):**
```bash
# 1. Verificar token
# Vercel Settings â†’ Env vars
# Verificar: MERCADO_PAGO_ACCESS_TOKEN comeÃ§a com "TEST_" (dev)?

# 2. Mercado Pago status?
# https://status.mercadopago.com - check API status

# 3. Token expirou?
# Mercado Pago credentials renovam? (improvÃ¡vel)
```

**Se token estÃ¡ OK:**
```bash
# Testar diretamente
curl -X GET https://api.mercadopago.com/v1/payments/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Se retorna erro, token invÃ¡lido
# VÃ¡ para MP â†’ Settings â†’ Credentials â†’ copie novamente
# Atualize em Vercel secrets
```

---

## âš ï¸ PRIORIDADE: ALTA

### 4. GOOGLE SHEETS NÃƒO ATUALIZA

**Sintomas:**
- Fotos processadas nÃ£o aparecem em Google Sheet
- Status "Aguardando" nÃ£o muda para "Pago"
- Webhook processa mas Sheet vazio

**Primeira aÃ§Ã£o (10 min):**
```bash
# 1. Verificar if Sheet estÃ¡ locked/editing
# Abra Google Sheet manualmente
# Tem alguÃ©m editando? Tira ele

# 2. Verificar se credenciais estÃ£o OK
# Google Cloud â†’ Service Account â†’ Keys
# Verificar se ainda existe a key

# 3. Verificar se Sheet foi compartilhado
# Google Sheet â†’ Share
# Email: paroquia-fotos-backend@projeto.iam.gserviceaccount.com
# Verificar se tem acesso EDITOR

# 4. Teste direto
# Apps Script console
function testarSheets() {
  const sheet = SpreadsheetApp.getActiveSheet();
  sheet.appendRow(['TEST', 'row']);
}
// Execute â†’ deve adicionar linha
```

**Se credenciais estÃ£o OK:**
```bash
# Pode ser quota excedida
# Google Cloud â†’ APIs & Services â†’ Quotas
# Verificar se estamos no limite

# Ou campo de Sheet nÃ£o existe
# Verificar estrutura: ID | Evento | Foto Original | ... | Status
```

---

### 5. MARCA D'ÃGUA NÃƒO FUNCIONA

**Sintomas:**
- Apps Script error "ImageMagick not found"
- Fotos salvas mas SEM tarja
- Apps Script logs mostram erro na marca

**Primeira aÃ§Ã£o (10 min):**
```bash
# 1. Check Apps Script logs
# Apps Script Editor â†’ Executions
# Procure linha falhada

# 2. Se Ã© erro de ImageMagick
# Usar fallback: somente salvar cÃ³pia (sem tarja)
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
# OpÃ§Ã£o 1: Usar API online
# https://cloudconvert.com (tem free tier)
# Chamar via UrlFetchApp

# OpÃ§Ã£o 2: Usar biblioteca Google Docs
# Inserir imagem em Doc, exportar como PNG
# (mais lento mas funciona)
```

---

## ðŸ“‹ PRIORIDADE: MÃ‰DIA

### 6. PERFORMANCE DEGRADADA

**Sintomas:**
- Galeria carrega lento (>3s)
- QR Code polling travando
- API timeout

**Primeira aÃ§Ã£o (15 min):**
```bash
# 1. Testar no DevTools
# F12 â†’ Network â†’ reload
# Qual requisiÃ§Ã£o estÃ¡ lenta?

# 2. Se Ã© GET /api/eventos que Ã© lento
# Pode ser Google Sheets grande
# Check quantas linhas tem em Sheets

# 3. Se Ã© /api/checkout/preference que Ã© lento
# Pode ser Mercado Pago API lenta
# Teste: curl -w "@curl-format.txt" ... (mostra timing)

# 4. Cache nos headers
# Vercel auto-caches, mas verify:
# GET /api/eventos â†’ Cache-Control: public, max-age=300
```

**MitigaÃ§Ã£o rÃ¡pida:**
```javascript
// Reduzir dados retornados
// Em vez de todas fotos, apenas Ãºltimas 50
async function buscarFotos() {
  const fotos = await getFromSheets();
  return fotos.slice(0, 50); // Limitar
}

// Ou paginar
// GET /api/eventos?page=1&limit=20
```

---

### 7. CLIENTE PAGA MAS RECIBE ERRO "Pagamento nÃ£o confirmado"

**Sintomas:**
- UsuÃ¡rio vÃª QR Code, escaneia, paga Pix
- Tela continua "Aguardando..." e nunca muda
- Status API nÃ£o atualiza

**Primeira aÃ§Ã£o (10 min):**
```bash
# 1. Verificar em Mercado Pago dashboard
# O pagamento foi recebido? Status = "approved"?

# 2. Verificar em Google Sheet
# Tem linha com transactionId deste pagamento?
# Qual Ã© o status (Pendente, Pago, etc)?

# 3. Se Sheet tem mas status Ã© "Pendente"
# Significa webhook nÃ£o foi processado
# Ver item "WEBHOOK NÃƒO CHEGA" acima
```

**SoluÃ§Ã£o rÃ¡pida (cliente):**
```
1. PeÃ§a para fazer reload da pÃ¡gina
2. Pode que webhook chegou mas frontend nÃ£o atualizou
3. Se ainda nÃ£o muda, diga:
   "Fotos foram pagas, admin vai enviar via WhatsApp em breve"
4. VocÃª envia manualmente (Apps Script):
   function enviarParaCliente() {
     // Busca linhas com Status = "Pago"
     // Envia WhatsApp manualmente
   }
```

---

## ðŸ”§ TROUBLESHOOTING: Checklist Geral

### "NÃ£o sei o que estÃ¡ quebrado"

```bash
# 1. Verifique status geral
[ ] Frontend carrega? (http://dominio.com)
[ ] API responde? (curl http://dominio/api/eventos)
[ ] Google Sheet online? (drive.google.com)
[ ] Mercado Pago online? (mercadopago.com)

# 2. Check logs
Vercel Deployments â†’ Ãºltimo â†’ Logs
Google Cloud â†’ Cloud Logging
Apps Script â†’ Executions

# 3. Vercel Redeploy
Vercel Console â†’ Project â†’ Deployments â†’ Redeploy last

# 4. Google Cloud check
https://console.cloud.google.com/
Status de APIs â†’ Alguma vermelha?

# 5. Se tudo acima OK, issue Ã© cliente-side
# F12 â†’ Console
# Que erro mostra?
```

---

## ðŸ“ž ESCALAÃ‡ÃƒO: Quando Chamar Suporte

### Vercel Support
**Quando:** API estÃ¡ down, deploy nÃ£o funciona, secrets perdidos
**Como:** Vercel Console â†’ Settings â†’ Support â†’ Chat/Email
**SLA:** ~1h para resposta

### Google Cloud Support
**Quando:** API quota excedida, autenticaÃ§Ã£o falha, limite atingido
**Como:** Google Cloud Console â†’ Support â†’ Create ticket
**SLA:** ~2h para resposta

### Mercado Pago Support
**Quando:** Webhook nÃ£o chega, token invÃ¡lido, taxa incorreta
**Como:** Mercado Pago App â†’ Suporte
**SLA:** ~4h para resposta

---

## âœ… CHECKLIST: Antes de Comunicar "Resolvido"

ApÃ³s fix, verificar:
```bash
[ ] Testes passam (npm test)
[ ] Frontend carrega sem erro (F12 â†’ Console vazio)
[ ] API responde (curl /api/eventos = 200)
[ ] Google Sheet atualiza (adicionar linha manual, aparece em 5s)
[ ] Webhook chega (teste com webhook.site)
[ ] Mercado Pago transaction mostra "approved"
[ ] Logs nÃ£o tÃªm erro (Vercel â†’ Logs, Google Cloud â†’ Logging)
[ ] Manual testing: comprar 1 foto end-to-end
```

---

## ðŸ“Š STATUSPAGE (ComunicaÃ§Ã£o ParÃ³quia)

Se sistema fica down >15 min, comunicar:

**Mensagem template:**
```
ðŸ”§ Sistema temporariamente indisponÃ­vel

Desculpe, o sistema de venda de fotos estÃ¡ em manutenÃ§Ã£o.
VocÃª nÃ£o consegue comprar fotos agora, mas voltaremos em breve.

ETA: [seu_tempo_estimado]

DÃºvidas: [seu_email]
```

---

## ðŸŽ“ APRENDIZADO: Prevenir Futuros Incidentes

Depois de resolver, SEMPRE:
```markdown
## Incident: [Nome do Problema]

**O que aconteceu:**
[DescriÃ§Ã£o]

**Raiz causa:**
[Por que quebrou]

**Como resolveu:**
[AÃ§Ã£o que funcionou]

**Como prevenir:**
- [ ] Adicionar teste (se existe test)
- [ ] Alertar se X acontecer (monitoring)
- [ ] Documentar em TROUBLESHOOTING.md
```

**Exemplo:**
```markdown
## Incident: Webhook nÃ£o chegou por token invÃ¡lido

Raiz causa: Token expirou / foi regenerado

Como prevenir:
- [ ] Adicionar alerta: IF webhook status code = 401 â†’ email admin
- [ ] Documentar em .env que token pode expirar (nÃ£o Ã© permanente)
- [ ] Adicionar teste de webhook monthly
```

---

## ðŸ“š DOCUMENTAÃ‡ÃƒO RELACIONADA

- **MONITORING.md** - Como saber que quebrou (alertas)
- **TROUBLESHOOTING.md** - Guia mais detalhado
- **BACKUPA_RECOVERY.md** - Se precisar restaurar dados
