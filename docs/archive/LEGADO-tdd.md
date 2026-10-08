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

# PLANO TDD - Test-Driven Development

## EstratÃ©gia Global de Testes

### PirÃ¢mide de Testes
```
        /\
       /  \          E2E Tests (10%)
      /â”€â”€â”€â”€\         - Fluxo completo do usuÃ¡rio
     /      \        - Sem mocks
    /â”€â”€â”€â”€â”€â”€â”€â”€\
   /          \      Integration Tests (30%)
  /â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\     - APIs externas mockadas
 /              \    - Fluxo entre componentes
/â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\   
â”‚   Unit Tests   â”‚   Unit Tests (60%)
â”‚     (Jest)     â”‚   - LÃ³gica pura, sem side effects
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   - RÃ¡pido, isolado, mockado
```

**MÃ©tricas de Cobertura:**
- Linhas de cÃ³digo: 80%+
- Branches: 75%+
- FunÃ§Ãµes: 85%+
- Statements: 80%+

**Ferramentas:**
- **Jest** - Unit & Integration tests
- **Playwright** ou **Cypress** - E2E tests
- **Supertest** - HTTP API testing
- **jest-mock-extended** - Mocks avanÃ§ados
- **@testing-library/react** - Testes de Frontend (se usar React)

---

## 1. GOOGLE APPS SCRIPT - Testes de AutomaÃ§Ã£o

### 1.1 Setup de Testes para Apps Script
```bash
npm install -D @google/clasp jest google-apps-script-types
npm install -D ts-node typescript @types/jest
```

**Arquivo:** `google-apps-script/__tests__/setup.test.js`

```javascript
// Mocks globais do Google Apps Script
global.DriveApp = {
  getFilesByName: jest.fn(),
  getFolder: jest.fn(),
  createFolder: jest.fn(),
};

global.SpreadsheetApp = {
  openById: jest.fn(),
  getActive: jest.fn(),
};

global.Utilities = {
  formatDate: jest.fn(),
  getUuid: jest.fn(),
};

global.MailApp = {
  sendEmail: jest.fn(),
};
```

### 1.2 Testes UnitÃ¡rios - Marca d'Ãgua

**Arquivo:** `google-apps-script/__tests__/marca.test.js`

```javascript
describe('Marca d\'Ãgua', () => {
  
  describe('aplicarMarcaDAgua', () => {
    it('deve aplicar marca d\'Ã¡gua a uma imagem vÃ¡lida', async () => {
      // AAA: Arrange
      const mockFile = {
        getBlob: jest.fn().mockReturnValue({
          getBytes: jest.fn().mockReturnValue(Buffer.from('fake-image'))
        }),
        getName: jest.fn().mockReturnValue('foto_001.jpg'),
        getParents: jest.fn().mockReturnValue({ hasNext: jest.fn().mockReturnValue(false) })
      };
      
      DriveApp.getFilesByName.mockReturnValue({
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false),
        next: jest.fn().mockReturnValue(mockFile)
      });

      // Act
      const resultado = aplicarMarcaDAgua('foto_001.jpg', mockLogoFile);

      // Assert
      expect(resultado).toEqual({
        sucesso: true,
        fotoId: expect.any(String),
        timestamp: expect.any(Number)
      });
    });

    it('deve gerar ID Ãºnico em formato FOTO_XXX', () => {
      const id1 = gerarIdUnico();
      const id2 = gerarIdUnico();
      
      expect(id1).toMatch(/^FOTO_\d{3}$/);
      expect(id1).not.toBe(id2);
    });

    it('deve falhar graciosamente com imagem invÃ¡lida', async () => {
      const mockInvalidFile = {
        getBlob: jest.fn().mockReturnValue(null)
      };
      
      const resultado = aplicarMarcaDAgua('invalid.jpg', mockLogoFile);
      
      expect(resultado.sucesso).toBe(false);
      expect(resultado.erro).toBeDefined();
    });

    it('deve aplicar logo e texto diagonal na imagem', async () => {
      // Testa que aplicarMarcaDAgua chama ImageMagick com parametros corretos
      const mockImageMagick = jest.fn().mockResolvedValue({});
      
      const resultado = aplicarMarcaDAgua('test.jpg', logoPath);
      
      expect(mockImageMagick).toHaveBeenCalledWith(
        expect.stringContaining('-gravity'),
        expect.stringContaining('Amostra')
      );
    });

    it('deve respeitar estrutura de pastas (Originais vs Amostras)', () => {
      const fotoOriginal = 'gs://drive.google.com/Processadas_Originais/foto.jpg';
      const fotoAmostra = 'gs://drive.google.com/Processadas_Amostras/foto.jpg';
      
      expect(fotoAmostra).toContain('Amostras');
      expect(fotoOriginal).toContain('Originais');
    });
  });

  describe('validarImagemMarcaDAgua', () => {
    it('deve validar dimensÃµes mÃ­nimas da imagem', () => {
      const imagemPequeÃ±a = { width: 100, height: 100 };
      const imagemValida = { width: 1920, height: 1080 };
      
      expect(validarImagemMarcaDAgua(imagemPequeÃ±a)).toBe(false);
      expect(validarImagemMarcaDAgua(imagemValida)).toBe(true);
    });

    it('deve aceitar formatos JPG, PNG e HEIC', () => {
      expect(validarFormato('jpg')).toBe(true);
      expect(validarFormato('png')).toBe(true);
      expect(validarFormato('heic')).toBe(true);
      expect(validarFormato('gif')).toBe(false);
      expect(validarFormato('webp')).toBe(false);
    });

    it('deve calcular tamanho mÃ¡ximo (10MB)', () => {
      const blob10MB = { getBytes: () => new Array(10 * 1024 * 1024) };
      const blob15MB = { getBytes: () => new Array(15 * 1024 * 1024) };
      
      expect(validarTamanho(blob10MB)).toBe(true);
      expect(validarTamanho(blob15MB)).toBe(false);
    });
  });
});
```

