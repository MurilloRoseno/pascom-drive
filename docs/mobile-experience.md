# Experiência Mobile Dedicada

## Objetivo

O frontend agora possui duas experiências separadas:

- **Desktop:** interface original preservada em `frontend/src/desktop/DesktopApp.jsx`.
- **Mobile/tablet:** interface dedicada em `frontend/src/mobile/MobileApp.jsx`, inspirada no protótipo `pascom-drive-mobile`.

A experiência mobile não é apenas responsividade. Ela tem navegação inferior, app bar, carrinho em sheet, grade de fotos touch-first, lightbox fullscreen e checkout em fluxo vertical.

## Estratégia de Detecção

A detecção ocorre em duas etapas:

1. `frontend/index.html` define `data-platform` antes do bundle React carregar.
2. `frontend/src/shared/platform.js` confirma a plataforma no runtime e escuta resize/orientation.

Critérios:

- user-agent de smartphone → `mobile`;
- user-agent de tablet → `tablet`;
- ponteiro coarse entre `600px` e `1024px` → `tablet`;
- viewport menor que `768px` → `mobile`;
- demais casos → `desktop`.

`mobile` e `tablet` usam a experiência mobile.

## Roteamento e Code Splitting

`frontend/src/App.jsx` usa `React.lazy`:

- `./desktop/DesktopApp.jsx`
- `./mobile/MobileApp.jsx`

Isso evita carregar a árvore React desktop no primeiro bundle mobile e mantém a experiência desktop isolada. Os CSS específicos também são importados dentro de cada experiência.

## Organização

```text
frontend/src/
├─ desktop/
│  └─ DesktopApp.jsx
├─ mobile/
│  ├─ MobileApp.jsx
│  ├─ mobile.css
│  └─ mobile-overlays.css
└─ shared/
   ├─ gallery.js
   └─ platform.js
```

## Código Compartilhado

A versão mobile reutiliza:

- `CarrinhoProvider` e `useCarrinho`;
- APIs de `frontend/src/lib/api.js`;
- validação `checkoutSchema`;
- `categories`, `categoryLabel`, `dateLabel` e `scheduleLabel`;
- tokens de galeria por `sessionStorage` via `shared/gallery.js`.

## Fluxo Mobile

```text
index.html detecta plataforma
  -> App escolhe MobileApp
  -> MobileApp monta BrowserRouter + CarrinhoProvider
  -> Home/Search/Event/Checkout usam APIs reais
  -> Carrinho aparece como floating bar e bottom sheet
  -> Checkout redireciona para Mercado Pago
```

## UX Mobile

- App bar sticky com voltar e carrinho.
- Bottom navigation com áreas principais.
- Hero compacto e busca grande para toque.
- Chips horizontais para categorias.
- Cards com imagem quadrada e texto curto.
- Grade de fotos 3 colunas.
- Lightbox fullscreen.
- Checkout em blocos verticais.
- Respeito a safe-area em iOS.

## Performance

- Separação por lazy loading reduz JS inicial por plataforma.
- Imagens usam `loading="lazy"` quando listadas.
- CSS mobile é escopado em classes `m-*`.
- Mobile evita importar componentes desktop.
- Carrinho e checkout reutilizam estado global existente.

## Riscos e Limitações

- A detecção por user-agent nunca é perfeita; viewport atua como fallback.
- Troca de tamanho em desktop pode alternar experiência se cruzar o breakpoint.
- A versão mobile ainda compartilha algumas APIs com contratos pensados inicialmente para desktop.
- Não há virtualização de listas; se eventos/fotos crescerem muito, será necessário otimizar.

## Manutenção Futura

- Novas regras de negócio devem ir para `shared/` ou `lib/`, não duplicadas em mobile/desktop.
- Componentes visuais exclusivos devem ficar em `mobile/` ou `desktop/`.
- Alterações de rota precisam ser refletidas nas duas experiências.
- Testes de plataforma ficam em `frontend/src/__tests__/platform.test.js`.
