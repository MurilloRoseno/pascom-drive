# Graph Report - Drive  (2026-05-28)

## Corpus Check
- 115 files · ~939,591 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 582 nodes · 909 edges · 99 communities (98 shown, 1 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d1c23e5f`
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 19|Community 19]]

## God Nodes (most connected - your core abstractions)
1. `useCarrinho()` - 23 edges
2. `useTranslation()` - 17 edges
3. `processarEventos()` - 15 edges
4. `setField()` - 15 edges
5. `getEventoSelecionado()` - 13 edges
6. `rows()` - 11 edges
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

## Communities (99 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (30): Gallery(), categoryLabel(), useFotos(), usePollingStatus(), cotarCheckout(), criarPagamento(), listarEventos(), listarFotos() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (29): CartSummary(), fmt(), money(), PhotoCard(), useCarrinhoContext(), useCarrinho(), Header(), calcularTaxa() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (26): CarrinhoScreen(), CartBar(), CartSummary(), CheckoutScreen(), FotoLightboxScreen(), GaleriaFotosScreen(), PaymentReturnScreen(), CalendarioScreen() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (46): alternarVisibilidadeSelecionada(), aplicarValidacaoLista(), aplicarValidacoesAdministrativas(), appendMappedRow(), arquivarEventoSelecionado(), atualizarCelula(), atualizarDerivadosFoto(), atualizarDisponibilidadeFotos() (+38 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (24): Calculator(), Didactic(), Faq(), Hero(), useCalculator(), useSimulation(), LanguageProvider(), useTranslation() (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (34): buscarPreviewFoto(), buscarEvento(), buscarFotosParaCompra(), buscarPreviewFoto(), catalogoPublicado(), listarEventos(), listarEventosPublicados(), listarFotosEvento() (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (35): createTransporter(), criarDownloadsDoPedido(), enviarEmailEntrega(), smtpConfigured(), atualizarPedidoPagamento(), atualizarStatus(), buscarEvento(), buscarFotosParaCompra() (+27 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (27): entregarFotos(), processarEventos(), processarFotosNovas(), verificarEventosProntosParaRemover(), getAmostrasFolder(), getSourceFolder(), getThumbnailsFolder(), listarArquivosDoEvento() (+19 more)

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
Cohesion: 0.44
Nodes (10): a(), B(), c(), D(), g(), i(), k(), o() (+2 more)

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (4): client(), consultarPagamento(), criarPreferencia(), paymentMethods()

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (7): createAuth(), downloadFile(), downloadFileAsJpeg(), getAccessToken(), parsePrivateKey(), updateFile(), uploadFile()

### Community 15 - "Community 15"
Cohesion: 0.73
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 16 - "Community 16"
Cohesion: 0.7
Nodes (4): buildSpacedTile(), buildWatermarkTile(), compositeWatermark(), detectWatermarkType()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CarrinhoProvider()` connect `Community 8` to `Community 1`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 8` to `Community 4`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `useCarrinho()` (e.g. with `CartSummary()` and `PhotoCard()`) actually correct?**
  _`useCarrinho()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `useTranslation()` (e.g. with `AppContent()` and `Calculator()`) actually correct?**
  _`useTranslation()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `processarEventos()` (e.g. with `sincronizarConfiguracoesAdministrativas()` and `listarEventosNovos()`) actually correct?**
  _`processarEventos()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._