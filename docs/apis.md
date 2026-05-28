# Documentação de APIs

## Convenções Gerais

- Base local: `http://localhost:3001`
- Base produção: domínio Vercel configurado.
- Prefixo: `/api`
- Resposta de erro padrão: `{ "error": "mensagem" }`
- Métodos não permitidos retornam `405`.
- Payloads críticos são validados com Zod.
- Rate limits são aplicados em `backend/server.js` via `backend/middleware/rate-limit.js`.

## `GET /api/health`

Verifica se a API está ativa.

**Resposta 200**

```json
{ "status": "ok", "timestamp": "2026-05-27T19:00:00.000Z" }
```

## `GET /api/eventos`

Lista eventos publicados. Aceita filtros opcionais.

**Query**

- `q`: texto de busca.
- `categoria`: categoria do evento.

**Resposta 200**

```json
{
  "eventos": [
    {
      "eventoId": "missa-2026-05",
      "title": "Missa de Maio",
      "category": "celebracoes",
      "date": "2026-05-10",
      "dateLabel": "10/05/2026",
      "location": "Paróquia São Rafael",
      "visibility": "publica",
      "salesAuthorized": true,
      "cover": "/api/eventos/missa-2026-05/previews/foto-1?variant=preview",
      "coverThumbnail": "/api/eventos/missa-2026-05/previews/foto-1?variant=thumbnail"
    }
  ]
}
```

## `GET /api/eventos/:eventoId`

Busca um evento publicado por ID.

**Resposta 200**

```json
{ "event": { "eventoId": "missa-2026-05", "title": "Missa de Maio" } }
```

**Erros**

- `404`: evento não encontrado.

## `GET /api/eventos/:eventoId/fotos`

Lista fotos processadas de um evento.

**Headers opcionais**

- `X-Gallery-Token`: exigido quando `visibility=protegida`.

**Resposta 200**

```json
{
  "event": {
    "eventoId": "missa-2026-05",
    "title": "Missa de Maio",
    "visibility": "publica",
    "salesAuthorized": true
  },
  "photos": [
    {
      "id": "foto-abc",
      "eventoId": "missa-2026-05",
      "previewUrl": "/api/eventos/missa-2026-05/previews/foto-abc?mt=jwt-midia",
      "thumbnailUrl": "/api/eventos/missa-2026-05/previews/foto-abc?variant=thumbnail&mt=jwt-midia",
      "price": 10,
      "availableForSale": true,
      "status": "Processada"
    }
  ]
}
```

**Erros**

- `401`: galeria protegida sem token válido.
- `404`: evento não encontrado.

## `GET /api/eventos/:eventoId/previews/:fotoId`

Entrega preview ou thumbnail autorizado.

**Query**

- `variant=preview|thumbnail`
- `mt`: token temporario de midia, assinado por evento, foto e variante, com expiracao curta de 10 minutos.
- `token`: fallback legado de galeria protegida, mantido temporariamente para compatibilidade.

**Headers**

- `X-Gallery-Token` nao e usado nesta rota; a autorizacao vem de `mt` ou do fallback `token`.

**Resposta**

Arquivo JPEG/WebP baixado do Drive.

**Erros**

- `401`: acesso não autorizado.
- `404`: foto ou derivado nao encontrado.
- `429`: padrao massivo de requisicoes de midia detectado.

## `POST /api/eventos/:eventoId/acesso`

Valida código de galeria protegida.

**Payload**

```json
{ "code": "123456" }
```

**Resposta 200**

```json
{ "token": "jwt-assinado", "expiresIn": 3600 }
```

**Erros**

- `400`: código inválido.
- `401`: código incorreto.
- `404`: galeria protegida não encontrada.

## `POST /api/checkout/quote`

Cota preço do carrinho sem criar pagamento.

**Payload**

```json
{
  "fotoIds": ["foto-abc", "foto-def"],
  "paymentMethod": "pix",
  "galleryTokens": {
    "evento-protegido": "jwt-assinado"
  }
}
```

**Resposta 200**

```json
{
  "pricing": {
    "quantity": 2,
    "photoPrice": 10,
    "subtotal": 20,
    "serviceFee": 0,
    "convenienceFee": 0,
    "paymentCost": 0.93,
    "total": 20.93
  }
}
```

**Erros**

- `400`: carrinho inválido.
- `401`: acesso expirado para galeria protegida.
- `409`: foto indisponível ou regra de pagamento ausente.

## `POST /api/checkout/preference`

Cria pedido e preferência Mercado Pago.

**Payload**

```json
{
  "name": "Maria Silva",
  "email": "maria@example.com",
  "whatsapp": "5511999999999",
  "fotoIds": ["foto-abc"],
  "paymentMethod": "pix",
  "galleryTokens": {}
}
```

**Resposta 201**

```json
{
  "pedidoId": "pedido_abc123",
  "checkoutUrl": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=...",
  "pricing": {
    "quantity": 1,
    "subtotal": 10,
    "paymentCost": 0.3,
    "total": 10.3
  }
}
```

**Erros**

- `400`: payload inválido.
- `401`: acesso expirado.
- `409`: foto indisponível ou pagamento indisponível.

## `POST /api/criar-pagamento`

Alias legado para `POST /api/checkout/preference`. Deve ser mantido apenas por compatibilidade.

## `GET /api/status-pagamento`

Consulta status de pedido.

**Query**

- `pedidoId`: ID do pedido.

**Resposta 200**

```json
{
  "pedidoId": "pedido_abc123",
  "status": "Pagamento Confirmado",
  "emailStatus": "enviado",
  "whatsappLink": "https://wa.me/..."
}
```

