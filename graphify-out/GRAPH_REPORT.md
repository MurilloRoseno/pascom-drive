# Graph Report - Drive  (2026-05-28)

## Corpus Check
- 120 files · ~942,449 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 600 nodes · 934 edges · 109 communities (105 shown, 4 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 111 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f3de2418`
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `useCarrinho()` - 23 edges
2. `useTranslation()` - 17 edges
3. `processarEventos()` - 15 edges
4. `setField()` - 15 edges
5. `rows()` - 13 edges
6. `getEventoSelecionado()` - 13 edges
7. `invalidarCacheSite()` - 11 edges
8. `rows()` - 11 edges
9. `request()` - 10 edges
10. `brl()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `post()` --calls--> `request()`  [INFERRED]
  backend/__tests__/webhook.test.js → frontend/src/lib/api.js
- `criarDownloadsDoPedido()` --calls--> `buscarOriginaisPedido()`  [INFERRED]
  backend/lib/delivery.js → backend/lib/google-sheets.orders.js
- `listarFotosEvento()` --calls--> `readThrough()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/runtime-cache.js
- `buscarPreviewFoto()` --calls--> `readThrough()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/runtime-cache.js
- `listarRegrasPagamento()` --calls--> `rows()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/google-sheets.shared.js

## Communities (109 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): CarrinhoScreen(), CartBar(), CartSummary(), CheckoutScreen(), FotoLightboxScreen(), GaleriaFotosScreen(), PaymentReturnScreen(), CalendarioScreen() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (46): alternarVisibilidadeSelecionada(), aplicarValidacaoLista(), aplicarValidacoesAdministrativas(), appendMappedRow(), arquivarEventoSelecionado(), atualizarCelula(), atualizarDerivadosFoto(), atualizarDisponibilidadeFotos() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (37): buscarPreviewFoto(), buscarEvento(), buscarFotosParaCompra(), buscarPreviewFoto(), catalogoPublicado(), listarEventos(), listarEventosPublicados(), listarFotosEvento() (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (24): Calculator(), Didactic(), Faq(), Hero(), useCalculator(), useSimulation(), LanguageProvider(), useTranslation() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (35): createTransporter(), criarDownloadsDoPedido(), enviarEmailEntrega(), smtpConfigured(), atualizarPedidoPagamento(), atualizarStatus(), buscarEvento(), buscarFotosParaCompra() (+27 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (27): entregarFotos(), processarEventos(), processarFotosNovas(), verificarEventosProntosParaRemover(), getAmostrasFolder(), getSourceFolder(), getThumbnailsFolder(), listarArquivosDoEvento() (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (20): CartSummary(), fmt(), money(), PhotoCard(), useCarrinhoContext(), useCarrinho(), usePollingStatus(), Header() (+12 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (11): MobileHome(), MobileRoutes(), MobileSearch(), routeNameFromLocation(), useEventos(), useEventosCatalog(), shadeColor(), galleryToken() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (8): CarrinhoProvider(), detectPlatform(), getPlatformSnapshot(), isMobileExperience(), subscribePlatform(), App(), advanceToStep2(), renderCheckout()

### Community 9 - "Community 9"
Cohesion: 0.36
Nodes (13): addSearchBox(), addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (10): getSecret(), hashCode(), issueGalleryToken(), tokenAllowsEvent(), verifyCode(), base64urlDecode(), base64urlEncode(), signToken() (+2 more)

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (6): categoryLabel(), MobileEvent(), EventPage(), eventToken(), SearchCard(), SearchPage()

### Community 12 - "Community 12"
Cohesion: 0.44
Nodes (10): a(), B(), c(), D(), g(), i(), k(), o() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (9): cotarCheckout(), criarPagamento(), listarEventos(), listarFotos(), listarFotosEvento(), obterEvento(), request(), statusPagamento() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (4): dateLabel(), scheduleLabel(), EventCard(), EventCard()

### Community 15 - "Community 15"
Cohesion: 0.31
Nodes (4): client(), consultarPagamento(), criarPreferencia(), paymentMethods()

### Community 16 - "Community 16"
Cohesion: 0.31
Nodes (6): EventRoute(), useEventGallery(), hasDevtoolsLikeViewportGap(), nextGuardCounters(), useDevtoolsGuard(), GuardProbe()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (7): createAuth(), downloadFile(), downloadFileAsJpeg(), getAccessToken(), parsePrivateKey(), updateFile(), uploadFile()

### Community 18 - "Community 18"
Cohesion: 0.52
Nodes (6): buildSpacedTile(), buildWatermarkTile(), compositeWatermark(), detectWatermarkType(), deterministicOffset(), structuralOverlay()

### Community 20 - "Community 20"
Cohesion: 0.73
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CarrinhoProvider()` connect `Community 8` to `Community 6`, `Community 7`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 8` to `Community 3`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `useCarrinho()` (e.g. with `CartSummary()` and `PhotoCard()`) actually correct?**
  _`useCarrinho()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useTranslation()` (e.g. with `AppContent()` and `Calculator()`) actually correct?**
  _`useTranslation()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `processarEventos()` (e.g. with `sincronizarConfiguracoesAdministrativas()` and `listarEventosNovos()`) actually correct?**
  _`processarEventos()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `rows()` (e.g. with `listarEventos()` and `buscarFotosParaCompra()`) actually correct?**
  _`rows()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._