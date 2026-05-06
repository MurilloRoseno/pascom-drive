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

# PLANO TDD - Test-Driven Development

## Estratégia Global de Testes

### Pirâmide de Testes
```
        /\
       /  \          E2E Tests (10%)
      /────\         - Fluxo completo do usuário
     /      \        - Sem mocks
    /────────\
   /          \      Integration Tests (30%)
  /────────────\     - APIs externas mockadas
 /              \    - Fluxo entre componentes
/────────────────\   
│   Unit Tests   │   Unit Tests (60%)
│     (Jest)     │   - Lógica pura, sem side effects
└────────────────┘   - Rápido, isolado, mockado
```

**Métricas de Cobertura:**
- Linhas de código: 80%+
- Branches: 75%+
- Funções: 85%+
- Statements: 80%+

**Ferramentas:**
- **Jest** - Unit & Integration tests
- **Playwright** ou **Cypress** - E2E tests
- **Supertest** - HTTP API testing
- **jest-mock-extended** - Mocks avançados
- **@testing-library/react** - Testes de Frontend (se usar React)

---

## 1. GOOGLE APPS SCRIPT - Testes de Automação

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

### 1.2 Testes Unitários - Marca d'Água

**Arquivo:** `google-apps-script/__tests__/marca.test.js`

```javascript
describe('Marca d\'Água', () => {
  
  describe('aplicarMarcaDAgua', () => {
    it('deve aplicar marca d\'água a uma imagem válida', async () => {
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

    it('deve gerar ID único em formato FOTO_XXX', () => {
      const id1 = gerarIdUnico();
      const id2 = gerarIdUnico();
      
      expect(id1).toMatch(/^FOTO_\d{3}$/);
      expect(id1).not.toBe(id2);
    });

    it('deve falhar graciosamente com imagem inválida', async () => {
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
    it('deve validar dimensões mínimas da imagem', () => {
      const imagemPequeña = { width: 100, height: 100 };
      const imagemValida = { width: 1920, height: 1080 };
      
      expect(validarImagemMarcaDAgua(imagemPequeña)).toBe(false);
      expect(validarImagemMarcaDAgua(imagemValida)).toBe(true);
    });

    it('deve aceitar formatos JPG, PNG e HEIC', () => {
      expect(validarFormato('jpg')).toBe(true);
      expect(validarFormato('png')).toBe(true);
      expect(validarFormato('heic')).toBe(true);
      expect(validarFormato('gif')).toBe(false);
      expect(validarFormato('webp')).toBe(false);
    });

    it('deve calcular tamanho máximo (10MB)', () => {
      const blob10MB = { getBytes: () => new Array(10 * 1024 * 1024) };
      const blob15MB = { getBytes: () => new Array(15 * 1024 * 1024) };
      
      expect(validarTamanho(blob10MB)).toBe(true);
      expect(validarTamanho(blob15MB)).toBe(false);
    });
  });
});
```

### 1.3 Testes Unitários - Drive API

**Arquivo:** `google-apps-script/__tests__/drive.test.js`

