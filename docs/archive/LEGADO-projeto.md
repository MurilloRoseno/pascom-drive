# Plano: AutomaÃ§Ã£o Completa de Venda de Fotos - ParÃ³quia SÃ£o Rafael

## Contexto
A ParÃ³quia SÃ£o Rafael precisa de um sistema **end-to-end** para comercializar fotos de eventos religiosos (missas, batizados, casamentos, etc.) de forma profissional, automÃ¡tica e com custo zero/mÃ­nimo. O fluxo atual estÃ¡ bem desenhado conceitualmente, mas precisa de detalhamento tÃ©cnico em cada etapa para ser implementado com Google Apps Script como core da automaÃ§Ã£o.

**Problema:** Sem automaÃ§Ã£o, a PASCOM precisa manualmente:
- Organizar fotos no Drive
- Aplicar marca d'Ã¡gua
- Gerenciar vendas
- Conferir pagamentos
- Enviar fotos via WhatsApp

**SoluÃ§Ã£o:** Sistema totalmente automÃ¡tico que permite ao fotÃ³grafo apenas fazer upload, e o resto funciona sem intervenÃ§Ã£o.

---

## Arquitetura Geral

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 1. ENTRADA: Google Drive (FotÃ³grafos PASCOM)                        â”‚
â”‚    â””â”€ Pasta: /ACERVO_PAROQUIA/[Evento]/ (fotos RAW)                 â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 2. PROCESSAMENTO: Google Apps Script (AutomaÃ§Ã£o)                    â”‚
â”‚    â”œâ”€ Monitorar alteraÃ§Ãµes no Drive                                 â”‚
â”‚    â”œâ”€ Aplicar marca d'Ã¡gua (logo + texto diagonal)                  â”‚
â”‚    â”œâ”€ Gerar ID Ãºnico (FOTO_001, FOTO_002, etc)                      â”‚
â”‚    â”œâ”€ Criar pastas: /Originais e /Amostras                          â”‚
â”‚    â””â”€ Salvar metadados em Google Sheets (banco de dados leve)       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 3. VITRINE: Site Frontend (HTML/CSS/JS + Vercel/Netlify)            â”‚
â”‚    â”œâ”€ Galeria visual com amostras (Pasta B - com tarja)             â”‚
â”‚    â”œâ”€ SeleÃ§Ã£o de fotos (checkbox ou clique)                         â”‚
â”‚    â”œâ”€ Campo de entrada: WhatsApp do fiel                            â”‚
â”‚    â”œâ”€ CÃ¡lculo automÃ¡tico: valor foto + taxa de conveniÃªncia         â”‚
â”‚    â””â”€ BotÃ£o: "Gerar Pix" ou "Pagar com QR Code"                     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 4. PAGAMENTO: Mercado Pago (API + WebHook)                          â”‚
â”‚    â”œâ”€ Gerar QR Code Pix DinÃ¢mico (endpoint: /api/checkout/preference)   â”‚
â”‚    â”œâ”€ Enviar pedido para fila de processamento (Firestore/Sheet)    â”‚
â”‚    â”œâ”€ WebHook: ouvir confirmaÃ§Ã£o de pagamento (endpoint: /webhook)  â”‚
â”‚    â””â”€ Status na tela: "Aguardando..." â†’ "Confirmado!"               â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                  â†“
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ 5. ENTREGA: WhatsApp + Google Drive (AutomaÃ§Ã£o Final)               â”‚
â”‚    â”œâ”€ Buscar fotos originais (Pasta A - sem tarja)                  â”‚
â”‚    â”œâ”€ Gerar link de compartilhamento (com expiraÃ§Ã£o ou nÃ£o)         â”‚
â”‚    â”œâ”€ Enviar mensagem WhatsApp com link via Evolution API           â”‚
â”‚    â””â”€ Registrar entrega em Google Sheets (auditoria)                â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Melhorias Detalhadas por Etapa

### 1. ENTRADA DE DADOS - Google Drive Structure

**Problemas no fluxo original:**
- Estrutura de pastas nÃ£o Ã© clara para a PASCOM
- Sem nomenclatura padrÃ£o = fotos desorganizadas
- Sem rastreabilidade de quem fez upload de qual foto

**Melhorias propostas:**

