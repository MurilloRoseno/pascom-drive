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

Em smartphones e tablets, a jornada usa a interface dedicada mobile portada do HTML standalone, com navegação inferior, calendário completo, perfil/Pascom, carrinho em bottom sheet, checkout em duas etapas e lightbox fullscreen.

Favoritos locais, recuperação de pedidos por e-mail/código, cupons, pacotes e compartilhamento controlado já possuem integração real. Funcionalidades que ainda permanecem como placeholders inativos: débito virtual CAIXA, upload Pascom, relatórios e moderação.

## Fluxo de Política de Privacidade

```text
Usuário
  -> acessa /privacidade ou /politica-de-privacidade
  -> React carrega DesktopApp ou MobileApp conforme plataforma
  -> PrivacyPolicy renderiza a mesma política canônica
  -> usuário consulta dados coletados, finalidades, direitos e contato
```

Detalhes operacionais:

- A rota é pública e não chama APIs backend.
- No desktop, o acesso fica disponível no rodapé institucional.
- No mobile, o acesso fica na tela `/perfil`, sem poluir a navegação inferior principal.
- O conteúdo descreve Google Sheets/Drive, Mercado Pago, Vercel, WhatsApp, SMTP/e-mail, galerias protegidas, downloads e logs técnicos.
- Qualquer alteração futura em coleta, pagamento, entrega, fornecedores ou retenção deve atualizar a política e o changelog técnico.

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

## Fluxo de Favoritos Locais

1. Usuário toca no botão de favorito em uma foto da galeria desktop ou mobile.
2. Frontend grava apenas `eventoId` e `fotoId` em `localStorage`, sem enviar esse dado ao backend.
3. Ao reabrir a galeria, os IDs favoritos são reconciliados com as fotos retornadas pela API.
4. Fotos removidas, expiradas ou indisponíveis deixam de aparecer como compráveis e podem ser retiradas pelo usuário.
5. Usuário pode adicionar favoritos válidos ao carrinho em lote.

Favoritos são conveniência local por dispositivo, não histórico pastoral centralizado.

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

## Fluxo de Tokens Temporarios de Midia

1. Frontend chama `GET /api/eventos/:eventoId/fotos` com permissao de galeria ja validada.
2. Backend retorna `previewUrl` e `thumbnailUrl` com `mt` assinado por evento, foto e variante.
3. O token de midia expira em 10 minutos e nao substitui o token de galeria ou o pagamento.
4. `GET /api/eventos/:eventoId/previews/:fotoId` valida `mt`; o fallback `token` de galeria segue temporariamente aceito.
5. Capas editoriais continuam publicas/cacheaveis; fotos vendaveis continuam `private, no-store`.
6. `mediaAbuseGuard` bloqueia padroes massivos por IP/evento/variante com `429`, sem afetar checkout/pagamento.

## Fluxo de Protecao Discreta contra DevTools

1. Em producao, paginas de evento/galeria/lightbox ativam `useDevtoolsGuard`.
2. O guard mede diferencas entre viewport externa e interna em intervalo leve.
3. Duas leituras suspeitas adicionam `body.devtools-open`.
4. CSS borra elementos `.photo-blur-target` e a UI mostra aviso discreto.
5. Tres leituras limpas removem a classe e restauram as previas.
6. O fluxo nao bloqueia checkout, APIs, Mercado Pago, navegacao ou downloads autorizados.

Esta protecao e antifraude leve contra captura casual, nao DRM. A seguranca real continua em marca d'agua, tokens assinados, download controlado e rate limit.

## Fluxo de Checkout

1. Carrinho possui uma ou mais fotos.
2. `CheckoutPage` coleta tokens por evento protegido.
3. Frontend envia `couponCode` e/ou `packageId` quando o usuario escolhe oferta.
4. Frontend chama `POST /api/checkout/quote`.
5. Backend valida payload e permissoes.
6. Backend le fotos, regras de pagamento, cupons e pacotes no Sheets.
7. Backend recalcula preco, nao empilha descontos e aplica a melhor condicao valida.
8. Usuario preenche nome, e-mail e WhatsApp.
9. Frontend valida com Zod.
10. Frontend chama `POST /api/checkout/preference` com os mesmos dados comerciais.
11. Backend registra `Pedidos`, `ItensPedido`, `CupomCodigo`, `DescontoTotal`, `PacoteID` e `TotalAntesDesconto`.
12. Backend cria preferencia no Mercado Pago.
13. Frontend redireciona para `checkoutUrl`.

## Fluxo de Cupons e Pacotes

