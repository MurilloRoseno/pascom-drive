# Frontend Redesign — App Contextual de Venda de Fotos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar todas as telas do frontend para um app de venda de fotos focado em mobile, removendo ornamentos litúrgicos e navegação falsa que estão fora de contexto do produto.

**Architecture:** Mudanças puramente visuais/estruturais em JSX e CSS — zero alterações em hooks, context, api.js, validação Zod ou lógica de pagamento. O CartSummary passa a ser uma barra sticky no rodapé da tela (como apps de e-commerce) em vez de um card abaixo da grade. O Header vira um app bar simples com contador de carrinho. O Footer vira uma linha mínima de copyright.

**Tech Stack:** React 18, Vite, Tailwind CSS, CSS custom properties (`--photo-*`), React Router v6

---

## ⚠️ Limites rígidos — não tocar

| Arquivo | Motivo |
|---------|--------|
| `frontend/src/lib/api.js` | Integração backend Phase 4 |
| `frontend/src/context/CarrinhoContext.jsx` | Estado global do carrinho |
| `frontend/src/hooks/useFotos.js` | Fetch galeria |
| `frontend/src/hooks/useCarrinho.js` | Interface do carrinho |
| `frontend/src/hooks/usePollingStatus.js` | Polling de pagamento PIX |
| `frontend/src/lib/validation.js` | Zod schemas |
| `frontend/src/lib/calculations.js` | Cálculo de taxas |
| `vercel.json`, `backend/**`, `google-apps-script/**` | Fora de escopo |

---

## Mapa de arquivos

| Arquivo | Mudança |
|---------|---------|
| `frontend/src/components/layout/Header.jsx` | App bar simples com contador de carrinho; remover nav links falsos |
| `frontend/src/components/CartSummary.jsx` | Barra sticky no rodapé em vez de card |
| `frontend/src/pages/Gallery.jsx` | Remover section header ornamentado; adicionar padding-bottom para a barra sticky |
| `frontend/src/components/Gallery.jsx` | Manter grid; remover `CartSummary` embutido (agora está no App) |
| `frontend/src/components/FilterEvent.jsx` | Scrollable horizontal no mobile; pills mais claros |
| `frontend/src/components/PhotoCard.jsx` | Área de toque mínima 44px; badge de seleção mais legível |
| `frontend/src/pages/Checkout.jsx` | Header simples com "← Voltar"; remover h1 Playfair e divider-ornament |
| `frontend/src/components/layout/Footer.jsx` | Reduzir para linha única de copyright |
| `frontend/src/App.jsx` | Mover `<CartSummary />` para fora das pages, dentro do layout global |
| `frontend/src/index.css` | Adicionar `.app-bar`, `.cart-bar`, `.photo-chip`; manter tokens existentes |

---

## Task 1 — Header: app bar com carrinho

**Contexto:** O Header atual tem links de navegação (Galeria, Sobre, Contato) para rotas que não existem no `App.jsx`. O projeto tem apenas `/` e `/checkout`. Transformar em app bar simples: logo + nome + ícone de carrinho com badge.

**Arquivos:**
- Modify: `frontend/src/components/layout/Header.jsx`
- Modify: `frontend/src/index.css` (classe `.cart-badge`)

- [ ] **Step 1: Escrever o teste de ausência dos links falsos**

Arquivo: `frontend/src/__tests__/Header.test.jsx` (criar)

```jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CarrinhoProvider } from '../context/CarrinhoContext';
import Header from '../components/layout/Header';

function wrap(ui) {
  return render(
    <BrowserRouter>
      <CarrinhoProvider>{ui}</CarrinhoProvider>
    </BrowserRouter>
  );
}

test('não renderiza links de navegação para páginas inexistentes', () => {
  wrap(<Header />);
  expect(screen.queryByText(/galeria/i)).toBeNull();
  expect(screen.queryByText(/sobre/i)).toBeNull();
  expect(screen.queryByText(/contato/i)).toBeNull();
});

test('renderiza nome da paróquia', () => {
  wrap(<Header />);
  expect(screen.getByText(/Paróquia São Rafael/i)).toBeInTheDocument();
});

test('mostra ícone de carrinho', () => {
  wrap(<Header />);
  expect(screen.getByRole('link', { name: /carrinho/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd frontend && npx jest Header.test --no-coverage
```