```
/ACERVO_PAROQUIA
â”œâ”€â”€ /Eventos
â”‚   â”œâ”€â”€ /2026-05-04_Missa_SÃ¡bado
â”‚   â”‚   â””â”€â”€ [upload fotÃ³grafo aqui]
â”‚   â”œâ”€â”€ /2026-05-11_Batizado_Ana_Silva
â”‚   â”‚   â””â”€â”€ [upload fotÃ³grafo aqui]
â”‚   â””â”€â”€ /2026-06-15_Casamento_JoÃ£o_Maria
â”‚       â””â”€â”€ [upload fotÃ³grafo aqui]
â”œâ”€â”€ /Sistema (oculto da PASCOM)
â”‚   â”œâ”€â”€ /Processadas_Originais (fotos processadas, sem tarja)
â”‚   â”œâ”€â”€ /Processadas_Amostras (com tarja)
â”‚   â”œâ”€â”€ /Backup
â”‚   â””â”€â”€ /Metadados (Google Sheet com IDs e links)
â””â”€â”€ /Logo_Paroquia (arquivo de logo em alta resoluÃ§Ã£o)
```

**ImplementaÃ§Ã£o:**
- Criar estrutura manualmente ANTES de iniciar (ou via Google Apps Script na primeira execuÃ§Ã£o)
- PermissÃµes: FotÃ³grafo = Editor na pasta do Evento; NÃ£o vÃª Sistema/Originais
- Usar **Drive Watch API** no Apps Script para detectar novos uploads em tempo real

---

### 2. PROCESSAMENTO - Google Apps Script (O CoraÃ§Ã£o da AutomaÃ§Ã£o)

**Problemas no fluxo original:**
- Apps Script Ã© "reativo" = sÃ³ funciona em horÃ¡rios agendados (InstaLateness)
- Marca d'Ã¡gua manual Ã© ineficiente
- Sem rastreamento de quais fotos foram processadas

**Melhorias propostas:**

**2.1. Trigger AutomÃ¡tico (NÃ£o Agendado, Verdadeiramente AutomÃ¡tico)**
```
Drive.Drives.list() + onEdit() + time-based trigger
â†’ Verificar a cada 5 minutos se hÃ¡ fotos novas
â†’ Se sim, processar imediatamente
```

**2.2. Marca d'Ãgua Inteligente**
```javascript
// Usar Google Apps Script com:
// - Google Drive API para baixar imagem
// - ImageMagick ou biblioteca similar para sobrepor marca
// - Salvar resultado em /Processadas_Amostras

FunÃ§Ã£o: aplicarMarcaDAgua(nomeArquivo)
  1. Baixar imagem do Drive (Evento)
  2. Sobrepor logo + texto "Amostra - ParÃ³quia SÃ£o Rafael" em diagonal
  3. Salvar em /Processadas_Amostras com MESMO nome
  4. Criar entrada em Google Sheet: ID, nome original, timestamp, link Drive
```

**2.3. Google Sheet como Banco de Dados Leve**
Estrutura:
```
| ID         | Evento              | Foto Original | Foto Amostra | WhatsApp | Pago | Status    |
|------------|---------------------|---------------|--------------|---------|------|-----------|
| FOTO_001   | Missa SÃ¡bado        | [link Drive]  | [link Drive] | -       | NÃ£o  | Aguardando|
| FOTO_002   | Missa SÃ¡bado        | [link Drive]  | [link Drive] | 11999.. | Sim  | Entregue  |
```

**2.4. Tratamento de Erros**
- Se marca d'Ã¡gua falhar: registrar em coluna "Erro" e notificar admin via email
- Retry automÃ¡tico a cada 10 minutos

---

### 3. VITRINE - Site Frontend (Melhorias de UX)

**Problemas no fluxo original:**
- DescriÃ§Ã£o vaga sobre "galeria de amostras"
- Sem feedback visual ao usuÃ¡rio
- Sem informaÃ§Ã£o sobre qual foto foi selecionada

**Melhorias propostas:**