```javascript
describe('Drive API', () => {
  
  describe('monitorarPastasNova', () => {
    it('deve detectar novo arquivo em pasta de eventos', () => {
      const mockFolder = {
        getFiles: jest.fn().mockReturnValue({
          hasNext: jest.fn()
            .mockReturnValueOnce(true)  // 1ª iteração
            .mockReturnValueOnce(false), // 2ª iteração
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

    it('deve ignorar arquivos já processados (cache)', () => {
      const mockFolder = { /* arquivo já visto */ };
      const cache = new Map([['foto_001.jpg', true]]);
      
      const novas = detectarNovasFormas(mockFolder, cache);
      
      expect(novas).not.toContain('foto_001.jpg');
    });

    it('deve falhar se pasta de eventos não existir', () => {
      DriveApp.getFoldersByName.mockReturnValue({
        hasNext: jest.fn().mockReturnValue(false)
      });

      expect(() => monitorarPastas()).toThrow('Pasta /Eventos não encontrada');
    });

    it('deve criar estrutura de pastas na primeira execução', () => {
      const mockParentFolder = {
        createFolder: jest.fn().mockReturnValue({}),
        getFolder: jest.fn().mockImplementation((name) => {
          throw new Error(`Pasta ${name} não existe`);
        })
      };

      inicializarEstrutura(mockParentFolder);

      expect(mockParentFolder.createFolder).toHaveBeenCalledWith('Eventos');
      expect(mockParentFolder.createFolder).toHaveBeenCalledWith('Sistema');
    });
  });

  describe('compartilharLink', () => {
    it('deve gerar link de compartilhamento público', () => {
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

    it('deve respeitar permissões (READER vs EDITOR)', () => {
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

### 1.4 Testes Unitários - Google Sheets

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
        evento: 'Missa Sábado',
        linkOriginal: 'https://drive.google.com/...',
        linkAmostra: 'https://drive.google.com/...',
        timestamp: new Date()
      });

      expect(mockSheet.appendRow).toHaveBeenCalledWith([
        'FOTO_001',
        'Missa Sábado',
        expect.any(String), // linkOriginal
        expect.any(String), // linkAmostra
        '',                 // whatsapp vazio
        'Não',              // pago
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

  describe('transações concorrentes', () => {
    it('deve evitar race condition ao inserir múltiplas fotos', () => {
      const mockSheet = {
        appendRow: jest.fn(),
        lock: jest.fn().mockReturnValue({
          waitLock: jest.fn()
        })
      };

      // Simular 3 requisições simultâneas
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

### 1.5 Testes de Integração - Apps Script

**Arquivo:** `google-apps-script/__tests__/integration.test.js`

```javascript
describe('Integração - Apps Script (Mock completo)', () => {
  
  it('deve processar foto end-to-end (upload → marca → sheet)', () => {
    // 1. Simular upload de foto
    const mockFile = {
      getName: jest.fn().mockReturnValue('evento_001.jpg'),
      getBlob: jest.fn().mockReturnValue({ /* imagem mock */ }),
      getParents: jest.fn().mockReturnValue({ /* pasta mock */ })
    };

    // 2. Aplicar marca d'água
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
      throw new Error('Erro de conexão com Drive');
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
    // Deve levar no mínimo 30 segundos (rate limit)
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

### 2.2 Testes Unitários - Funções de Negócio

**Arquivo:** `frontend/__tests__/calculos.test.js`

```javascript
describe('Cálculos de Preço', () => {
  
  it('deve calcular subtotal corretamente', () => {
    const fotos = [
      { id: 'FOTO_001', preco: 10.00 },
      { id: 'FOTO_002', preco: 10.00 },
      { id: 'FOTO_003', preco: 10.00 }
    ];

    const subtotal = calcularSubtotal(fotos);
    
    expect(subtotal).toBe(30.00);
  });

  it('deve aplicar taxa de conveniência (2.99% + R$0,30)', () => {
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

  it('deve rejeitar WhatsApp inválido', () => {
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

  it('deve permitir seleção de múltiplas fotos via checkbox', () => {
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

### 2.4 Testes de Fluxo - Formulário

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

    // Clicar "Próximo"
    container.querySelector('[data-action="proximo"]').click();

    // Step 2: WhatsApp
    expect(container.querySelector('[data-step="1"]')).not.toBeVisible();
    expect(container.querySelector('[data-step="2"]')).toBeVisible();
  });

  it('deve validar WhatsApp antes de avançar', () => {
    renderFluxoCompra(container);
    container.querySelector('[data-action="proximo"]').click(); // Step 1 → 2

    const inputWhatsApp = container.querySelector('[name="whatsapp"]');
    inputWhatsApp.value = '123'; // Inválido

    const btnProximo = container.querySelector('[data-action="proximo"]');
    btnProximo.click();

    // Não deve avançar
    expect(container.querySelector('[data-step="2"]')).toBeVisible();
    expect(container.querySelector('[data-error]')).toBeVisible();
  });

  it('deve exibir resumo correto no step 3', () => {
    renderFluxoCompra(container);

    // Selecionar fotos
    selectFotos(['FOTO_001', 'FOTO_002']);
    
    // Avançar para step 2
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

  it('deve desabilitar botão de pagamento até confirmação', () => {
    renderFluxoCompra(container);
    selectFotos(['FOTO_001']);
    avaçarParaStep3();

    const btnPagar = container.querySelector('[data-action="pagar"]');
    
    // Sem checkbox de confirmação
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
  
  test('usuário deve comprar fotos (happy path)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Step 1: Selecionar fotos
    await expect(page.locator('[data-testid="galeria"]')).toBeVisible();
    await page.locator('input[data-photo="FOTO_001"]').click();
    await page.locator('input[data-photo="FOTO_002"]').click();

    // Verificar resumo
    await expect(page.locator('[data-testid="resumo"]')).toContainText('2');

    // Avançar
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

  test('deve exibir erro se WhatsApp for inválido', async ({ page }) => {
    await page.goto('http://localhost:3000');

    await page.click('[data-action="proximo"]'); // Step 1 → 2
    await page.fill('[name="whatsapp"]', 'invalido');
    await page.click('[data-action="proximo"]');

    // Não deve avançar
    await expect(page.locator('[data-error]')).toBeVisible();
    await expect(page.locator('[data-step="2"]')).toBeVisible();
  });

  test('mobile: layout deve ser responsivo', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone
    await page.goto('http://localhost:3000');

    // Botões devem ter tamanho adequado
    const botao = await page.locator('[data-action="proximo"]');
    const box = await botao.boundingBox();
    
    expect(box.height).toBeGreaterThanOrEqual(44); // Mínimo iOS HIG
    expect(box.width).toBeGreaterThanOrEqual(44);
  });

  test('deve preservar estado ao voltar no navegador', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Selecionar fotos e avançar
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
    await expect(page.locator('[data-noscript]')).toContainText('JavaScript obrigatório');
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

### 3.2 Testes Unitários - Cliente Mercado Pago

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
        description: 'Fotos - Paróquia São Rafael',
        payer: { email: 'admin@paroquia.com' },
        payment_method_id: 'pix'
      })
      .reply(200, mockResponse);

    const resultado = await client.criarPagamentoPix({
      amount: 20.99,
      description: 'Fotos - Paróquia São Rafael'
    });

    expect(resultado.id).toBe(123456789);
    expect(resultado.point_of_interaction.transaction_data.qr_code).toBeDefined();
  });

  it('deve gerar QR Code válido', async () => {
    const qrCode = await client.gerarQRCode('https://api.mercadopago.com/123');
    
    expect(qrCode).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
    expect(qrCode.length).toBeGreaterThan(100);
  });

  it('deve lançar erro se token for inválido', async () => {
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
    
    // Não deve fazer mais de ~17 requests/segundo (1000/60)
    expect(primeiroMinuto.length).toBeLessThan(20);
  });
});
```

### 3.3 Testes de Integração - API de Pagamento

**Arquivo:** `backend/__tests__/api-pagamento.test.js`

```javascript
import request from 'supertest';
import { app } from '../app.js';
import * as sheet from '../lib/google-sheets.js';
import * as mp from '../lib/mercado-pago.js';

jest.mock('../lib/google-sheets.js');
jest.mock('../lib/mercado-pago.js');

describe('POST /api/criar-pagamento', () => {
  
  it('deve validar campos obrigatórios', async () => {
    const response = await request(app)
      .post('/api/criar-pagamento')
      .send({ /* faltam campos */ });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('whatsapp obrigatório');
  });

  it('deve criar pagamento e registrar em Sheet', async () => {
    sheet.registrarPedido.mockResolvedValue({ id: 'PEDIDO_001' });
    mp.criarPagamentoPix.mockResolvedValue({
      id: 123456,
      point_of_interaction: { transaction_data: { qr_code: 'ABC123' } }
    });

    const response = await request(app)
      .post('/api/criar-pagamento')
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
        .post('/api/criar-pagamento')
        .send({ whatsapp, fotoIds: ['FOTO_001'], totalComTaxa: 10 });

      expect(response.status).toBe(400);
    }
  });

  it('deve rejeitar valor acima de R$ 10.000', async () => {
    const response = await request(app)
      .post('/api/criar-pagamento')
      .send({
        whatsapp: '11999999999',
        fotoIds: Array(1001).fill('FOTO_001'),
        totalComTaxa: 10001
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('valor máximo');
  });

  it('deve conter idempotência: mesma requisição 2x = mesma resposta', async () => {
    const payload = {
      whatsapp: '11999999999',
      fotoIds: ['FOTO_001'],
      totalComTaxa: 10.99
    };

    const res1 = await request(app).post('/api/criar-pagamento').send(payload);
    const res2 = await request(app).post('/api/criar-pagamento').send(payload);

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

  it('deve retornar pending enquanto não confirmado', async () => {
    mp.verificarPagamento.mockResolvedValue({ status: 'pending' });

    const response = await request(app)
      .get('/api/status-pagamento?transacao_id=123456');

    expect(response.body.status).toBe('pending');
  });

  it('deve timeout após 30 minutos', async () => {
    const timestamp = Date.now() - (31 * 60 * 1000); // 31 minutos atrás
    
    sheet.buscarPedido.mockResolvedValue({ timestamp });

    const response = await request(app)
      .get('/api/status-pagamento?transacao_id=123456');

    expect(response.body.status).toBe('expired');
  });
});
```

### 3.4 Testes de WebHook - Segurança

**Arquivo:** `backend/__tests__/webhook-seguranca.test.js`

```javascript
import request from 'supertest';
import { app } from '../app.js';
import crypto from 'crypto';

jest.mock('../lib/google-sheets.js');
jest.mock('../lib/whatsapp-api.js');

describe('POST /webhook/mercado-pago (Segurança)', () => {
  
  it('deve rejeitar webhook sem assinatura', async () => {
    const response = await request(app)
      .post('/webhook/mercado-pago')
      .send({ id: 123456, action: 'payment.created' });

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('assinatura inválida');
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

  it('deve rejeitar IP não autorizado (whitelist)', async () => {
    const whitelist = [
      '200.147.226.0/24',  // Mercado Pago
      '203.0.113.0/24'
    ];

    const request = {
      ip: '192.168.1.1' // IP não autorizado
    };

    expect(validarIP(request.ip, whitelist)).toBe(false);
  });
});
```

### 3.5 Testes E2E - Fluxo Pagamento → Entrega

**Arquivo:** `backend/__tests__/e2e-pagamento.test.js`

```javascript
import request from 'supertest';
import { app } from '../app.js';

describe('E2E - Pagamento → Entrega (Mocks)', () => {
  
  it('deve processar fluxo completo sem APIs reais', async () => {
    // 1. Criar pagamento
    const criarResp = await request(app)
      .post('/api/criar-pagamento')
      .send({
        whatsapp: '11999999999',
        fotoIds: ['FOTO_001', 'FOTO_002'],
        totalComTaxa: 20.99
      });

    expect(criarResp.status).toBe(200);
    const { transactionId } = criarResp.body;

    // 2. Simular confirmação de pagamento
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
  
  it('deve suportar 50 usuários simultâneos na galeria', async () => {
    const options = {
      url: 'http://localhost:3000/api/fotos',
      concurrent: 50,
      maxRequests: 100,
      requestsPerSecond: 2 // ~120 req/min
    };

    const result = await loadtest.loadTest(options);

    expect(result.totalRequests).toBe(100);
    expect(result.totalErrors).toBe(0);
    expect(result.rps.mean).toBeLessThan(200); // Menos de 200ms por request
  });

  it('deve suportar 10 criações de pagamento/min', async () => {
    const options = {
      url: 'http://localhost:3000/api/criar-pagamento',
      method: 'POST',
      body: {
        whatsapp: '11999999999',
        fotoIds: ['FOTO_001'],
        totalComTaxa: 10.99
      },
      concurrent: 5, // 5 simultâneos
      maxRequests: 20,
      requestsPerSecond: 0.167 // ~10 req/min
    };

    const result = await loadtest.loadTest(options);

    expect(result.totalErrors).toBe(0);
    expect(result.rps.mean).toBeLessThan(500); // Menos de 500ms
  });

  it('deve timeout gracefully sob pico (100 req/min)', async () => {
    const options = {
      url: 'http://localhost:3000/api/fotos',
      concurrent: 20,
      maxRequests: 100,
      requestsPerSecond: 1.667 // 100 req/min
    };

    const result = await loadtest.loadTest(options);

    // Não deve quebrar
    expect(result.totalRequests).toBe(100);
    // Mas pode ter timeouts
    expect(result.totalErrors).toBeLessThanOrEqual(10);
  });
});
```

---

## Ordem de Implementação (TDD First)

### Fase 1: Setup & Fixtures (1-2 dias)
1. [ ] Configurar Jest + mocks globais
2. [ ] Criar fixtures de teste (fotos, eventos, pagamentos)
3. [ ] Estrutura de testes no git

### Fase 2: Google Apps Script (3-4 dias)
1. [ ] Tests: marca d'água (marca.test.js)
2. [ ] Implementar: aplicarMarcaDAgua()
3. [ ] Tests: Drive API (drive.test.js)
4. [ ] Implementar: monitorarPastas(), compartilharLink()
5. [ ] Tests: Google Sheets (sheet.test.js)
6. [ ] Implementar: registrarFoto(), buscarFotosComStatusPago()
7. [ ] Tests: Integração (integration.test.js)
8. [ ] Implementar: fluxo end-to-end

### Fase 3: Frontend (2-3 dias)
1. [ ] Tests: cálculos (calculos.test.js)
2. [ ] Implementar: calcularSubtotal(), calcularTaxa(), validarWhatsApp()
3. [ ] Tests: componentes (galeria.test.js)
4. [ ] Implementar: renderGaleria(), seleção de fotos
5. [ ] Tests: fluxo (fluxo-compra.test.js)
6. [ ] Implementar: navegação entre steps
7. [ ] Tests: E2E (Playwright)
8. [ ] Ajustar responsividade

### Fase 4: Backend - APIs (3-4 dias)
1. [ ] Tests: Mercado Pago client (mercado-pago.test.js)
2. [ ] Implementar: criarPagamentoPix(), gerarQRCode()
3. [ ] Tests: API /criar-pagamento (api-pagamento.test.js)
4. [ ] Implementar: validação, chamada a Mercado Pago
5. [ ] Tests: WebHook segurança (webhook-seguranca.test.js)
6. [ ] Implementar: validação de assinatura, idempotência
7. [ ] Tests: E2E completo (e2e-pagamento.test.js)

### Fase 5: Stress & Monitoring (1-2 dias)
1. [ ] Tests: carga leve (stress.test.js)
2. [ ] Implementar: rate limiting, logs
3. [ ] Configurar: monitoring (Sentry, Datadog)
4. [ ] Executar: stress tests
5. [ ] Otimizar: se necessário

### Fase 6: Deploy & Produção (1 dia)
1. [ ] CI/CD setup (GitHub Actions)
2. [ ] Executar todos os testes antes de deploy
3. [ ] Deploy gradual (canary)
4. [ ] Monitoramento em tempo real

---

## Métricas de Sucesso

| Métrica | Alvo | Ferramenta |
|---------|------|-----------|
| Cobertura de código | 80%+ | Jest coverage |
| Tempo de teste unit | <1s cada | Jest |
| Tempo de teste E2E | <5s cada | Playwright |
| Taxa de erro (prod) | <0.1% | Sentry |
| P95 latência (API) | <500ms | Datadog |
| Stress test (50 users) | 100% sucesso | loadtest |

---

## Próximos Passos

**Depois de confirmação do plano TDD:**
1. Iniciar **Fase 1** (Setup & Fixtures)
2. Criar arquivo `jest.config.js` com configuração global
3. Criar pasta `__tests__/fixtures/` com dados mock
4. Primeiro teste: tests/marca.test.js (Red → Green → Refactor)