Esperado: FAIL — `Header.test.jsx` não existe ainda / links existem

- [ ] **Step 3: Reescrever `Header.jsx`**

```jsx
import { useCarrinho } from '../../hooks/useCarrinho.js';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { fotos } = useCarrinho();
  const navigate = useNavigate();
  const count = fotos.length;

  return (
    <header
      className="sticky top-0 z-50 shadow-md"
      style={{ background: 'var(--photo-primary-dark)' }}
    >
      <div className="container flex items-center justify-between py-3">

        {/* Brand */}
        <a href="/" className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
          <img
            src="/assets/logo-header.png"
            alt="Paróquia São Rafael"
            className="h-10 w-auto"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="hidden sm:block">
            <div
              className="font-display text-sm font-semibold leading-tight"
              style={{ color: 'var(--photo-bone)' }}
            >
              Paróquia São Rafael
            </div>
            <div
              className="font-mono text-[0.5rem] tracking-widest uppercase"
              style={{ color: 'var(--photo-accent)' }}
            >
              Açailândia · MA
            </div>
          </div>
        </a>

        {/* Cart button */}
        <button
          aria-label={`Carrinho, ${count} item${count !== 1 ? 's' : ''}`}
          onClick={() => count > 0 && navigate('/checkout')}
          className="relative p-2 rounded-lg transition-colors"
          style={{
            color: count > 0 ? 'var(--photo-accent)' : 'rgba(244,237,224,0.5)',
            cursor: count > 0 ? 'pointer' : 'default',
          }}
        >
          {/* Cart icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6h11M10 19a1 1 0 100 2 1 1 0 000-2zm7 0a1 1 0 100 2 1 1 0 000-2z"
            />
          </svg>

          {/* Badge */}
          {count > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[0.6rem]"
              style={{
                background: 'var(--photo-accent)',
                color: 'var(--photo-primary-dark)',
              }}
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

      </div>
    </header>
  );
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

```bash
cd frontend && npx jest Header.test --no-coverage
```

Esperado: PASS (3 testes)

- [ ] **Step 5: Confirmar suite completa passa**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: 49+ testes passando (nenhum quebrado)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/Header.jsx frontend/src/__tests__/Header.test.jsx
git commit -m "refactor(header): simplificar para app bar com carrinho, remover nav links falsos"
```

---

## Task 2 — CartSummary: barra sticky no rodapé

**Contexto:** O CartSummary atual é um `<div class="card sticky bottom-4">` dentro da page de galeria — no mobile o usuário tem que rolar até o fim da grade para vê-lo. Em apps de e-commerce (iFood, Shopee), o carrinho fica fixado na parte de baixo da viewport. Transformar em `position: fixed; bottom: 0`.

**Arquivos:**
- Modify: `frontend/src/components/CartSummary.jsx`
- Modify: `frontend/src/pages/Gallery.jsx` (adicionar padding-bottom)

- [ ] **Step 1: Atualizar teste existente do CartSummary**

Arquivo: `frontend/src/__tests__/CarrinhoContext.test.jsx` (checar se testa CartSummary render — se não, criar teste separado)