### 1.3 Testes UnitÃ¡rios - Drive API

**Arquivo:** `google-apps-script/__tests__/drive.test.js`

```javascript
describe('Drive API', () => {
  
  describe('monitorarPastasNova', () => {
    it('deve detectar novo arquivo em pasta de eventos', () => {
      const mockFolder = {
        getFiles: jest.fn().mockReturnValue({
          hasNext: jest.fn()
            .mockReturnValueOnce(true)  // 1Âª iteraÃ§Ã£o
            .mockReturnValueOnce(false), // 2Âª iteraÃ§Ã£o
          next: jest.fn().mockReturnValue({
            getName: jest.fn().mockReturnValue('nova_foto.jpg'),
            getDateCreated: jest.fn().mockReturnValue(new Date())
          })
        })
      };

      const novasFormas = detectarNovasFormas(mockFolder);
      
      expect(novasFormas.length).toBe(1);
      expect(novasFormas[0]).toBe('nova_foto.jpg');
    });

    it('deve ignorar arquivos jÃ¡ processados (cache)', () => {
      const mockFolder = { /* arquivo jÃ¡ visto */ };
      const cache = new Map([['foto_001.jpg', true]]);
      
      const novas = detectarNovasFormas(mockFolder, cache);
      
      expect(novas).not.toContain('foto_001.jpg');
    });

    it('deve falhar se pasta de eventos nÃ£o existir', () => {
      DriveApp.getFoldersByName.mockReturnValue({
        hasNext: jest.fn().mockReturnValue(false)
      });

      expect(() => monitorarPastas()).toThrow('Pasta /Eventos nÃ£o encontrada');
    });

    it('deve criar estrutura de pastas na primeira execuÃ§Ã£o', () => {
      const mockParentFolder = {
        createFolder: jest.fn().mockReturnValue({}),
        getFolder: jest.fn().mockImplementation((name) => {
          throw new Error(`Pasta ${name} nÃ£o existe`);
        })
      };

      inicializarEstrutura(mockParentFolder);

      expect(mockParentFolder.createFolder).toHaveBeenCalledWith('Eventos');
      expect(mockParentFolder.createFolder).toHaveBeenCalledWith('Sistema');
    });
  });

  describe('compartilharLink', () => {
    it('deve gerar link de compartilhamento pÃºblico', () => {
      const mockFile = {
        setSharing: jest.fn(),
        getUrl: jest.fn().mockReturnValue('https://drive.google.com/file/d/ABC123/view')
      };

      const link = compartilharLink(mockFile, 'READER');

      expect(mockFile.setSharing).toHaveBeenCalledWith(
        DriveApp.Access.ANYONE,
        DriveApp.Permission.VIEWER
      );
      expect(link).toContain('drive.google.com');
    });

    it('deve respeitar permissÃµes (READER vs EDITOR)', () => {
      const mockFile = { setSharing: jest.fn() };

      compartilharLink(mockFile, 'READER');
      expect(mockFile.setSharing).toHaveBeenCalledWith(
        expect.anything(),
        DriveApp.Permission.VIEWER
      );

      compartilharLink(mockFile, 'EDITOR');
      expect(mockFile.setSharing).toHaveBeenCalledWith(
        expect.anything(),
        DriveApp.Permission.EDITOR
      );
    });
  });
});
```

### 1.4 Testes UnitÃ¡rios - Google Sheets

**Arquivo:** `google-apps-script/__tests__/sheet.test.js`