**3.1. Estrutura da PÃ¡gina**
```html
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ParÃ³quia SÃ£o Rafael - Compre suas Fotos                â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                         â”‚
â”‚  [Filtro: Selecionar Evento â–¼]  [Galeria Responsive]   â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”              â”‚
â”‚  â”‚ FOTO â”‚  â”‚ FOTO â”‚  â”‚ FOTO â”‚  â”‚ FOTO â”‚              â”‚
â”‚  â”‚  001 â”‚  â”‚  002 â”‚  â”‚  003 â”‚  â”‚  004 â”‚              â”‚
â”‚  â”‚ R$10 â”‚  â”‚ R$10 â”‚  â”‚ R$10 â”‚  â”‚ R$10 â”‚              â”‚
â”‚  â”‚ [ðŸ“Œ] â”‚  â”‚ [âœ“]  â”‚  â”‚      â”‚  â”‚ [ðŸ“Œ] â”‚  (check = selecionado)
â”‚  â””â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”˜              â”‚
â”‚                                                         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  RESUMO:                                                â”‚
â”‚  â”œâ”€ Fotos selecionadas: 2                              â”‚
â”‚  â”œâ”€ Subtotal: R$ 20,00                                 â”‚
â”‚  â”œâ”€ Taxa de Processamento: R$ 0,99                     â”‚
â”‚  â”œâ”€ Total: R$ 20,99                                    â”‚
â”‚  â””â”€ WhatsApp: [11 9 9999-9999]  [PrÃ³ximo]              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**3.2. Fluxo de SeleÃ§Ã£o (Multi-step)**
- **Passo 1:** Galeria + seleÃ§Ã£o de fotos
- **Passo 2:** Inserir WhatsApp (com mÃ¡scara: 11 9 9999-9999)
- **Passo 3:** Revisar resumo + taxa
- **Passo 4:** QR Code Pix para pagamento

**3.3. Detalhes TÃ©cnicos**
- **Framework:** HTML5 + Tailwind CSS (ou Bootstrap) + vanilla JavaScript
- **Imagens:** Lazy loading (apenas carrega ao scroll)
- **Responsivo:** Mobile-first (botÃµes grandes, toque fÃ¡cil)
- **Hospedagem:** Vercel ou Netlify (integra com GitHub, deploy automÃ¡tico)
- **Backend:** Usar Vercel Functions (Node.js serverless) para:
  - Endpoint `/api/eventos` - retorna lista de fotos + metadados
  - Endpoint `/api/checkout/preference` - chama Mercado Pago
  - Endpoint `/webhook/pagamento` - recebe confirmaÃ§Ã£o

---

### 4. PAGAMENTO - Mercado Pago (WebHook + SeguranÃ§a)

**Problemas no fluxo original:**
- Fluxo de WebHook nÃ£o Ã© claro
- Sem tratamento de transaÃ§Ãµes duplicadas
- Sem fallback se WebHook falhar

**Melhorias propostas:**

**4.1. Fluxo de Pagamento Detalhado**
```
1. Frontend: POST /api/checkout/preference
   â””â”€ Body: { whatsapp, fotoIds[], totalComTaxa }

2. Backend (Vercel Function):
   â”œâ”€ Validar dados
   â”œâ”€ Criar pedido em Google Sheet com status "Pendente"
   â”œâ”€ Chamar API Mercado Pago â†’ gerar Pix DinÃ¢mico
   â”œâ”€ Retornar QR Code + ID transaÃ§Ã£o para Frontend
   â””â”€ Registrar em Sheet: ID_TRANSACAO, WHATSAPP, FOTOS, TIMESTAMP

3. Frontend:
   â”œâ”€ Exibir QR Code
   â”œâ”€ Poll a cada 2s: GET /api/status-pagamento?transacao_id
   â””â”€ Quando status = "aprovado" â†’ exibir âœ“ "Pagamento Confirmado!"

4. Mercado Pago (Background):
   â”œâ”€ Quando pagamento Ã© confirmado, envia WebHook para:
   â”‚  POST /webhook/mercado-pago
   â””â”€ Body: { id_transacao, status, valor, timestamp }

5. Backend (Webhook Handler):
   â”œâ”€ Verificar assinatura do WebHook (seguranÃ§a)
   â”œâ”€ Atualizar Sheet: status = "Pago"
   â”œâ”€ Disparar aÃ§Ã£o: enviar fotos para WhatsApp (prÃ³xima etapa)
   â””â”€ Retornar 200 OK (para Mercado Pago parar de tentar)
```

**4.2. Tratamento de SeguranÃ§a**
- **Verificar Assinatura:** Mercado Pago envia `x-signature` header
- **IdempotÃªncia:** Se mesmo WebHook chegar 2x, nÃ£o processa 2x
- **Retry Logic:** Se WebHook falhar, Mercado Pago tenta de novo por 24h
- **Timeout:** Se nÃ£o receber confirmaÃ§Ã£o em 30min, marcar como "Expirado" (refazer pagamento)

**4.3. ConfiguraÃ§Ã£o no Mercado Pago (Manual)**
- Gerar credenciais (Access Token + Refresh Token)
- Registrar URL do WebHook: `https://seu-dominio.vercel.app/webhook/mercado-pago`
- Testar com webhook de teste: `https://webhook.site/seu-id`

---

### 5. ENTREGA - WhatsApp + Google Drive

