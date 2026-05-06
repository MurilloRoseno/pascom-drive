# Plano: Automação Completa de Venda de Fotos - Paróquia São Rafael

## Contexto
A Paróquia São Rafael precisa de um sistema **end-to-end** para comercializar fotos de eventos religiosos (missas, batizados, casamentos, etc.) de forma profissional, automática e com custo zero/mínimo. O fluxo atual está bem desenhado conceitualmente, mas precisa de detalhamento técnico em cada etapa para ser implementado com Google Apps Script como core da automação.

**Problema:** Sem automação, a PASCOM precisa manualmente:
- Organizar fotos no Drive
- Aplicar marca d'água
- Gerenciar vendas
- Conferir pagamentos
- Enviar fotos via WhatsApp

**Solução:** Sistema totalmente automático que permite ao fotógrafo apenas fazer upload, e o resto funciona sem intervenção.

---

## Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ENTRADA: Google Drive (Fotógrafos PASCOM)                        │
│    └─ Pasta: /ACERVO_PAROQUIA/[Evento]/ (fotos RAW)                 │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. PROCESSAMENTO: Google Apps Script (Automação)                    │
│    ├─ Monitorar alterações no Drive                                 │
│    ├─ Aplicar marca d'água (logo + texto diagonal)                  │
│    ├─ Gerar ID único (FOTO_001, FOTO_002, etc)                      │
│    ├─ Criar pastas: /Originais e /Amostras                          │
│    └─ Salvar metadados em Google Sheets (banco de dados leve)       │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. VITRINE: Site Frontend (HTML/CSS/JS + Vercel/Netlify)            │
│    ├─ Galeria visual com amostras (Pasta B - com tarja)             │
│    ├─ Seleção de fotos (checkbox ou clique)                         │
│    ├─ Campo de entrada: WhatsApp do fiel                            │
│    ├─ Cálculo automático: valor foto + taxa de conveniência         │
│    └─ Botão: "Gerar Pix" ou "Pagar com QR Code"                     │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. PAGAMENTO: Mercado Pago (API + WebHook)                          │
│    ├─ Gerar QR Code Pix Dinâmico (endpoint: /api/criar-pagamento)   │
│    ├─ Enviar pedido para fila de processamento (Firestore/Sheet)    │
│    ├─ WebHook: ouvir confirmação de pagamento (endpoint: /webhook)  │
│    └─ Status na tela: "Aguardando..." → "Confirmado!"               │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. ENTREGA: WhatsApp + Google Drive (Automação Final)               │
│    ├─ Buscar fotos originais (Pasta A - sem tarja)                  │
│    ├─ Gerar link de compartilhamento (com expiração ou não)         │
│    ├─ Enviar mensagem WhatsApp com link via Evolution API           │
│    └─ Registrar entrega em Google Sheets (auditoria)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Melhorias Detalhadas por Etapa

### 1. ENTRADA DE DADOS - Google Drive Structure

**Problemas no fluxo original:**
- Estrutura de pastas não é clara para a PASCOM
- Sem nomenclatura padrão = fotos desorganizadas
- Sem rastreabilidade de quem fez upload de qual foto

**Melhorias propostas:**

```
/ACERVO_PAROQUIA
├── /Eventos
│   ├── /2026-05-04_Missa_Sábado
│   │   └── [upload fotógrafo aqui]
│   ├── /2026-05-11_Batizado_Ana_Silva
│   │   └── [upload fotógrafo aqui]
│   └── /2026-06-15_Casamento_João_Maria
│       └── [upload fotógrafo aqui]
├── /Sistema (oculto da PASCOM)
│   ├── /Processadas_Originais (fotos processadas, sem tarja)
│   ├── /Processadas_Amostras (com tarja)
│   ├── /Backup
│   └── /Metadados (Google Sheet com IDs e links)
└── /Logo_Paroquia (arquivo de logo em alta resolução)
```

**Implementação:**
- Criar estrutura manualmente ANTES de iniciar (ou via Google Apps Script na primeira execução)
- Permissões: Fotógrafo = Editor na pasta do Evento; Não vê Sistema/Originais
- Usar **Drive Watch API** no Apps Script para detectar novos uploads em tempo real

---

### 2. PROCESSAMENTO - Google Apps Script (O Coração da Automação)

**Problemas no fluxo original:**
- Apps Script é "reativo" = só funciona em horários agendados (InstaLateness)
- Marca d'água manual é ineficiente
- Sem rastreamento de quais fotos foram processadas

**Melhorias propostas:**