Criar `frontend/src/__tests__/CartSummary.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CarrinhoContext } from '../context/CarrinhoContext';
import CartSummary from '../components/CartSummary';

const mockCarrinho = (fotos) => ({
  fotos,
  totais: {
    subtotal: fotos.reduce((s, f) => s + f.price, 0),
    taxa: 0.5,
    total: fotos.reduce((s, f) => s + f.price, 0) + 0.5,
  },
  addFoto: jest.fn(),
  removeFoto: jest.fn(),
  clearCarrinho: jest.fn(),
  isSelected: jest.fn(() => false),
});

function wrap(fotos) {
  return render(
    <BrowserRouter>
      <CarrinhoContext.Provider value={mockCarrinho(fotos)}>
        <CartSummary />
      </CarrinhoContext.Provider>
    </BrowserRouter>
  );
}

test('não renderiza quando carrinho está vazio', () => {
  const { container } = wrap([]);
  expect(container.firstChild).toBeNull();
});

test('renderiza barra quando há fotos no carrinho', () => {
  wrap([{ id: '1', event: 'Missa', url: '/img.jpg', price: 15 }]);
  expect(screen.getByText(/1 foto selecionada/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument();
});

test('mostra contagem plural corretamente', () => {
  wrap([
    { id: '1', event: 'Missa', url: '/img.jpg', price: 15 },
    { id: '2', event: 'Missa', url: '/img2.jpg', price: 15 },
  ]);
  expect(screen.getByText(/2 fotos selecionadas/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar testes para confirmar que o novo arquivo falha**

```bash
cd frontend && npx jest CartSummary.test --no-coverage
```

Esperado: FAIL

- [ ] **Step 3: Reescrever `CartSummary.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function CartSummary() {
  const { fotos, totais } = useCarrinho();
  const navigate = useNavigate();

  if (fotos.length === 0) return null;

  const plural = fotos.length > 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 shadow-2xl"
      style={{
        background: '#fff',
        borderTop: '2px solid var(--photo-accent)',
      }}
    >
      <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p
            className="text-sm font-medium leading-tight"
            style={{ color: 'var(--photo-grafite)' }}
          >
            {fotos.length} foto{plural ? 's' : ''} selecionada{plural ? 's' : ''}
          </p>
          <p
            className="font-mono font-bold text-lg leading-tight"
            style={{ color: 'var(--photo-primary)' }}
          >
            {fmt(totais.total)}
          </p>
        </div>

        <button
          onClick={() => navigate('/checkout')}
          className="btn btn-primary btn-lg flex-shrink-0"
        >
          Finalizar →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Rodar testes**

```bash
cd frontend && npx jest CartSummary.test --no-coverage
```

Esperado: PASS (3 testes)

- [ ] **Step 5: Confirmar suite completa**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos passando

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/CartSummary.jsx frontend/src/__tests__/CartSummary.test.jsx
git commit -m "refactor(cart): converter CartSummary para barra sticky no rodapé"
```

---

## Task 3 — App.jsx: mover CartSummary para layout global

**Contexto:** O `<CartSummary />` precisa ficar fixo na tela em todas as rotas. Atualmente estava dentro de `pages/Gallery.jsx`. Mover para `App.jsx` (fora das `<Routes>`). Remover de `Gallery.jsx`.

**Arquivos:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/Gallery.jsx`

- [ ] **Step 1: Atualizar `App.jsx` para incluir CartSummary globalmente**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CarrinhoProvider } from './context/CarrinhoContext.jsx';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import CartSummary from './components/CartSummary.jsx';
import GalleryPage from './pages/Gallery.jsx';
import CheckoutPage from './pages/Checkout.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <CarrinhoProvider>
        <div className="min-h-screen flex flex-col bg-photo-paper">
          <Header />
          <div className="flex-1 pb-20">
            <Routes>
              <Route path="/" element={<GalleryPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Routes>
          </div>
          <Footer />
          <CartSummary />
        </div>
      </CarrinhoProvider>
    </BrowserRouter>
  );
}
```

> Nota: `pb-20` garante que a barra sticky não sobrepõe o conteúdo final da página.

- [ ] **Step 2: Remover `<CartSummary />` de `pages/Gallery.jsx`**

Arquivo atual `pages/Gallery.jsx` (linhas 28–32):

```jsx
// ANTES:
import CartSummary from '../components/CartSummary.jsx';
// ...
<div className="mt-10">
  <CartSummary />
</div>
```

Substituir pelo arquivo completo sem CartSummary:

```jsx
import Gallery from '../components/Gallery.jsx';

const ORNAMENT_STAR = (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 20, height: 20, flexShrink: 0 }}>
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

export default function GalleryPage() {
  return (
    <main className="bg-photo-paper min-h-screen">
      <section className="py-6 md:py-10">
        <div className="container">
          <Gallery />
        </div>
      </section>
    </main>
  );
}
```

> Note: o section header ornamentado foi removido. Veja Task 4 para o novo cabeçalho da galeria.

- [ ] **Step 3: Rodar suite completa**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos passando

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/Gallery.jsx
git commit -m "refactor(app): mover CartSummary para layout global, remover seção header ornamentada da galeria"
```

---

## Task 4 — Gallery.jsx: cabeçalho funcional + filtros scrolláveis

**Contexto:** A galeria precisa de um cabeçalho simples e focado no produto. O nome do evento selecionado (ou "Fotos do Evento") deve aparecer como título leve. Os filtros de evento precisam ser scrolláveis horizontalmente no mobile para não quebrar em múltiplas linhas.

