# Graph Report - Drive  (2026-05-08)

## Corpus Check
- 77 files · ~763,700 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 185 nodes · 222 edges · 56 communities (55 shown, 1 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d6b69645`
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
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `useCarrinho()` - 14 edges
2. `g()` - 6 edges
3. `getNthColumn()` - 6 edges
4. `enableUI()` - 6 edges
5. `makeCurrent()` - 5 edges
6. `Q()` - 5 edges
7. `D()` - 5 edges
8. `y()` - 5 edges
9. `getTableHeader()` - 5 edges
10. `CarrinhoProvider()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `PhotoCard()` --calls--> `useCarrinho()`  [INFERRED]
  frontend/src/components/PhotoCard.jsx → frontend/src/hooks/useCarrinho.js
- `Header()` --calls--> `useCarrinho()`  [INFERRED]
  frontend/src/components/layout/Header.jsx → frontend/src/hooks/useCarrinho.js
- `CheckoutPage()` --calls--> `useCarrinho()`  [INFERRED]
  frontend/src/pages/Checkout.jsx → frontend/src/hooks/useCarrinho.js
- `TestComponent()` --calls--> `useCarrinho()`  [INFERRED]
  frontend/src/__tests__/CarrinhoContext.test.jsx → frontend/src/hooks/useCarrinho.js
- `entregarFotos()` --calls--> `processarEntregas()`  [INFERRED]
  google-apps-script/Code.js → google-apps-script/WhatsApp.js

## Communities (56 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (11): CartSummary(), fmt(), PhotoCard(), useCarrinhoContext(), useCarrinho(), Header(), calcularTaxa(), calcularTotais() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.36
Nodes (13): addSearchBox(), addSortIndicators(), enableUI(), getNthColumn(), getTable(), getTableBody(), getTableHeader(), loadColumns() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.16
Nodes (7): entregarFotos(), processarFotosNovas(), getSourceFolder(), listNewFiles(), gerarIdFoto(), gerarNomeAmostra(), processarFoto()

### Community 3 - "Community 3"
Cohesion: 0.44
Nodes (10): a(), B(), c(), D(), g(), i(), k(), o() (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (7): usePollingStatus(), criarPagamento(), listarFotos(), _request(), statusPagamento(), CheckoutPage(), fmt()

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (3): CarrinhoProvider(), advanceToStep2(), renderCheckout()

### Community 6 - "Community 6"
Cohesion: 0.38
Nodes (8): atualizarCelula(), getSheet(), incrementarTentativas(), listarPagamentosConfirmados(), registrarFoto(), gerarLinkWaMe(), processarEntregas(), tentarEntrega()

### Community 7 - "Community 7"
Cohesion: 0.73
Nodes (4): goToNext(), goToPrevious(), makeCurrent(), toggleClass()

### Community 8 - "Community 8"
Cohesion: 0.67
Nodes (5): createAuth(), downloadFile(), getAccessToken(), parsePrivateKey(), uploadFile()

### Community 9 - "Community 9"
Cohesion: 0.53
Nodes (4): atualizarStatus(), getSheet(), listarFotos(), registrarPedido()

### Community 13 - "Community 13"
Cohesion: 0.83
Nodes (3): buildSpacedTile(), buildWatermarkTile(), compositeWatermark()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCarrinho()` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `CarrinhoProvider()` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `useCarrinho()` (e.g. with `CartSummary()` and `PhotoCard()`) actually correct?**
  _`useCarrinho()` has 7 INFERRED edges - model-reasoned connections that need verification._