**2.1. Trigger Automático (Não Agendado, Verdadeiramente Automático)**
```
Drive.Drives.list() + onEdit() + time-based trigger
→ Verificar a cada 5 minutos se há fotos novas
→ Se sim, processar imediatamente
```

**2.2. Marca d'Água Inteligente**
```javascript
// Usar Google Apps Script com:
// - Google Drive API para baixar imagem
// - ImageMagick ou biblioteca similar para sobrepor marca
// - Salvar resultado em /Processadas_Amostras

Função: aplicarMarcaDAgua(nomeArquivo)
  1. Baixar imagem do Drive (Evento)
  2. Sobrepor logo + texto "Amostra - Paróquia São Rafael" em diagonal
  3. Salvar em /Processadas_Amostras com MESMO nome
  4. Criar entrada em Google Sheet: ID, nome original, timestamp, link Drive
```

**2.3. Google Sheet como Banco de Dados Leve**
Estrutura:
```
| ID         | Evento              | Foto Original | Foto Amostra | WhatsApp | Pago | Status    |
|------------|---------------------|---------------|--------------|---------|------|-----------|
| FOTO_001   | Missa Sábado        | [link Drive]  | [link Drive] | -       | Não  | Aguardando|
| FOTO_002   | Missa Sábado        | [link Drive]  | [link Drive] | 11999.. | Sim  | Entregue  |
```

**2.4. Tratamento de Erros**
- Se marca d'água falhar: registrar em coluna "Erro" e notificar admin via email
- Retry automático a cada 10 minutos

---

### 3. VITRINE - Site Frontend (Melhorias de UX)

**Problemas no fluxo original:**
- Descrição vaga sobre "galeria de amostras"
- Sem feedback visual ao usuário
- Sem informação sobre qual foto foi selecionada

**Melhorias propostas:**

**3.1. Estrutura da Página**
```html
┌─────────────────────────────────────────────────────────┐
│  Paróquia São Rafael - Compre suas Fotos                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Filtro: Selecionar Evento ▼]  [Galeria Responsive]   │
│                                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ FOTO │  │ FOTO │  │ FOTO │  │ FOTO │              │
│  │  001 │  │  002 │  │  003 │  │  004 │              │
│  │ R$10 │  │ R$10 │  │ R$10 │  │ R$10 │              │
│  │ [📌] │  │ [✓]  │  │      │  │ [📌] │  (check = selecionado)
│  └──────┘  └──────┘  └──────┘  └──────┘              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  RESUMO:                                                │
│  ├─ Fotos selecionadas: 2                              │
│  ├─ Subtotal: R$ 20,00                                 │
│  ├─ Taxa de Processamento: R$ 0,99                     │
│  ├─ Total: R$ 20,99                                    │
│  └─ WhatsApp: [11 9 9999-9999]  [Próximo]              │
└─────────────────────────────────────────────────────────┘
```

**3.2. Fluxo de Seleção (Multi-step)**
- **Passo 1:** Galeria + seleção de fotos
- **Passo 2:** Inserir WhatsApp (com máscara: 11 9 9999-9999)
- **Passo 3:** Revisar resumo + taxa
- **Passo 4:** QR Code Pix para pagamento

**3.3. Detalhes Técnicos**
- **Framework:** HTML5 + Tailwind CSS (ou Bootstrap) + vanilla JavaScript
- **Imagens:** Lazy loading (apenas carrega ao scroll)
- **Responsivo:** Mobile-first (botões grandes, toque fácil)
- **Hospedagem:** Vercel ou Netlify (integra com GitHub, deploy automático)
- **Backend:** Usar Vercel Functions (Node.js serverless) para:
  - Endpoint `/api/fotos` - retorna lista de fotos + metadados
  - Endpoint `/api/criar-pagamento` - chama Mercado Pago
  - Endpoint `/webhook/pagamento` - recebe confirmação

---

### 4. PAGAMENTO - Mercado Pago (WebHook + Segurança)

**Problemas no fluxo original:**
- Fluxo de WebHook não é claro
- Sem tratamento de transações duplicadas
- Sem fallback se WebHook falhar

**Melhorias propostas:**