**Arquivos:**
- Modify: `frontend/src/components/Gallery.jsx`
- Modify: `frontend/src/components/FilterEvent.jsx`

- [ ] **Step 1: Atualizar `Gallery.jsx` com cabeçalho contextual**

```jsx
import { useState } from 'react';
import PhotoCard from './PhotoCard.jsx';
import FilterEvent from './FilterEvent.jsx';
import { useFotos } from '../hooks/useFotos.js';

function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-[2/3]" style={{ background: 'var(--photo-bone)' }} />
    </div>
  );
}

export default function Gallery() {
  const [eventoSelecionado, setEventoSelecionado] = useState(null);
  const { fotos, isLoading, error, eventos } = useFotos(eventoSelecionado);

  if (isLoading) {
    return (
      <div>
        <div className="mb-4 h-7 w-48 rounded animate-pulse" style={{ background: 'var(--photo-bone)' }} />
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[1,2,3].map(i => (
            <div key={i} className="h-8 w-24 flex-shrink-0 rounded-full animate-pulse" style={{ background: 'var(--photo-bone)' }} />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg p-6 text-center"
        style={{
          background: 'var(--photo-primary-light)',
          border: '1px solid var(--photo-primary)',
        }}
      >
        <p className="font-medium mb-1" style={{ color: 'var(--photo-primary)' }}>
          Erro ao carregar fotos
        </p>
        <p className="text-sm" style={{ color: 'var(--photo-grafite)' }}>{error}</p>
      </div>
    );
  }

  const titulo = eventoSelecionado || 'Fotos do Evento';

  return (
    <div>
      {/* Título do evento */}
      <h1
        className="font-display font-bold text-xl md:text-2xl mb-4"
        style={{ color: 'var(--photo-ink)' }}
      >
        {titulo}
      </h1>

      {/* Filtros de evento — scroll horizontal no mobile */}
      <FilterEvent
        eventos={eventos}
        eventoSelecionado={eventoSelecionado}
        onSelect={setEventoSelecionado}
      />

      {/* Grid de fotos */}
      {fotos.length === 0 ? (
        <p className="text-center py-16 text-sm" style={{ color: 'var(--photo-sepia)' }}>
          Nenhuma foto encontrada para este evento.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {fotos.map(foto => <PhotoCard key={foto.id} foto={foto} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Atualizar `FilterEvent.jsx` com chips scrolláveis**

```jsx
import PropTypes from 'prop-types';

export default function FilterEvent({ eventos, eventoSelecionado, onSelect }) {
  return (
    <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
      <button
        onClick={() => onSelect(null)}
        className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
        style={
          !eventoSelecionado
            ? {
                background: 'var(--photo-primary)',
                color: '#fff',
                border: '1.5px solid var(--photo-primary)',
              }
            : {
                background: 'transparent',
                color: 'var(--photo-primary)',
                border: '1.5px solid rgba(109,32,119,0.35)',
              }
        }
      >
        Todos
      </button>

      {eventos.map(evento => (
        <button
          key={evento}
          onClick={() => onSelect(evento)}
          className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
          style={
            eventoSelecionado === evento
              ? {
                  background: 'var(--photo-primary)',
                  color: '#fff',
                  border: '1.5px solid var(--photo-primary)',
                }
              : {
                  background: 'transparent',
                  color: 'var(--photo-primary)',
                  border: '1.5px solid rgba(109,32,119,0.35)',
                }
          }
        >
          {evento}
        </button>
      ))}
    </div>
  );
}

FilterEvent.propTypes = {
  eventos: PropTypes.arrayOf(PropTypes.string).isRequired,
  eventoSelecionado: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};
```

- [ ] **Step 3: Rodar suite completa**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos passando

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Gallery.jsx frontend/src/components/FilterEvent.jsx
git commit -m "refactor(gallery): título contextual do evento, filtros scrolláveis no mobile"
```

---

## Task 5 — PhotoCard: área de toque e legibilidade

**Contexto:** Em mobile, os cards precisam de toque fácil e indicação clara de seleção. O badge "Selecionado" atual usa fonte muito pequena e o checkmark é difícil de ver. Simplificar: overlay de seleção com tint + checkmark grande.

**Arquivos:**
- Modify: `frontend/src/components/PhotoCard.jsx`

- [ ] **Step 1: Verificar o teste existente de PhotoCard**