```javascript
describe('Google Sheets', () => {
  
  describe('registrarFotoProcessada', () => {
    it('deve inserir nova linha com metadados corretos', () => {
      const mockSheet = {
        appendRow: jest.fn(),
        getLastRow: jest.fn().mockReturnValue(100)
      };

      SpreadsheetApp.openById.mockReturnValue({
        getSheetByName: jest.fn().mockReturnValue(mockSheet)
      });

      registrarFotoProcessada({
        id: 'FOTO_001',
        evento: 'Missa SÃ¡bado',
        linkOriginal: 'https://drive.google.com/...',
        linkAmostra: 'https://drive.google.com/...',
        timestamp: new Date()
      });

      expect(mockSheet.appendRow).toHaveBeenCalledWith([
        'FOTO_001',
        'Missa SÃ¡bado',
        expect.any(String), // linkOriginal
        expect.any(String), // linkAmostra
        '',                 // whatsapp vazio
        'NÃ£o',              // pago
        'Aguardando'        // status
      ]);
    });

    it('deve atualizar coluna de erro se houver problema', () => {
      const mockSheet = {
        getRange: jest.fn().mockReturnValue({
          setValue: jest.fn()
        })
      };

      registrarErro('FOTO_001', 'Imagem corrompida');

      expect(mockSheet.getRange).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number) // coluna de erro
      );
    });

    it('deve buscar fotos com status Pago para entrega', () => {
      const mockSheet = {
        getDataRange: jest.fn().mockReturnValue({
          getValues: jest.fn().mockReturnValue([
            ['ID', 'Status', 'WhatsApp'],
            ['FOTO_001', 'Pago', '11999999999'],
            ['FOTO_002', 'Aguardando', ''],
            ['FOTO_003', 'Pago', '']
          ])
        })
      };

      const fotosPagas = buscarFotosComStatusPago(mockSheet);

      expect(fotosPagas.length).toBe(2); // FOTO_001 e FOTO_003
      expect(fotosPagas[0].id).toBe('FOTO_001');
    });
  });

  describe('transaÃ§Ãµes concorrentes', () => {
    it('deve evitar race condition ao inserir mÃºltiplas fotos', () => {
      const mockSheet = {
        appendRow: jest.fn(),
        lock: jest.fn().mockReturnValue({
          waitLock: jest.fn()
        })
      };

      // Simular 3 requisiÃ§Ãµes simultÃ¢neas
      Promise.all([
        registrarFotoProcessada({ id: 'FOTO_001' }),
        registrarFotoProcessada({ id: 'FOTO_002' }),
        registrarFotoProcessada({ id: 'FOTO_003' })
      ]);

      // Verificar que lock foi usado
      expect(mockSheet.lock).toHaveBeenCalled();
    });
  });
});
```

### 1.5 Testes de IntegraÃ§Ã£o - Apps Script

**Arquivo:** `google-apps-script/__tests__/integration.test.js`

```javascript
describe('IntegraÃ§Ã£o - Apps Script (Mock completo)', () => {
  
  it('deve processar foto end-to-end (upload â†’ marca â†’ sheet)', () => {
    // 1. Simular upload de foto
    const mockFile = {
      getName: jest.fn().mockReturnValue('evento_001.jpg'),
      getBlob: jest.fn().mockReturnValue({ /* imagem mock */ }),
      getParents: jest.fn().mockReturnValue({ /* pasta mock */ })
    };

    // 2. Aplicar marca d'Ã¡gua
    const marcada = aplicarMarcaDAgua(mockFile);
    expect(marcada.sucesso).toBe(true);

    // 3. Registrar em Sheet
    const registro = registrarFotoProcessada({
      id: marcada.fotoId,
      evento: 'Missa',
      // ... outros campos
    });
    expect(registro.success).toBe(true);

    // 4. Compartilhar links
    const linkAmostra = compartilharLink(mockFile, 'READER');
    const linkOriginal = compartilharLink(mockFile, 'READER');

    expect(linkAmostra).toBeDefined();
    expect(linkOriginal).toBeDefined();
  });

  it('deve retornar erro gracioso se Drive falhar', () => {
    DriveApp.getFoldersByName.mockImplementation(() => {
      throw new Error('Erro de conexÃ£o com Drive');
    });

    expect(() => monitorarPastas()).toThrow();
    // Espera que erro seja registrado em Sheet
    expect(MailApp.sendEmail).toHaveBeenCalled();
  });

  it('deve respeitar rate limit do Google Drive (120 req/min)', () => {
    const inicioTest = Date.now();
    
    // Simular 100 processamentos
    for (let i = 0; i < 100; i++) {
      registrarFotoProcessada({ id: `FOTO_${i}` });
    }

    const duracao = Date.now() - inicioTest;
    // Deve levar no mÃ­nimo 30 segundos (rate limit)
    expect(duracao).toBeGreaterThan(30000);
  });
});
```

---

## 2. FRONTEND - Testes de UI/UX

### 2.1 Setup do Frontend
```bash
npm install -D jest @testing-library/dom @testing-library/jest-dom
npm install -D playwright @playwright/test
```

### 2.2 Testes UnitÃ¡rios - FunÃ§Ãµes de NegÃ³cio

**Arquivo:** `frontend/__tests__/calculos.test.js`