1. Galeria chama `GET /api/eventos/:eventoId/ofertas`.
2. Backend filtra `Cupons` e `Pacotes` ativos, vigentes e aplicaveis ao evento.
3. Frontend mostra sugestoes como `Levar todas`, `Combo familia`, `3 fotos com desconto` e chips de cupom.
4. Usuario seleciona pacote ou digita cupom no checkout.
5. Backend valida evento, quantidade minima, vigencia, uso maximo e disponibilidade das fotos.
6. Se cupom e pacote forem aplicaveis ao mesmo tempo, o backend compara condicoes e aplica apenas uma.
7. Pedido salva o desconto aplicado para auditoria financeira e reconciliacao do webhook.

## Fluxo de Recuperacao de Pedido

1. Usuario abre `Recuperar pedido` no desktop ou a area publica de `/perfil` no mobile.
2. Informa e-mail e `pedidoId`/codigo do pedido.
3. Frontend chama `POST /api/pedidos/recuperar`.
4. Backend aplica rate limit, valida payload e busca pedido por ID.
5. E-mail informado deve bater com o e-mail salvo no pedido.
6. Se o pedido estiver aprovado, backend regenera/retorna links seguros de download e mensagem assistida de WhatsApp.
7. Se estiver pendente ou consultavel, a UI mostra status e orienta acompanhamento.

## Fluxo de Compartilhamento Controlado

1. Usuario toca em `Compartilhar evento`.
2. Mobile usa Web Share API quando disponivel; desktop copia link para a area de transferencia.
3. Link preferencial e `/evento/:eventoId`; quando `SlugPublico` existir, `/e/:slug` resolve para o mesmo evento.
4. Evento protegido continua exigindo codigo de galeria; o link bonito nao libera fotos nem downloads.
5. Metadados de compartilhamento devem usar titulo, capa editorial/thumbnail e descricao segura, sem expor originais.

## Nota de Compatibilidade do Checkout

O fluxo anterior sem cupons/pacotes foi substituido pelo fluxo acima. O alias legado `POST /api/criar-pagamento` continua apontando para `POST /api/checkout/preference`, mas usa as mesmas regras comerciais centralizadas.

## Fluxo Mercado Pago

```text
Mercado Pago
  -> POST /api/webhook/mercado-pago
  -> validarAssinaturaWebhook()
  -> registrarWebhookSeNovo()
  -> consultarPagamento()
  -> buscarPedidoByPreferenceOrPayment()
  -> validar valor, moeda BRL e pedido esperado
  -> atualizarPedidoPagamento()
  -> criarDownloadsDoPedido()
  -> enviarEmailEntrega()
  -> registrarEntrega()
  -> finalizarWebhook()
```

Pontos críticos:

- webhook precisa ser idempotente;
- assinatura HMAC é obrigatória;
- pagamento aprovado, valor correto e moeda `BRL` são condições obrigatórias para entrega;
- divergência vira `PagamentoDivergente` e não cria downloads;
- falha de e-mail não deve apagar pedido nem download.

## Fluxo de Download

1. Apos pagamento aprovado, backend cria registros na aba `Downloads`.
2. Cada registro recebe `DownloadID`, `TokenHash`, expiracao, limite de uso e `FingerprintID` por pedido/foto/download.
3. Link contem JWT assinado com `downloadId` e `exp`.
4. Cliente acessa `GET /api/download?token=...`.
5. Backend valida assinatura e expiracao do JWT.
6. Backend compara hash do token com Sheets e exige pedido confirmado + item comprado sem consumir uso ainda.
7. Backend baixa original privado do Drive.
8. Backend gera copia full-res com fingerprint forense invisivel e metadados tecnicos.
9. Somente apos a copia ser gerada, incrementa `Usos` e registra status/versao/aplicacao do fingerprint.
10. Se a geracao falhar, retorna `503` e nao consome o token.

## Fluxo de Processamento de Imagem

1. Apps Script recebe arquivo do Drive.
2. Assina a chamada interna com `x-pascom-timestamp` e `x-pascom-signature`.
3. Chama `/api/preprocess` para reduzir/converter quando necessário.
4. Chama `/api/watermark` para foto comum ou `/api/cover-preview` para capa.
5. Backend valida HMAC, timestamp e janela maxima de 5 minutos.
6. Watermark de fotos vendaveis usa logo/grade/texto `AMOSTRA`, seed deterministico e metadados de restricao.
7. Backend usa Google Drive API para baixar arquivo.
8. Backend usa Sharp para resize/composicao.
9. Apps Script salva derivado no Drive.
10. Apps Script atualiza `PreviewFileID`, `ThumbnailFileID` e status no Sheets.

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