```bash
cd frontend && npx jest -- --testPathPattern=CarrinhoContext --no-coverage
```

Verificar que testa seleção/deseleção de fotos (estado no contexto)

- [ ] **Step 2: Reescrever `PhotoCard.jsx`**

```jsx
import PropTypes from 'prop-types';
import { useCarrinho } from '../hooks/useCarrinho.js';

export default function PhotoCard({ foto }) {
  const { isSelected, addFoto, removeFoto } = useCarrinho();
  const selected = isSelected(foto.id);

  const toggle = () => selected ? removeFoto(foto.id) : addFoto(foto);

  return (
    <div
      onClick={toggle}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && toggle()}
      className="relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 select-none"
      style={selected ? { boxShadow: '0 0 0 3px var(--photo-accent), 0 4px 12px rgba(0,0,0,0.2)' } : {}}
    >
      {/* Foto */}
      <img
        src={foto.url}
        alt={foto.event}
        className="w-full aspect-[2/3] object-cover block"
        loading="lazy"
      />

      {/* Overlay de seleção */}
      {selected && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(109,32,119,0.35)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--photo-accent)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
              style={{ color: 'var(--photo-primary-dark)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Preço — sempre visível */}
      <div
        className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }}
      >
        <span
          className="font-mono font-bold text-xs"
          style={{ color: '#fff' }}
        >
          R$ {foto.price.toFixed(2).replace('.', ',')}
        </span>
      </div>
    </div>
  );
}

PhotoCard.propTypes = {
  foto: PropTypes.shape({
    id: PropTypes.string.isRequired,
    event: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
  }).isRequired,
};
```

- [ ] **Step 3: Rodar suite completa**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos passando

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/PhotoCard.jsx
git commit -m "refactor(photo-card): overlay de seleção claro, preço sempre visível, lazy loading"
```

---

## Task 6 — Checkout: header de app simples

**Contexto:** A página de checkout tem um `section header` ornamentado com eyebrow, `h1` Playfair Display e `divider-ornament`. Para uma tela de pagamento isso é distração. Substituir por um header funcional: "← Voltar" + título "Pagamento". Manter toda a lógica de steps, WhatsApp, PIX e polling intacta.

**Arquivos:**
- Modify: `frontend/src/pages/Checkout.jsx`

- [ ] **Step 1: Confirmar que testes existentes de Checkout estão passando antes de tocar**

```bash
cd frontend && npx jest Checkout.test --no-coverage
```

Esperado: todos os testes de Checkout passando

- [ ] **Step 2: Substituir apenas o bloco de section header no JSX do Checkout**

No arquivo `frontend/src/pages/Checkout.jsx`, substituir o bloco:

```jsx
// ANTES (linhas ~79–89):
<section className="py-12" style={{ background: 'var(--photo-paper)', minHeight: '100vh' }}>
  <div className="container">
    <div className="text-center mb-10">
      <div className="eyebrow">Checkout</div>
      <h1 className="font-display text-4xl mt-2" style={{ color: 'var(--photo-primary)' }}>
        Finalizar Pedido
      </h1>
      <div className="divider-ornament" style={{ maxWidth: 280, margin: '1rem auto' }}>
        {ORNAMENT_STAR}
      </div>
    </div>
```

Por:

```jsx
// DEPOIS:
<section className="py-6" style={{ background: 'var(--photo-paper)', minHeight: '100vh' }}>
  <div className="container">
    {/* Header funcional */}
    <div className="flex items-center gap-3 mb-8">
      <button
        onClick={() => navigate('/')}
        className="p-2 rounded-lg transition-colors"
        style={{ color: 'var(--photo-primary)', background: 'var(--photo-primary-light)' }}
        aria-label="Voltar para galeria"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 className="font-display font-bold text-xl" style={{ color: 'var(--photo-ink)' }}>
        Pagamento
      </h1>
    </div>