```javascript
describe('CÃ¡lculos de PreÃ§o', () => {
  
  it('deve calcular subtotal corretamente', () => {
    const fotos = [
      { id: 'FOTO_001', preco: 10.00 },
      { id: 'FOTO_002', preco: 10.00 },
      { id: 'FOTO_003', preco: 10.00 }
    ];

    const subtotal = calcularSubtotal(fotos);
    
    expect(subtotal).toBe(30.00);
  });

  it('deve aplicar taxa de conveniÃªncia (2.99% + R$0,30)', () => {
    const subtotal = 100.00;
    const taxaEsperada = (100 * 0.0299) + 0.30; // 3.29

    const taxa = calcularTaxa(subtotal);

    expect(taxa).toBe(taxaEsperada);
  });

  it('deve calcular total final', () => {
    const fotos = [
      { id: 'FOTO_001', preco: 10.00 },
      { id: 'FOTO_002', preco: 10.00 }
    ];
    
    const total = calcularTotal(fotos);
    const subtotal = 20.00;
    const taxa = (20 * 0.0299) + 0.30; // 0.898
    
    expect(total).toBeCloseTo(subtotal + taxa, 2);
  });

  it('deve rejeitar quantidade zero', () => {
    expect(() => calcularSubtotal([])).toThrow('Nenhuma foto selecionada');
  });

  it('deve rejeitar WhatsApp invÃ¡lido', () => {
    expect(validarWhatsApp('123')).toBe(false);
    expect(validarWhatsApp('11999999999')).toBe(true);
    expect(validarWhatsApp('21987654321')).toBe(true);
  });
});
```

### 2.3 Testes de Componentes - Galeria

**Arquivo:** `frontend/__tests__/galeria.test.js`