**Erros**

- `400`: `pedidoId` inválido.
- `404`: pedido não encontrado.

## `POST /api/webhook/mercado-pago`

Recebe notificações do Mercado Pago.

**Autenticação**

- Requer header de assinatura Mercado Pago.
- Valida HMAC com `MP_WEBHOOK_SECRET`.

**Fluxo**

1. Valida método e segredo.
2. Extrai `data.id`, request id e assinatura.
3. Rejeita assinatura inválida.
4. Garante idempotência em `Webhooks`.
5. Consulta pagamento no Mercado Pago.
6. Localiza pedido por metadata/preference/payment.
7. Se aprovado, valida `transaction_amount`, `currency_id=BRL` e total salvo no pedido.
8. Atualiza pedido.
9. Se aprovado e consistente, cria downloads e tenta entrega.

**Resposta 200**

```json
{ "ok": true }
```

**Respostas especiais**

```json
{ "ok": true, "duplicate": true }
```

```json
{ "ok": true, "unmatched": true }
```

```json
{ "ok": true, "divergent": true }
```

**Erros**

- `401`: assinatura inválida.
- `500`: segredo ausente ou erro inesperado.

## `POST /api/watermark`

Gera imagem com marca d'água a partir de arquivo no Drive.

**Autenticação**

- `x-pascom-timestamp`: epoch em milissegundos.
- `x-pascom-signature`: HMAC-SHA256 de `${timestamp}.${METHOD}.${PATH}.${rawBody}` com `APPS_SCRIPT_HMAC_SECRET`.
- Fallback legado temporário: `x-watermark-secret: WATERMARK_API_SECRET`, somente se `ALLOW_LEGACY_WORKER_SECRET=true`.

**Payload**

```json
{
  "fileId": "drive-file-id",
  "variant": "preview",
  "watermarkType": "color",
  "watermarkSeed": "evento:fotografia:preview"
}
```

**Resposta**

Imagem processada em binário ou JSON de erro, conforme implementação do handler.

**Erros**

- `400`: dados inválidos.
- `401`: não autorizado.
- `500`: erro no processamento.

## `POST /api/preprocess`

Redimensiona/converte imagens originais grandes antes do restante do fluxo.

**Autenticação**

- `x-pascom-timestamp` e `x-pascom-signature` com `APPS_SCRIPT_HMAC_SECRET`.
- Fallback legado temporário por `x-watermark-secret` somente se `ALLOW_LEGACY_WORKER_SECRET=true`.

**Payload**

```json
{ "fileId": "drive-file-id" }
```

**Resposta 200**

```json
{
  "skipped": false,
  "originalSize": 12345678,
  "processedSize": 3456789,
  "originalMimeType": "image/jpeg"
}
```

**Erros**

- `400`: `fileId` obrigatório.
- `401`: não autorizado.
- `422`: formato não suportado.

## `POST /api/cover-preview`

Gera derivado de capa de evento.

**Autenticação**

- `x-pascom-timestamp` e `x-pascom-signature` com `APPS_SCRIPT_HMAC_SECRET`.
- Fallback legado temporário por `x-watermark-secret` somente se `ALLOW_LEGACY_WORKER_SECRET=true`.

**Payload**

```json
{ "fileId": "drive-file-id", "variant": "thumbnail" }
```

**Resposta**

Imagem processada.

**Erros**

- `400`: dados inválidos.
- `401`: não autorizado.
- `500`: falha ao preparar capa.

## `GET /api/download`

Baixa uma copia full-res comprada, preparada no servidor com fingerprint forense invisivel vinculado ao pedido/download. O original privado do Drive nao e entregue byte-a-byte.

**Query**

- `token`: JWT assinado contendo `downloadId` e `exp`.

**Resposta**

Arquivo JPEG/PNG preparado com `X-Content-Protection: forensic-fingerprint`, `Cache-Control: private, no-store` e sem marca dagua visivel. O backend tambem exige que o `DownloadID` aponte para pedido confirmado e item efetivamente comprado.

**Erros**

- `400`: parâmetros inválidos.
- `401`: link inválido/expirado.
- `410`: link expirado ou limite de uso atingido.
- `500`: segredo ausente.
- `503`: falha temporaria ao preparar fingerprint; o uso do token nao e consumido.

## `POST /api/admin/cache/invalidate`

Invalida tags de cache.

**Autenticação**

- `x-pascom-timestamp` e `x-pascom-signature` com `APPS_SCRIPT_HMAC_SECRET`.
- Fallback legado temporário por `x-cache-invalidation-secret: CACHE_INVALIDATION_SECRET` somente se `ALLOW_LEGACY_WORKER_SECRET=true`.

**Payload**

```json
{
  "eventoId": "missa-2026-05",
  "scopes": ["catalogo", "evento", "media"]
}
```

**Resposta**

- `204 No Content`

**Erros**

- `400`: escopo inválido ou `eventoId` ausente.
- `401`: não autorizado.

## Dependências Externas

- Google Sheets: catálogo, pedidos e autorizações.
- Google Drive: originais e derivados.
- Mercado Pago: checkout e consulta de pagamentos.
- Vercel Runtime Cache: cache de catálogo/mídia.
- SMTP: envio de links.

## Rate Limits

As classes de limite estão em `backend/middleware/rate-limit.js`:

- geral;
- pagamento;
- cotação;
- fotos;
- mídia de galeria;
- abuso leve de mídia por IP/evento/variante em `backend/middleware/media-abuse.js`;
- consulta de status;
- processamento;
- acesso de galeria;
- download;
- webhook;
- administração.

Documente qualquer alteração nesses limites em `technical-changelog.md`.