```

> ⚠️ Remover também a const `ORNAMENT_STAR` no topo do arquivo (não usada mais).

- [ ] **Step 3: Rodar suite do Checkout para confirmar que testes passam**

```bash
cd frontend && npx jest Checkout.test --no-coverage
```

Esperado: todos passando

- [ ] **Step 4: Rodar suite completa**

```bash
cd frontend && npm test -- --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Checkout.jsx
git commit -m "refactor(checkout): substituir header ornamentado por app header funcional com botão voltar"
```

---

## Task 7 — Footer: linha única de copyright

**Contexto:** O footer atual tem 3 colunas com links falsos `href="#"` e páginas que não existem. Como o projeto é uma web app single-purpose (galeria + compra), não há necessidade de footer de site. Substituir por uma linha fina de copyright.

**Arquivos:**
- Modify: `frontend/src/components/layout/Footer.jsx`

- [ ] **Step 1: Reescrever `Footer.jsx`**

```jsx
export default function Footer() {
  return (
    <footer
      className="py-4 text-center text-xs"
      style={{
        background: 'var(--photo-primary-dark)',
        color: 'rgba(244,237,224,0.4)',
        borderTop: '1px solid rgba(244,237,224,0.08)',
      }}
    >
      © 2026 Paróquia São Rafael — Açailândia/MA
    </footer>
  );
}
```

- [ ] **Step 2: Rodar suite completa**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos passando

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Footer.jsx
git commit -m "refactor(footer): simplificar para linha de copyright; remover colunas com links falsos"
```

---

## Task 8 — Verificação final

**Contexto:** Confirmar que o redesign está coerente, funcional e sem regressões de integração.

- [ ] **Step 1: Build de produção**

```bash
cd frontend && npm run build
```

Esperado: sem erros de build

- [ ] **Step 2: Suite completa de testes**

```bash
cd frontend && npm test -- --no-coverage
```

Esperado: todos os testes passando (49+ tests)

- [ ] **Step 3: Smoke test manual — iniciar dev server**

```bash
cd frontend && npm run dev
```

Abrir `http://localhost:5173` e verificar:

| Check | Expected |
|-------|----------|
| Header | App bar escura com logo + carrinho (sem links de nav) |
| Header (carrinho vazio) | Ícone de carrinho cinza/transparente |
| Filtros | Pills horizontais scrolláveis |
| Galeria (loading) | Skeleton com `animate-pulse` |
| PhotoCard | Click seleciona, overlay roxo + checkmark amarelo |
| Header (com fotos) | Badge amarelo com contagem |
| CartSummary | Barra fixa no fundo com total + botão "Finalizar →" |
| Checkout (path `/checkout`) | Header com "← Voltar" + "Pagamento" |
| Checkout step 1 | Lista de fotos no card |
| Checkout step 2 | Input WhatsApp com placeholder "DDD + número (ex: 11999999999)" |
| Checkout step 3 | Resumo + "Gerar QR Pix" |
| Footer | Linha única copyright no fundo |
| Mobile (360px) | Header, grid 2-col, barra sticky, checkout all functional |

- [ ] **Step 4: Verificar que nenhum arquivo proibido foi alterado**

```bash
git diff HEAD~7 -- frontend/src/lib/api.js frontend/src/context/CarrinhoContext.jsx frontend/src/hooks/ frontend/src/lib/validation.js frontend/src/lib/calculations.js
```

Esperado: sem diff (0 linhas alteradas)

- [ ] **Step 5: Commit final de documentação**

```bash
git add -A
git commit -m "docs: atualizar plano de redesign contextual"
```

---

## Resumo das mudanças

| Componente | Antes | Depois |
|------------|-------|--------|
| **Header** | Nav com 4 links falsos + hamburger | App bar: logo + ícone carrinho com badge |
| **CartSummary** | Card abaixo da grade (fora da viewport mobile) | Barra fixed no bottom (sempre visível) |
| **Gallery page** | Section header Playfair + ornamento | Removido; título vem do evento selecionado |
| **Gallery component** | Título "Fotos do Evento" hardcoded com ornamento | `eventoSelecionado || 'Fotos do Evento'` como `<h1>` |
| **FilterEvent** | Flex wrap (quebra em mobile) | Overflow-x scroll, flex-shrink-0 por chip |
| **PhotoCard** | Badge "Selecionado" + checkmark pequeno | Overlay tint roxo + checkmark amarelo grande |
| **Checkout** | Eyebrow + h1 Playfair + divider-ornament | Botão "← Voltar" + h1 simples |
| **Footer** | 3 colunas com links `#` | Uma linha: copyright |

**Zero alterações em:** lógica de carrinho, fetch de fotos, criação de pagamento PIX, polling de status, validação Zod, `api.js`, `CarrinhoContext`, todos os hooks.