```javascript
describe('Componente Galeria', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    container = document.getElementById('root');
  });

  it('deve renderizar imagens de amostra (com tarja)', () => {
    const fotos = [
      { id: 'FOTO_001', linkAmostra: 'https://example.com/1.jpg' },
      { id: 'FOTO_002', linkAmostra: 'https://example.com/2.jpg' }
    ];

    renderGaleria(container, fotos);

    const imagens = container.querySelectorAll('img');
    expect(imagens.length).toBe(2);
  });

  it('deve permitir seleÃ§Ã£o de mÃºltiplas fotos via checkbox', () => {
    const fotos = [
      { id: 'FOTO_001', linkAmostra: 'https://example.com/1.jpg' },
      { id: 'FOTO_002', linkAmostra: 'https://example.com/2.jpg' }
    ];

    renderGaleria(container, fotos);

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes[0].click();
    checkboxes[1].click();

    const selecionadas = obterFotosSelecionadas();
    expect(selecionadas.length).toBe(2);
  });

  it('deve atualizar resumo ao selecionar foto', () => {
    const fotos = [{ id: 'FOTO_001', preco: 10.00 }];
    renderGaleria(container, fotos);

    const checkbox = container.querySelector('input[type="checkbox"]');
    checkbox.click();

    const resumo = container.querySelector('[data-testid="resumo"]');
    expect(resumo.textContent).toContain('1');
    expect(resumo.textContent).toContain('R$ 10');
  });

  it('deve lazy load imagens ao scroll', () => {
    const fotos = Array.from({ length: 50 }, (_, i) => ({
      id: `FOTO_${i}`,
      linkAmostra: `https://example.com/${i}.jpg`
    }));

    renderGaleria(container, fotos);

    // Apenas as primeiras 10 devem estar carregadas
    const imagensCarregadas = container.querySelectorAll('img[src]');
    expect(imagensCarregadas.length).toBeLessThanOrEqual(10);
  });

  it('deve filtrar fotos por evento', () => {
    const fotos = [
      { id: 'FOTO_001', evento: 'Missa', linkAmostra: '1.jpg' },
      { id: 'FOTO_002', evento: 'Batizado', linkAmostra: '2.jpg' },
      { id: 'FOTO_003', evento: 'Missa', linkAmostra: '3.jpg' }
    ];

    renderGaleria(container, fotos);
    
    const selectEvento = container.querySelector('[data-testid="select-evento"]');
    selectEvento.value = 'Missa';
    selectEvento.dispatchEvent(new Event('change'));

    const imagensVisiveis = container.querySelectorAll('img:not([style*="display:none"])');
    expect(imagensVisiveis.length).toBe(2); // Apenas Missa
  });
});
```

### 2.4 Testes de Fluxo - FormulÃ¡rio

**Arquivo:** `frontend/__tests__/fluxo-compra.test.js`

```javascript
describe('Fluxo de Compra Multi-step', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    container = document.getElementById('root');
  });

  it('deve navegar entre steps corretamente', () => {
    renderFluxoCompra(container);

    // Step 1: Galeria
    expect(container.querySelector('[data-step="1"]')).toBeVisible();
    expect(container.querySelector('[data-step="2"]')).not.toBeVisible();

    // Clicar "PrÃ³ximo"
    container.querySelector('[data-action="proximo"]').click();

    // Step 2: WhatsApp
    expect(container.querySelector('[data-step="1"]')).not.toBeVisible();
    expect(container.querySelector('[data-step="2"]')).toBeVisible();
  });

  it('deve validar WhatsApp antes de avanÃ§ar', () => {
    renderFluxoCompra(container);
    container.querySelector('[data-action="proximo"]').click(); // Step 1 â†’ 2

    const inputWhatsApp = container.querySelector('[name="whatsapp"]');
    inputWhatsApp.value = '123'; // InvÃ¡lido

    const btnProximo = container.querySelector('[data-action="proximo"]');
    btnProximo.click();

    // NÃ£o deve avanÃ§ar
    expect(container.querySelector('[data-step="2"]')).toBeVisible();
    expect(container.querySelector('[data-error]')).toBeVisible();
  });

  it('deve exibir resumo correto no step 3', () => {
    renderFluxoCompra(container);

    // Selecionar fotos
    selectFotos(['FOTO_001', 'FOTO_002']);
    
    // AvanÃ§ar para step 2
    container.querySelector('[data-action="proximo"]').click();

    // Inserir WhatsApp
    container.querySelector('[name="whatsapp"]').value = '11999999999';
    container.querySelector('[data-action="proximo"]').click();

    // Step 3: Resumo
    const resumo = container.querySelector('[data-step="3"]');
    expect(resumo.textContent).toContain('Fotos selecionadas: 2');
    expect(resumo.textContent).toContain('Subtotal: R$ 20,00');
    expect(resumo.textContent).toContain('Taxa: R$');
    expect(resumo.textContent).toContain('Total: R$');
  });

  it('deve desabilitar botÃ£o de pagamento atÃ© confirmaÃ§Ã£o', () => {
    renderFluxoCompra(container);
    selectFotos(['FOTO_001']);
    avaÃ§arParaStep3();

    const btnPagar = container.querySelector('[data-action="pagar"]');
    
    // Sem checkbox de confirmaÃ§Ã£o
    expect(btnPagar.disabled).toBe(true);

    // Com checkbox
    container.querySelector('[name="confirma"]').click();
    expect(btnPagar.disabled).toBe(false);
  });

  it('deve voltar ao step anterior', () => {
    renderFluxoCompra(container);
    container.querySelector('[data-action="proximo"]').click();
    container.querySelector('[data-action="proximo"]').click(); // Step 3

    container.querySelector('[data-action="voltar"]').click();

    expect(container.querySelector('[data-step="2"]')).toBeVisible();
  });
});
```

### 2.5 Testes E2E - Playwright

**Arquivo:** `frontend/e2e/compra-completa.spec.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('E2E - Fluxo Completo de Compra', () => {
  
  test('usuÃ¡rio deve comprar fotos (happy path)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Step 1: Selecionar fotos
    await expect(page.locator('[data-testid="galeria"]')).toBeVisible();
    await page.locator('input[data-photo="FOTO_001"]').click();
    await page.locator('input[data-photo="FOTO_002"]').click();

    // Verificar resumo
    await expect(page.locator('[data-testid="resumo"]')).toContainText('2');

    // AvanÃ§ar
    await page.click('[data-action="proximo"]');

    // Step 2: WhatsApp
    await page.fill('[name="whatsapp"]', '11999999999');
    await page.click('[data-action="proximo"]');

    // Step 3: Resumo
    await expect(page.locator('[data-step="3"]')).toBeVisible();
    await expect(page.locator('[data-testid="total"]')).toContainText('R$');

    // Step 4: QR Code
    await page.click('[name="confirma"]');
    await page.click('[data-action="pagar"]');

    // Deve exibir QR Code
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
  });

  test('deve exibir erro se WhatsApp for invÃ¡lido', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.click('[data-action="proximo"]'); // Step 1 â†’ 2
    await page.fill('[name="whatsapp"]', 'invalido');
    await page.click('[data-action="proximo"]');

    // NÃ£o deve avanÃ§ar
    await expect(page.locator('[data-error]')).toBeVisible();
    await expect(page.locator('[data-step="2"]')).toBeVisible();
  });

  test('mobile: layout deve ser responsivo', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone
    await page.goto('http://localhost:3000');

    // BotÃµes devem ter tamanho adequado
    const botao = await page.locator('[data-action="proximo"]');
    const box = await botao.boundingBox();
    
    expect(box.height).toBeGreaterThanOrEqual(44); // MÃ­nimo iOS HIG
    expect(box.width).toBeGreaterThanOrEqual(44);
  });

  test('deve preservar estado ao voltar no navegador', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Selecionar fotos e avanÃ§ar
    await page.locator('input[data-photo="FOTO_001"]').click();
    await page.click('[data-action="proximo"]');
    await page.fill('[name="whatsapp"]', '11999999999');

    // Voltar no navegador
    await page.goBack();

    // WhatsApp deve estar preenchido
    const whatsapp = await page.inputValue('[name="whatsapp"]');
    expect(whatsapp).toBe('11999999999');
  });

  test('deve funcionar sem JavaScript (graceful degradation)', async ({ page }) => {
    // Desabilitar JavaScript
    await page.context().setExtraHTTPHeaders({});
    
    await page.goto('http://localhost:3000');
    
    // Deve exibir mensagem alternativa
    await expect(page.locator('[data-noscript]')).toContainText('JavaScript obrigatÃ³rio');
  });
});
```

---

## 3. BACKEND - APIs e Webhooks

### 3.1 Setup Backend
```bash
npm install -D jest supertest nock
npm install -D nodemon @types/node
```

### 3.2 Testes UnitÃ¡rios - Cliente Mercado Pago

**Arquivo:** `backend/__tests__/mercado-pago.test.js`

```javascript
import { MercadoPagoClient } from '../lib/mercado-pago.js';
import nock from 'nock';

