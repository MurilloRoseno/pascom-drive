# Graph Report - Drive  (2026-05-29)

## Corpus Check
- 148 files · ~955,498 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 728 nodes · 1141 edges · 130 communities (125 shown, 5 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `33ee7a5e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `useCarrinho()` - 23 edges
2. `rows()` - 22 edges
3. `request()` - 20 edges
4. `useTranslation()` - 17 edges
5. `processarEventos()` - 15 edges
6. `setField()` - 15 edges
7. `getEventoSelecionado()` - 13 edges
8. `brl()` - 12 edges
9. `invalidarCacheSite()` - 11 edges
10. `rows()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `post()` --calls--> `request()`  [INFERRED]
  backend/__tests__/webhook.test.js → frontend/src/lib/api.js
- `authorizedPost()` --calls--> `request()`  [INFERRED]
  backend/__tests__/preprocess.test.js → frontend/src/lib/api.js
- `authorizedPost()` --calls--> `request()`  [INFERRED]
  backend/__tests__/watermark-api.test.js → frontend/src/lib/api.js
- `listarRegrasPagamento()` --calls--> `rows()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/google-sheets.shared.js
- `listarPedidosPascom()` --calls--> `rows()`  [INFERRED]
  backend/lib/google-sheets.pascom.js → backend/lib/google-sheets.shared.js

## Communities (130 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (31): CarrinhoScreen(), CartBar(), CartSummary(), CheckoutScreen(), FlowPriceHelpCard(), FotoLightboxScreen(), GaleriaFotosScreen(), PaymentReturnScreen() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (49): active(), availablePhotosCount(), calcularComercial(), couponDiscount(), couponFromRow(), couponIsUsable(), incrementarUsoCupom(), listarCupons() (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (46): alternarVisibilidadeSelecionada(), aplicarValidacaoLista(), aplicarValidacoesAdministrativas(), appendMappedRow(), arquivarEventoSelecionado(), atualizarCelula(), atualizarDerivadosFoto(), atualizarDisponibilidadeFotos() (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (24): Calculator(), Didactic(), Faq(), Hero(), useCalculator(), useSimulation(), LanguageProvider(), useTranslation() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (27): entregarFotos(), processarEventos(), processarFotosNovas(), verificarEventosProntosParaRemover(), getAmostrasFolder(), getSourceFolder(), getThumbnailsFolder(), listarArquivosDoEvento() (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (20): CartSummary(), fmt(), money(), PhotoCard(), useCarrinhoContext(), useCarrinho(), usePollingStatus(), Header() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (29): atualizarPedidoPagamento(), atualizarStatus(), buscarEvento(), buscarFotosParaCompra(), buscarOriginaisPedido(), buscarPedidoById(), buscarPedidoByPreferenceOrPayment(), catalogoPublicado() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (11): MobileHome(), MobileRoutes(), MobileSearch(), routeNameFromLocation(), useEventos(), useEventosCatalog(), shadeColor(), galleryToken() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (15): bearer(), cotarCheckout(), criarPagamento(), listarFotos(), listarFotosEvento(), listarOfertasEvento(), obterEvento(), obterEventoPorSlug() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (8): CarrinhoProvider(), detectPlatform(), getPlatformSnapshot(), isMobileExperience(), subscribePlatform(), App(), advanceToStep2(), renderCheckout()

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (9): categoryLabel(), listarEventos(), dateLabel(), scheduleLabel(), EventCard(), MobileEvent(), EventCard(), SearchCard() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.16
Nodes (9): EventRoute(), useEventGallery(), EventPage(), eventToken(), hasDevtoolsLikeViewportGap(), nextGuardCounters(), useDevtoolsGuard(), useFavoritePhotos() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.19
Nodes (15): buscarPreviewFoto(), buscarEvento(), buscarEventoPorSlug(), buscarFotosParaCompra(), buscarPreviewFoto(), catalogoPublicado(), listarEventos(), listarEventosPublicados() (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.36
Nodes (13): addSearchBox(), addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns() (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (10): getSecret(), hashCode(), issueGalleryToken(), tokenAllowsEvent(), verifyCode(), base64urlDecode(), base64urlEncode(), signToken() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.44
Nodes (10): a(), B(), c(), D(), g(), i(), k(), o() (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (9): dashboardPascom(), detalharPedidoPascom(), downloadFromRow(), itemFromRow(), listarPedidosPascom(), monthIso(), numberValue(), pedidoFromRow() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.35
Nodes (9): authorizeWorker(), bodyForSignature(), expectedSignature(), legacyAllowed(), logWorkerAuthFailure(), requestPath(), timingSafeStringEqual(), verifyLegacy() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.38
Nodes (9): buildEventSharePayload(), buildEventShareText(), buildEventShareUrl(), buildWhatsAppWebShareUrl(), cleanOrigin(), eventId(), eventSlug(), eventTitle() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): authenticatePascom(), configured(), findPascomMember(), normalizePhone(), phoneMatches(), userIdentifiers()

### Community 20 - "Community 20"
Cohesion: 0.31
Nodes (4): client(), consultarPagamento(), criarPreferencia(), paymentMethods()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (7): createAuth(), downloadFile(), downloadFileAsJpeg(), getAccessToken(), parsePrivateKey(), updateFile(), uploadFile()

### Community 22 - "Community 22"
Cohesion: 0.52
Nodes (6): buildSpacedTile(), buildWatermarkTile(), compositeWatermark(), detectWatermarkType(), deterministicOffset(), structuralOverlay()

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (3): workerHeaders(), authorizedPost(), authorizedPost()

### Community 25 - "Community 25"
Cohesion: 0.73
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 29 - "Community 29"
Cohesion: 0.83
Nodes (3): bytesToHex(), criarHeadersBackendInterno(), hmacSha256Hex()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CarrinhoProvider()` connect `Community 9` to `Community 5`, `Community 7`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 9` to `Community 3`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `useCarrinho()` (e.g. with `CartSummary()` and `PhotoCard()`) actually correct?**
  _`useCarrinho()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `rows()` (e.g. with `availablePhotosCount()` and `listarCupons()`) actually correct?**
  _`rows()` has 20 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `request()` (e.g. with `authorizedPost()` and `authorizedPost()`) actually correct?**
  _`request()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useTranslation()` (e.g. with `AppContent()` and `Calculator()`) actually correct?**
  _`useTranslation()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `processarEventos()` (e.g. with `sincronizarConfiguracoesAdministrativas()` and `listarEventosNovos()`) actually correct?**
  _`processarEventos()` has 12 INFERRED edges - model-reasoned connections that need verification._