**4.1. Fluxo de Pagamento Detalhado**
```
1. Frontend: POST /api/criar-pagamento
   └─ Body: { whatsapp, fotoIds[], totalComTaxa }

2. Backend (Vercel Function):
   ├─ Validar dados
   ├─ Criar pedido em Google Sheet com status "Pendente"
   ├─ Chamar API Mercado Pago → gerar Pix Dinâmico
   ├─ Retornar QR Code + ID transação para Frontend
   └─ Registrar em Sheet: ID_TRANSACAO, WHATSAPP, FOTOS, TIMESTAMP

3. Frontend:
   ├─ Exibir QR Code
   ├─ Poll a cada 2s: GET /api/status-pagamento?transacao_id
   └─ Quando status = "aprovado" → exibir ✓ "Pagamento Confirmado!"

4. Mercado Pago (Background):
   ├─ Quando pagamento é confirmado, envia WebHook para:
   │  POST /webhook/mercado-pago
   └─ Body: { id_transacao, status, valor, timestamp }

5. Backend (Webhook Handler):
   ├─ Verificar assinatura do WebHook (segurança)
   ├─ Atualizar Sheet: status = "Pago"
   ├─ Disparar ação: enviar fotos para WhatsApp (próxima etapa)
   └─ Retornar 200 OK (para Mercado Pago parar de tentar)
```

**4.2. Tratamento de Segurança**
- **Verificar Assinatura:** Mercado Pago envia `x-signature` header
- **Idempotência:** Se mesmo WebHook chegar 2x, não processa 2x
- **Retry Logic:** Se WebHook falhar, Mercado Pago tenta de novo por 24h
- **Timeout:** Se não receber confirmação em 30min, marcar como "Expirado" (refazer pagamento)

**4.3. Configuração no Mercado Pago (Manual)**
- Gerar credenciais (Access Token + Refresh Token)
- Registrar URL do WebHook: `https://seu-dominio.vercel.app/webhook/mercado-pago`
- Testar com webhook de teste: `https://webhook.site/seu-id`

---

### 5. ENTREGA - WhatsApp + Google Drive

**Problemas no fluxo original:**
- Sem especificação de qual API WhatsApp usar (oficialvs Evolution)
- Sem tratamento se a mensagem não chegar
- Sem registro de entrega

**Melhorias propostas:**

**5.1. Escolha da API WhatsApp**

| Opção                      | Custo      | Facilidade | Free Tier | Recomendação |
|----------------------------|-----------|-----------|-----------|--------------|
| WhatsApp Cloud API (oficial)| Pago      | Média     | Não       | Produção    |
| Evolution API (self-hosted) | VPS barata| Alta      | Sim*      | MVP         |
| Twilio WhatsApp             | Pago      | Alta      | Não       | -            |
| Link de Mensagem (simples)  | Gratuito  | Muito Alta| Sim       | **RECOMENDADO** |

**Recomendação para MVP:** Usar **Link de Mensagem WhatsApp** (mais simples, zero custo)
```
// Exemplo:
https://wa.me/5511999999999?text=Olá!%20Aqui%20está%20sua%20foto:%20[LINK]
```

Quando escalar para Evolution API:
```
POST https://localhost:3000/message/sendText
{
  "number": "5511999999999",
  "text": "Olá! Aqui está sua foto da Paróquia São Rafael.\n\n[LINK DRIVE]"
}
```

**5.2. Fluxo de Entrega (Google Apps Script Agendado)**
```
Trigger: A cada 2 minutos (verificar Google Sheet)

Para cada linha com status = "Pago" e "WhatsApp enviado" = Vazio:
  1. Buscar IDs das fotos (coluna FotoIds)
  2. Para cada foto ID:
     ├─ Buscar arquivo em /Processadas_Originais
     ├─ Gerar link de compartilhamento (Drive)
     └─ Registrar link em coluna "LinkEntrega"
  
  3. Montar mensagem personalizada:
     "Paz e Bem! Aqui está sua(s) foto(s) da Paróquia São Rafael.
      Que este registro do sacramento seja uma benção em sua família!
      
      [LINK 1]
      [LINK 2]
      ..."
  
  4. Enviar via Evolution API OU gerar link WhatsApp
  
  5. Registrar em Sheet:
     ├─ "WhatsApp enviado" = timestamp
     ├─ "Status" = "Entregue"
     └─ "Tentativas" += 1
  
  6. Se erro: registrar erro e tentar novamente em 5 minutos (máx 3x)
```

**5.3. Geração de Links Seguros**
```
Drive permite compartilhar com:
- anyoneWithTheLink (qualquer um com o link)
- readers (apenas leitura)
- Expiração: Pode ser automática ou manual

Recomendação: 
- anyoneWithTheLink + readers (seguro, não pode editar)
- Sem expiração (mas pode implementar depois)
```

---

## Arquivos e Estrutura de Projeto Recomendados