**Problemas no fluxo original:**
- Sem especificaÃ§Ã£o de qual API WhatsApp usar (oficialvs Evolution)
- Sem tratamento se a mensagem nÃ£o chegar
- Sem registro de entrega

**Melhorias propostas:**

**5.1. Escolha da API WhatsApp**

| OpÃ§Ã£o                      | Custo      | Facilidade | Free Tier | RecomendaÃ§Ã£o |
|----------------------------|-----------|-----------|-----------|--------------|
| WhatsApp Cloud API (oficial)| Pago      | MÃ©dia     | NÃ£o       | ProduÃ§Ã£o    |
| Evolution API (self-hosted) | VPS barata| Alta      | Sim*      | MVP         |
| Twilio WhatsApp             | Pago      | Alta      | NÃ£o       | -            |
| Link de Mensagem (simples)  | Gratuito  | Muito Alta| Sim       | **RECOMENDADO** |

**RecomendaÃ§Ã£o para MVP:** Usar **Link de Mensagem WhatsApp** (mais simples, zero custo)
```
// Exemplo:
https://wa.me/5511999999999?text=OlÃ¡!%20Aqui%20estÃ¡%20sua%20foto:%20[LINK]
```

Quando escalar para Evolution API:
```
POST https://localhost:3000/message/sendText
{
  "number": "5511999999999",
  "text": "OlÃ¡! Aqui estÃ¡ sua foto da ParÃ³quia SÃ£o Rafael.\n\n[LINK DRIVE]"
}
```

**5.2. Fluxo de Entrega (Google Apps Script Agendado)**
```
Trigger: A cada 2 minutos (verificar Google Sheet)

Para cada linha com status = "Pago" e "WhatsApp enviado" = Vazio:
  1. Buscar IDs das fotos (coluna FotoIds)
  2. Para cada foto ID:
     â”œâ”€ Buscar arquivo em /Processadas_Originais
     â”œâ”€ Gerar link de compartilhamento (Drive)
     â””â”€ Registrar link em coluna "LinkEntrega"
  
  3. Montar mensagem personalizada:
     "Paz e Bem! Aqui estÃ¡ sua(s) foto(s) da ParÃ³quia SÃ£o Rafael.
      Que este registro do sacramento seja uma benÃ§Ã£o em sua famÃ­lia!
      
      [LINK 1]
      [LINK 2]
      ..."
  
  4. Enviar via Evolution API OU gerar link WhatsApp
  
  5. Registrar em Sheet:
     â”œâ”€ "WhatsApp enviado" = timestamp
     â”œâ”€ "Status" = "Entregue"
     â””â”€ "Tentativas" += 1
  
  6. Se erro: registrar erro e tentar novamente em 5 minutos (mÃ¡x 3x)
```

**5.3. GeraÃ§Ã£o de Links Seguros**
```
Drive permite compartilhar com:
- anyoneWithTheLink (qualquer um com o link)
- readers (apenas leitura)
- ExpiraÃ§Ã£o: Pode ser automÃ¡tica ou manual

RecomendaÃ§Ã£o: 
- anyoneWithTheLink + readers (seguro, nÃ£o pode editar)
- Sem expiraÃ§Ã£o (mas pode implementar depois)
```

---

## Arquivos e Estrutura de Projeto Recomendados