describe('Mercado Pago Client', () => {
  let client;

  beforeEach(() => {
    client = new MercadoPagoClient({
      accessToken: 'FAKE_TOKEN_123',
      sandboxMode: true
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('deve criar pagamento Pix corretamente', async () => {
    const mockResponse = {
      id: 123456789,
      status: 'pending',
      point_of_interaction: {
        transaction_data: {
          qr_code: 'iVBORw0KGgo=',
          qr_code_url: 'https://ejemplo.com/qr'
        }
      }
    };

    nock('https://api.mercadopago.com')
      .post('/v1/payments', {
        transaction_amount: 20.99,
        description: 'Fotos - ParÃ³quia SÃ£o Rafael',
        payer: { email: 'admin@paroquia.com' },
        payment_method_id: 'pix'
      })
      .reply(200, mockResponse);

    const resultado = await client.criarPagamentoPix({
      amount: 20.99,
      description: 'Fotos - ParÃ³quia SÃ£o Rafael'
    });

    expect(resultado.id).toBe(123456789);
    expect(resultado.point_of_interaction.transaction_data.qr_code).toBeDefined();
  });

  it('deve gerar QR Code vÃ¡lido', async () => {
    const qrCode = await client.gerarQRCode('https://api.mercadopago.com/123');
    
    expect(qrCode).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
    expect(qrCode.length).toBeGreaterThan(100);
  });

  it('deve lanÃ§ar erro se token for invÃ¡lido', async () => {
    nock('https://api.mercadopago.com')
      .post(/.*/)
      .reply(401, { error: 'Unauthorized' });

    await expect(client.criarPagamentoPix({ amount: 20 })).rejects.toThrow();
  });

  it('deve respeitar rate limit (1000 req/hour)', () => {
    const requestTimes = [];
    
    for (let i = 0; i < 1001; i++) {
      requestTimes.push(Date.now());
    }

    const primeiroMinuto = requestTimes.filter(t => t - requestTimes[0] < 60000);
    
    // NÃ£o deve fazer mais de ~17 requests/segundo (1000/60)
    expect(primeiroMinuto.length).toBeLessThan(20);
  });
});
```

### 3.3 Testes de IntegraÃ§Ã£o - API de Pagamento

**Arquivo:** `backend/__tests__/api-pagamento.test.js`

```javascript
import request from 'supertest';
import { app } from '../app.js';
import * as sheet from '../lib/google-sheets.js';
import * as mp from '../lib/mercado-pago.js';

jest.mock('../lib/google-sheets.js');
jest.mock('../lib/mercado-pago.js');

describe('POST /api/checkout/preference', () => {
  
  it('deve validar campos obrigatÃ³rios', async () => {
    const response = await request(app)
      .post('/api/checkout/preference')
      .send({ /* faltam campos */ });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('whatsapp obrigatÃ³rio');
  });

  it('deve criar pagamento e registrar em Sheet', async () => {
    sheet.registrarPedido.mockResolvedValue({ id: 'PEDIDO_001' });
    mp.criarPagamentoPix.mockResolvedValue({
      id: 123456,
      point_of_interaction: { transaction_data: { qr_code: 'ABC123' } }
    });

    const response = await request(app)
      .post('/api/checkout/preference')
      .send({
        whatsapp: '11999999999',
        fotoIds: ['FOTO_001', 'FOTO_002'],
        totalComTaxa: 20.99
      });

    expect(response.status).toBe(200);
    expect(response.body.qrCode).toBe('ABC123');
    expect(response.body.transactionId).toBe(123456);
    expect(sheet.registrarPedido).toHaveBeenCalled();
  });

  it('deve validar WhatsApp em formato brasileiro', async () => {
    const invalidos = ['123', '9999999999', 'abc'];
    
    for (const whatsapp of invalidos) {
      const response = await request(app)
        .post('/api/checkout/preference')
        .send({ whatsapp, fotoIds: ['FOTO_001'], totalComTaxa: 10 });

      expect(response.status).toBe(400);
    }
  });

  it('deve rejeitar valor acima de R$ 10.000', async () => {
    const response = await request(app)
      .post('/api/checkout/preference')
      .send({
        whatsapp: '11999999999',
        fotoIds: Array(1001).fill('FOTO_001'),
        totalComTaxa: 10001
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('valor mÃ¡ximo');
  });

  it('deve conter idempotÃªncia: mesma requisiÃ§Ã£o 2x = mesma resposta', async () => {
    const payload = {
      whatsapp: '11999999999',
      fotoIds: ['FOTO_001'],
      totalComTaxa: 10.99
    };

    const res1 = await request(app).post('/api/checkout/preference').send(payload);
    const res2 = await request(app).post('/api/checkout/preference').send(payload);

    expect(res1.body.transactionId).toBe(res2.body.transactionId);
  });
});

describe('GET /api/status-pagamento', () => {
  
  it('deve retornar status correto do pagamento', async () => {
    mp.verificarPagamento.mockResolvedValue({
      status: 'approved',
      transaction_id: 123456
    });

    const response = await request(app)
      .get('/api/status-pagamento?transacao_id=123456');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('approved');
  });

  it('deve retornar pending enquanto nÃ£o confirmado', async () => {
    mp.verificarPagamento.mockResolvedValue({ status: 'pending' });

    const response = await request(app)
      .get('/api/status-pagamento?transacao_id=123456');

    expect(response.body.status).toBe('pending');
  });

  it('deve timeout apÃ³s 30 minutos', async () => {
    const timestamp = Date.now() - (31 * 60 * 1000); // 31 minutos atrÃ¡s
    
    sheet.buscarPedido.mockResolvedValue({ timestamp });

    const response = await request(app)
      .get('/api/status-pagamento?transacao_id=123456');

    expect(response.body.status).toBe('expired');
  });
});
```

### 3.4 Testes de WebHook - SeguranÃ§a

**Arquivo:** `backend/__tests__/webhook-seguranca.test.js`

```javascript
import request from 'supertest';
import { app } from '../app.js';
import crypto from 'crypto';

jest.mock('../lib/google-sheets.js');
jest.mock('../lib/whatsapp-api.js');

describe('POST /webhook/mercado-pago (SeguranÃ§a)', () => {
  
  it('deve rejeitar webhook sem assinatura', async () => {
    const response = await request(app)
      .post('/webhook/mercado-pago')
      .send({ id: 123456, action: 'payment.created' });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('assinatura invÃ¡lida');
  });

  it('deve validar assinatura HMAC-SHA256', async () => {
    const payload = { id: 123456, action: 'payment.created' };
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const response = await request(app)
      .post('/webhook/mercado-pago')
      .set('x-signature', hmac)
      .send(payload);

    // Deve aceitar
    expect(response.status).toBe(200);
  });

  it('deve rejeitar payload modificado', async () => {
    const payload = { id: 123456 };
    const assinatura = gerarAssinaturaMock(payload);

    // Modificar payload
    payload.id = 999999;

    const response = await request(app)
      .post('/webhook/mercado-pago')
      .set('x-signature', assinatura)
      .send(payload);

    expect(response.status).toBe(401);
  });

  it('deve ser idempotente (mesmo webhook 2x = executa 1x)', async () => {
    const payload = { id: 123456, action: 'payment.created' };
    const assinatura = gerarAssinaturaMock(payload);

    const res1 = await request(app)
      .post('/webhook/mercado-pago')
      .set('x-signature', assinatura)
      .send(payload);

    const res2 = await request(app)
      .post('/webhook/mercado-pago')
      .set('x-signature', assinatura)
      .send(payload);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    
    // Mas deve registrar processamento apenas 1x
    expect(sheet.atualizarPedido).toHaveBeenCalledTimes(1);
  });

  it('deve rejeitar IP nÃ£o autorizado (whitelist)', async () => {
    const whitelist = [
      '200.147.226.0/24',  // Mercado Pago
      '203.0.113.0/24'
    ];

    const request = {
      ip: '192.168.1.1' // IP nÃ£o autorizado
    };

    expect(validarIP(request.ip, whitelist)).toBe(false);
  });
});
```

### 3.5 Testes E2E - Fluxo Pagamento â†’ Entrega

**Arquivo:** `backend/__tests__/e2e-pagamento.test.js`

```javascript
import request from 'supertest';
import { app } from '../app.js';

describe('E2E - Pagamento â†’ Entrega (Mocks)', () => {
  
  it('deve processar fluxo completo sem APIs reais', async () => {
    // 1. Criar pagamento
    const criarResp = await request(app)
      .post('/api/checkout/preference')
      .send({
        whatsapp: '11999999999',
        fotoIds: ['FOTO_001', 'FOTO_002'],
        totalComTaxa: 20.99
      });

    expect(criarResp.status).toBe(200);
    const { transactionId } = criarResp.body;

    // 2. Simular confirmaÃ§Ã£o de pagamento
    const webhook = {
      id: transactionId,
      action: 'payment.created',
      data: { id: transactionId }
    };
    const assinatura = gerarAssinaturaMock(webhook);

    const webhookResp = await request(app)
      .post('/webhook/mercado-pago')
      .set('x-signature', assinatura)
      .send(webhook);

    expect(webhookResp.status).toBe(200);

    // 3. Verificar que status mudou para "Pago"
    const statusResp = await request(app)
      .get(`/api/status-pagamento?transacao_id=${transactionId}`);

    expect(statusResp.body.status).toBe('approved');

    // 4. Apps Script (mock) deve enviar WhatsApp
    await new Promise(resolve => setTimeout(resolve, 100)); // Aguardar processamento
    
    // Verificar que foi disparado envio de WhatsApp
    const whatsappLog = await sheet.buscarPedido(transactionId);
    expect(whatsappLog.whatsappEnviado).toBeDefined();
  });
});
```

---

## 4. STRESS TESTS - Carga Leve

**Arquivo:** `backend/__tests__/stress.test.js`

```javascript
import loadtest from 'loadtest';

describe('Stress Tests - Carga Leve (10 pag/min, 50 users)', () => {
  
  it('deve suportar 50 usuÃ¡rios simultÃ¢neos na galeria', async () => {
    const options = {
      url: 'http://localhost:3000/api/eventos',
      concurrent: 50,
      maxRequests: 100,
      requestsPerSecond: 2 // ~120 req/min
    };

    const result = await loadtest.loadTest(options);

    expect(result.totalRequests).toBe(100);
    expect(result.totalErrors).toBe(0);
    expect(result.rps.mean).toBeLessThan(200); // Menos de 200ms por request
  });

  it('deve suportar 10 criaÃ§Ãµes de pagamento/min', async () => {
    const options = {
      url: 'http://localhost:3000/api/checkout/preference',
      method: 'POST',
      body: {
        whatsapp: '11999999999',
        fotoIds: ['FOTO_001'],
        totalComTaxa: 10.99
      },
      concurrent: 5, // 5 simultÃ¢neos
      maxRequests: 20,
      requestsPerSecond: 0.167 // ~10 req/min
    };

    const result = await loadtest.loadTest(options);

    expect(result.totalErrors).toBe(0);
    expect(result.rps.mean).toBeLessThan(500); // Menos de 500ms
  });

  it('deve timeout gracefully sob pico (100 req/min)', async () => {
    const options = {
      url: 'http://localhost:3000/api/eventos',
      concurrent: 20,
      maxRequests: 100,
      requestsPerSecond: 1.667 // 100 req/min
    };

    const result = await loadtest.loadTest(options);

    // NÃ£o deve quebrar
    expect(result.totalRequests).toBe(100);
    // Mas pode ter timeouts
    expect(result.totalErrors).toBeLessThanOrEqual(10);
  });
});
```

---

## Ordem de ImplementaÃ§Ã£o (TDD First)

### Fase 1: Setup & Fixtures (1-2 dias)
1. [ ] Configurar Jest + mocks globais
2. [ ] Criar fixtures de teste (fotos, eventos, pagamentos)
3. [ ] Estrutura de testes no git

### Fase 2: Google Apps Script (3-4 dias)
1. [ ] Tests: marca d'Ã¡gua (marca.test.js)
2. [ ] Implementar: aplicarMarcaDAgua()
3. [ ] Tests: Drive API (drive.test.js)
4. [ ] Implementar: monitorarPastas(), compartilharLink()
5. [ ] Tests: Google Sheets (sheet.test.js)
6. [ ] Implementar: registrarFoto(), buscarFotosComStatusPago()
7. [ ] Tests: IntegraÃ§Ã£o (integration.test.js)
8. [ ] Implementar: fluxo end-to-end

### Fase 3: Frontend (2-3 dias)
1. [ ] Tests: cÃ¡lculos (calculos.test.js)
2. [ ] Implementar: calcularSubtotal(), calcularTaxa(), validarWhatsApp()
3. [ ] Tests: componentes (galeria.test.js)
4. [ ] Implementar: renderGaleria(), seleÃ§Ã£o de fotos
5. [ ] Tests: fluxo (fluxo-compra.test.js)
6. [ ] Implementar: navegaÃ§Ã£o entre steps
7. [ ] Tests: E2E (Playwright)
8. [ ] Ajustar responsividade

### Fase 4: Backend - APIs (3-4 dias)
1. [ ] Tests: Mercado Pago client (mercado-pago.test.js)
2. [ ] Implementar: criarPagamentoPix(), gerarQRCode()
3. [ ] Tests: API /criar-pagamento (api-pagamento.test.js)
4. [ ] Implementar: validaÃ§Ã£o, chamada a Mercado Pago
5. [ ] Tests: WebHook seguranÃ§a (webhook-seguranca.test.js)
6. [ ] Implementar: validaÃ§Ã£o de assinatura, idempotÃªncia
7. [ ] Tests: E2E completo (e2e-pagamento.test.js)

### Fase 5: Stress & Monitoring (1-2 dias)
1. [ ] Tests: carga leve (stress.test.js)
2. [ ] Implementar: rate limiting, logs
3. [ ] Configurar: monitoring (Sentry, Datadog)
4. [ ] Executar: stress tests
5. [ ] Otimizar: se necessÃ¡rio

### Fase 6: Deploy & ProduÃ§Ã£o (1 dia)
1. [ ] CI/CD setup (GitHub Actions)
2. [ ] Executar todos os testes antes de deploy
3. [ ] Deploy gradual (canary)
4. [ ] Monitoramento em tempo real

---

## MÃ©tricas de Sucesso

| MÃ©trica | Alvo | Ferramenta |
|---------|------|-----------|
| Cobertura de cÃ³digo | 80%+ | Jest coverage |
| Tempo de teste unit | <1s cada | Jest |
| Tempo de teste E2E | <5s cada | Playwright |
| Taxa de erro (prod) | <0.1% | Sentry |
| P95 latÃªncia (API) | <500ms | Datadog |
| Stress test (50 users) | 100% sucesso | loadtest |

---

## PrÃ³ximos Passos

**Depois de confirmaÃ§Ã£o do plano TDD:**
1. Iniciar **Fase 1** (Setup & Fixtures)
2. Criar arquivo `jest.config.js` com configuraÃ§Ã£o global
3. Criar pasta `__tests__/fixtures/` com dados mock
4. Primeiro teste: tests/marca.test.js (Red â†’ Green â†’ Refactor)