```
paroquia-fotos-venda/
├── .env.local                    # Credenciais (não commitar)
│   ├── MERCADO_PAGO_ACCESS_TOKEN
│   ├── GOOGLE_DRIVE_API_KEY
│   └── EVOLUTION_API_URL (se usar)
│
├── google-apps-script/
│   ├── Code.gs                   # Script principal
│   ├── Marca.gs                  # Função de marca d'água
│   ├── Drive.gs                  # Funções Drive API
│   ├── Sheet.gs                  # Funções Google Sheet
│   └── appsscript.json           # Manifest
│
├── frontend/
│   ├── index.html                # Página galeria
│   ├── style.css                 # Tailwind + custom
│   ├── app.js                    # Lógica frontend
│   ├── config.js                 # Endpoints API
│   └── package.json
│
├── backend/ (Vercel Functions)
│   ├── vercel.json               # Config Vercel
│   ├── api/
│   │   ├── fotos.js              # GET /api/fotos
│   │   ├── criar-pagamento.js    # POST /api/criar-pagamento
│   │   ├── status-pagamento.js   # GET /api/status-pagamento
│   │   └── webhook/
│   │       └── mercado-pago.js   # POST /webhook/mercado-pago
│   └── lib/
│       ├── mercado-pago.js       # Client MP
│       ├── google-drive.js       # Client Drive
│       ├── google-sheets.js      # Client Sheets
│       └── evolution-api.js      # Client WhatsApp (opcional)
│
├── docs/
│   ├── SETUP.md                  # Guia de instalação
│   ├── FLUXO.md                  # Documentação de fluxo
│   └── TROUBLESHOOTING.md        # Debugging
│
└── README.md
```

---

## Verificação & Testes End-to-End

### Teste 1: Entrada de Dados
- [ ] Fotógrafo faz upload de foto no Drive (evento real)
- [ ] Foto aparece na pasta de origem

### Teste 2: Processamento (Apps Script)
- [ ] Apps Script detecta a nova foto em <5 minutos
- [ ] Marca d'água é aplicada corretamente
- [ ] Arquivo salvo em `/Processadas_Amostras`
- [ ] Entrada criada no Google Sheet com ID único

### Teste 3: Vitrine (Frontend)
- [ ] Acessar site da galeria
- [ ] Foto com marca d'água aparece
- [ ] Selecionar fotos, inserir WhatsApp, revisar total
- [ ] Botão "Gerar Pix" funciona

### Teste 4: Pagamento (Mercado Pago)
- [ ] QR Code Pix é gerado
- [ ] Fazer pagamento (ou simular em sandbox)
- [ ] WebHook é recebido em <10 segundos
- [ ] Status na tela muda para "Confirmado!"

### Teste 5: Entrega (WhatsApp)
- [ ] Mensagem chega no WhatsApp em <2 minutos após pagamento
- [ ] Link da foto original (sem tarja) funciona
- [ ] Registrar em Sheet: "Status" = "Entregue"

### Teste 6: Fluxo Completo (Ponta a Ponta)
- [ ] Do upload → à entrega no WhatsApp (SEM intervenção)
- [ ] Todos os registros auditados em Google Sheet

---

## Stack Técnico Final

| Componente          | Tecnologia              | Custo    | Justificativa           |
|-------------------|------------------------|---------|------------------------|
| Automação (etapas 1-2) | Google Apps Script | Free | Integrado com Drive |
| Banco de Dados      | Google Sheets + Firestore | Free | Leve, sem setup |
| Frontend            | HTML5 + Tailwind CSS + JS | Free  | Simples, responsivo |
| Hospedagem Frontend | Vercel ou Netlify       | Free | Deploy automático |
| Backend             | Node.js (Vercel Func)  | Free  | Sem servidor, escalável |
| Marca d'Água        | ImageMagick (via Apps) | Free  | Processamento local |
| Pagamento           | Mercado Pago            | Taxa  | 2.99% + R$0,30 por tx |
| WhatsApp (MVP)      | Link de Mensagem        | Free  | Sem API |
| WhatsApp (Escala)   | Evolution API           | VPS   | ~R$50-100/mês |

---

## Próximos Passos (Ordem de Implementação)

1. **Design da Marca** (logo + estilo da paróquia)
2. **Estrutura Google Drive** (pastas + permissões)
3. **Google Apps Script** (detecção + marca d'água)
4. **Frontend** (galeria + seleção)
5. **Backend** (Mercado Pago)
6. **WhatsApp** (integração)
7. **Testes** (ponta a ponta)
8. **Deploy & Monitoramento**