```
paroquia-fotos-venda/
â”œâ”€â”€ .env.local                    # Credenciais (nÃ£o commitar)
â”‚   â”œâ”€â”€ MERCADO_PAGO_ACCESS_TOKEN
â”‚   â”œâ”€â”€ GOOGLE_DRIVE_API_KEY
â”‚   â””â”€â”€ EVOLUTION_API_URL (se usar)
â”‚
â”œâ”€â”€ google-apps-script/
â”‚   â”œâ”€â”€ Code.gs                   # Script principal
â”‚   â”œâ”€â”€ Marca.gs                  # FunÃ§Ã£o de marca d'Ã¡gua
â”‚   â”œâ”€â”€ Drive.gs                  # FunÃ§Ãµes Drive API
â”‚   â”œâ”€â”€ Sheet.gs                  # FunÃ§Ãµes Google Sheet
â”‚   â””â”€â”€ appsscript.json           # Manifest
â”‚
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ index.html                # PÃ¡gina galeria
â”‚   â”œâ”€â”€ style.css                 # Tailwind + custom
â”‚   â”œâ”€â”€ app.js                    # LÃ³gica frontend
â”‚   â”œâ”€â”€ config.js                 # Endpoints API
â”‚   â””â”€â”€ package.json
â”‚
â”œâ”€â”€ backend/ (Vercel Functions)
â”‚   â”œâ”€â”€ vercel.json               # Config Vercel
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ fotos.js              # GET /api/eventos
â”‚   â”‚   â”œâ”€â”€ criar-pagamento.js    # POST /api/checkout/preference
â”‚   â”‚   â”œâ”€â”€ status-pagamento.js   # GET /api/status-pagamento
â”‚   â”‚   â””â”€â”€ webhook/
â”‚   â”‚       â””â”€â”€ mercado-pago.js   # POST /webhook/mercado-pago
â”‚   â””â”€â”€ lib/
â”‚       â”œâ”€â”€ mercado-pago.js       # Client MP
â”‚       â”œâ”€â”€ google-drive.js       # Client Drive
â”‚       â”œâ”€â”€ google-sheets.js      # Client Sheets
â”‚       â””â”€â”€ evolution-api.js      # Client WhatsApp (opcional)
â”‚
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ SETUP.md                  # Guia de instalaÃ§Ã£o
â”‚   â”œâ”€â”€ FLUXO.md                  # DocumentaÃ§Ã£o de fluxo
â”‚   â””â”€â”€ TROUBLESHOOTING.md        # Debugging
â”‚
â””â”€â”€ README.md
```

---

## VerificaÃ§Ã£o & Testes End-to-End

### Teste 1: Entrada de Dados
- [ ] FotÃ³grafo faz upload de foto no Drive (evento real)
- [ ] Foto aparece na pasta de origem

### Teste 2: Processamento (Apps Script)
- [ ] Apps Script detecta a nova foto em <5 minutos
- [ ] Marca d'Ã¡gua Ã© aplicada corretamente
- [ ] Arquivo salvo em `/Processadas_Amostras`
- [ ] Entrada criada no Google Sheet com ID Ãºnico

### Teste 3: Vitrine (Frontend)
- [ ] Acessar site da galeria
- [ ] Foto com marca d'Ã¡gua aparece
- [ ] Selecionar fotos, inserir WhatsApp, revisar total
- [ ] BotÃ£o "Gerar Pix" funciona

### Teste 4: Pagamento (Mercado Pago)
- [ ] QR Code Pix Ã© gerado
- [ ] Fazer pagamento (ou simular em sandbox)
- [ ] WebHook Ã© recebido em <10 segundos
- [ ] Status na tela muda para "Confirmado!"

### Teste 5: Entrega (WhatsApp)
- [ ] Mensagem chega no WhatsApp em <2 minutos apÃ³s pagamento
- [ ] Link da foto original (sem tarja) funciona
- [ ] Registrar em Sheet: "Status" = "Entregue"

### Teste 6: Fluxo Completo (Ponta a Ponta)
- [ ] Do upload â†’ Ã  entrega no WhatsApp (SEM intervenÃ§Ã£o)
- [ ] Todos os registros auditados em Google Sheet

---

## Stack TÃ©cnico Final

| Componente          | Tecnologia              | Custo    | Justificativa           |
|-------------------|------------------------|---------|------------------------|
| AutomaÃ§Ã£o (etapas 1-2) | Google Apps Script | Free | Integrado com Drive |
| Banco de Dados      | Google Sheets + Firestore | Free | Leve, sem setup |
| Frontend            | HTML5 + Tailwind CSS + JS | Free  | Simples, responsivo |
| Hospedagem Frontend | Vercel ou Netlify       | Free | Deploy automÃ¡tico |
| Backend             | Node.js (Vercel Func)  | Free  | Sem servidor, escalÃ¡vel |
| Marca d'Ãgua        | ImageMagick (via Apps) | Free  | Processamento local |
| Pagamento           | Mercado Pago            | Taxa  | 2.99% + R$0,30 por tx |
| WhatsApp (MVP)      | Link de Mensagem        | Free  | Sem API |
| WhatsApp (Escala)   | Evolution API           | VPS   | ~R$50-100/mÃªs |

---

## PrÃ³ximos Passos (Ordem de ImplementaÃ§Ã£o)

1. **Design da Marca** (logo + estilo da parÃ³quia)
2. **Estrutura Google Drive** (pastas + permissÃµes)
3. **Google Apps Script** (detecÃ§Ã£o + marca d'Ã¡gua)
4. **Frontend** (galeria + seleÃ§Ã£o)
5. **Backend** (Mercado Pago)
6. **WhatsApp** (integraÃ§Ã£o)
7. **Testes** (ponta a ponta)
8. **Deploy & Monitoramento**