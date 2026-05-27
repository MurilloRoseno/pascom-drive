# Fluxos do Sistema

## Jornada do Usuário Comprador

```text
Cliente
  -> index.html detecta desktop/mobile/tablet
  -> React carrega DesktopApp ou MobileApp
  -> acessa /
  -> busca evento em /buscar
  -> abre /evento/:eventoId
  -> informa código se galeria protegida
  -> seleciona fotos
  -> revisa carrinho
  -> preenche checkout
  -> paga no Mercado Pago
  -> retorna para /pagamento/:resultado
  -> recebe links seguros por e-mail ou WhatsApp assistido
```

Em smartphones e tablets, a jornada usa a interface dedicada mobile com navegação inferior, carrinho em bottom sheet e lightbox fullscreen.

## Fluxo de Publicação de Evento

1. Operador cria pasta de evento em `SOURCE_FOLDER_ID`.
2. Apps Script `processarEventos()` roda por trigger.
3. `listarEventosNovos()` identifica pasta ainda não registrada.
4. `registrarEvento()` cria linha na aba `Eventos`.
5. Fotos são processadas por `processarFoto()`.
6. Originais vão para pasta de originais.
7. Previews/thumbnails são gerados via backend e salvos no Drive.
8. Aba `Fotos` recebe IDs dos derivados.
9. Operador revisa `Eventos` e marca publicação/venda.
10. Apps Script invalida cache do site quando necessário.

## Fluxo de Galeria Pública

1. Frontend chama `GET /api/eventos/:eventoId`.
2. Backend lê catálogo publicado do Sheets.
3. Se evento existe e está publicado, retorna dados seguros.
4. Frontend chama `GET /api/eventos/:eventoId/fotos`.
5. Backend retorna fotos `Processada`, não capa e disponíveis conforme regra.
6. Usuário adiciona fotos ao carrinho.

## Fluxo de Galeria Protegida

1. Frontend tenta carregar fotos sem token.
2. Backend identifica `visibility=protegida`.
3. Backend retorna `401` com indicação de proteção.
4. Usuário informa código.
5. Frontend chama `POST /api/eventos/:eventoId/acesso`.
6. Backend compara código com `CodigoHash`.
7. Se válido, emite token assinado com expiração.
8. Frontend salva token em `sessionStorage`.
9. Próximas chamadas usam `X-Gallery-Token`.

## Fluxo de Checkout

1. Carrinho possui uma ou mais fotos.
2. `CheckoutPage` coleta tokens por evento protegido.
3. Frontend chama `POST /api/checkout/quote`.
4. Backend valida payload e permissões.
5. Backend lê fotos e regras de pagamento no Sheets.
6. Backend calcula preço com `calculatePricing`.
7. Usuário preenche nome, e-mail e WhatsApp.
8. Frontend valida com Zod.
9. Frontend chama `POST /api/checkout/preference`.
10. Backend registra `Pedidos` e `ItensPedido`.
11. Backend cria preferência no Mercado Pago.
12. Frontend redireciona para `checkoutUrl`.

## Fluxo Mercado Pago

```text
Mercado Pago
  -> POST /api/webhook/mercado-pago
  -> validarAssinaturaWebhook()
  -> registrarWebhookSeNovo()
  -> consultarPagamento()
  -> buscarPedidoByPreferenceOrPayment()
  -> atualizarPedidoPagamento()
  -> criarDownloadsDoPedido()
  -> enviarEmailEntrega()
  -> registrarEntrega()
  -> finalizarWebhook()
```

Pontos críticos:

- webhook precisa ser idempotente;
- assinatura HMAC é obrigatória;
- pagamento aprovado é a única condição para entrega;
- falha de e-mail não deve apagar pedido nem download.

## Fluxo de Download

1. Após pagamento aprovado, backend cria registros na aba `Downloads`.
2. Cada registro recebe `DownloadID`, `TokenHash`, expiração e limite de uso.
3. Link contém JWT assinado com `downloadId` e `exp`.
4. Cliente acessa `GET /api/download?token=...`.
5. Backend valida assinatura e expiração do JWT.
6. Backend compara hash do token com Sheets.
7. Backend incrementa uso.
8. Backend baixa original do Drive e entrega ao cliente.

## Fluxo de Processamento de Imagem

1. Apps Script recebe arquivo do Drive.
2. Chama `/api/preprocess` para reduzir/converter quando necessário.
3. Chama `/api/watermark` para foto comum ou `/api/cover-preview` para capa.
4. Backend usa Google Drive API para baixar arquivo.
5. Backend usa Sharp para resize/composição.
6. Apps Script salva derivado no Drive.
7. Apps Script atualiza `PreviewFileID`, `ThumbnailFileID` e status no Sheets.

## Fluxos de Erro

| Fluxo | Falha | Comportamento esperado |
| --- | --- | --- |
| Catálogo | Sheets indisponível | API deve retornar erro tratado; frontend mostra estado vazio/erro |
| Galeria protegida | Código incorreto | `401` e formulário permanece disponível |
| Checkout | Foto indisponível | `409`; usuário precisa revisar carrinho |
| Pagamento | Mercado Pago indisponível | `409` ou erro; pedido não deve ser marcado como pago |
| Webhook | Assinatura inválida | `401`; nada é processado |
| Entrega | SMTP ausente | Pedido registra status `nao_configurado`; WhatsApp assistido pode ser usado |
| Download | Token vencido | `401` ou `410`; não entrega arquivo |
| Processamento | Arquivo não suportado | `422`; Apps Script registra erro |

## Fluxos Assíncronos

- Trigger Apps Script a cada 5 minutos.
- Webhook Mercado Pago chega fora da sessão do usuário.
- E-mail de entrega ocorre no backend após confirmação.
- Cache pode permanecer até TTL ou invalidação explícita.

## Integrações

- Google Drive: origem de fotos, armazenamento de originais e derivados.
- Google Sheets: banco e painel operacional.
- Mercado Pago: pagamento e confirmação.
- SMTP: e-mail de entrega.
- WhatsApp: canal assistido por link `wa.me`.
- Vercel: hospedagem e cache.
