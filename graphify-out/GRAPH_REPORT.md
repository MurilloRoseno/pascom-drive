# Graph Report - Drive  (2026-05-27)

## Corpus Check
- 112 files · ~934,123 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 555 nodes · 874 edges · 100 communities (99 shown, 1 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39cf8d3f`
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
- [[_COMMUNITY_Community 20|Community 20]]

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
10. `getSheet()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `post()` --calls--> `request()`  [INFERRED]
  backend/__tests__/webhook.test.js → frontend/src/lib/api.js
- `listarRegrasPagamento()` --calls--> `rows()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/google-sheets.shared.js
- `criarDownloadsDoPedido()` --calls--> `buscarOriginaisPedido()`  [INFERRED]
  backend/lib/delivery.js → backend/lib/google-sheets.js
- `listarEventos()` --calls--> `rows()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/google-sheets.shared.js
- `listarFotosEvento()` --calls--> `readThrough()`  [INFERRED]
  backend/lib/google-sheets.catalog.js → backend/lib/runtime-cache.js

## Communities (100 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (37): EventRoute(), MobileHome(), MobileRoutes(), MobileSearch(), routeNameFromLocation(), useEventGallery(), useEventos(), useEventosCatalog() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (26): Gallery(), categoryLabel(), useFotos(), usePollingStatus(), cotarCheckout(), criarPagamento(), listarEventos(), listarFotos() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (46): alternarVisibilidadeSelecionada(), aplicarValidacaoLista(), aplicarValidacoesAdministrativas(), appendMappedRow(), arquivarEventoSelecionado(), atualizarCelula(), atualizarDerivadosFoto(), atualizarDisponibilidadeFotos() (+38 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (24): Calculator(), Didactic(), Faq(), Hero(), useCalculator(), useSimulation(), LanguageProvider(), useTranslation() (+16 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (19): CartSummary(), fmt(), money(), PhotoCard(), CarrinhoProvider(), useCarrinhoContext(), useCarrinho(), Header() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (26): createTransporter(), criarDownloadsDoPedido(), enviarEmailEntrega(), smtpConfigured(), criarAutorizacoesDownload(), atualizarPedidoPagamento(), buscarOriginaisPedido(), buscarPedidoById() (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (29): atualizarPedidoPagamento(), atualizarStatus(), buscarEvento(), buscarFotosParaCompra(), buscarOriginaisPedido(), buscarPedidoById(), buscarPedidoByPreferenceOrPayment(), catalogoPublicado() (+21 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): entregarFotos(), processarEventos(), processarFotosNovas(), verificarEventosProntosParaRemover(), getAmostrasFolder(), getSourceFolder(), getThumbnailsFolder(), listarArquivosDoEvento() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (14): buscarPreviewFoto(), buscarEvento(), buscarFotosParaCompra(), buscarPreviewFoto(), catalogoPublicado(), listarEventos(), listarEventosPublicados(), listarFotosEvento() (+6 more)

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
Cohesion: 0.35
Nodes (9): ehArquivoCapa(), gerarIdFoto(), gerarNomeAmostra(), notificarErroProcessamento(), _preprocessarArquivo(), processarFoto(), reprocessarMiniaturasEmLote(), salvarDerivado() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.31
Nodes (4): client(), consultarPagamento(), criarPreferencia(), paymentMethods()

### Community 14 - "Community 14"
Cohesion: 0.36
Nodes (5): detectPlatform(), getPlatformSnapshot(), isMobileExperience(), subscribePlatform(), App()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (7): createAuth(), downloadFile(), downloadFileAsJpeg(), getAccessToken(), parsePrivateKey(), updateFile(), uploadFile()

### Community 16 - "Community 16"
Cohesion: 0.73
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 17 - "Community 17"
Cohesion: 0.7
Nodes (4): buildSpacedTile(), buildWatermarkTile(), compositeWatermark(), detectWatermarkType()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CarrinhoProvider()` connect `Community 4` to `Community 0`, `Community 14`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 14` to `Community 3`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
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