# Pascom Drive — Design System Integrado

## 🎨 Paleta de Cores — Derivada para Foto Venda

| Uso | Cor | Hex | Notas |
|-----|-----|-----|-------|
| **Primary** | Roxo Magenta | `#8B3E7A` | CTA, headings, accents |
| **Primary Dark** | Roxo Deep | `#5C2650` | Hover, dark sections |
| **Accent** | Ouro Saturado | `#E8B923` | Buttons, highlights |
| **Accent Dark** | Ouro Deep | `#B8860B` | Hover states |
| **Success** | Teal | `#2B7A8E` | Status confirmado, badges |
| **Paper** | Warm Cream | `#F9F5F0` | Secondary backgrounds |
| **Ink** | Near-black | `#1A1410` | Primary text |

**Filosofia:** Roxo magenta + ouro saturado diferencia visualmente a seção de foto venda do site da paróquia, mas mantém coesão visual (cores "relacionadas" à marca).

---

## 📚 Estrutura de Pastas

```
frontend/
├── src/
│   ├── index.css                    # Global styles + design tokens
│   ├── colors_and_type.css          # Design system tokens (original)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx           # Navegação fixa
│   │   │   └── Footer.jsx           # Rodapé
│   │   └── common/
│   │       ├── icons.jsx            # Lucide icon system
│   │       └── kit.css              # Brand bridge styles
│   └── ... (pages, context, etc)
├── public/
│   └── assets/                      # Logos, fotos, ornaments
├── tailwind.config.js               # Config com paleta derivada
└── DESIGN_SYSTEM.md                 # Este arquivo
```

---

## 🎯 Como Usar

### 1. Classes Tailwind Padrão
Todos os tokens estão disponíveis como classes Tailwind:

```jsx
<div className="bg-photo-primary text-white p-6 rounded-lg shadow-md">
  <h2 className="h2">Fotos Disponíveis</h2>
</div>
```

### 2. Semântica de Cores
```jsx
// Buttons
<button className="btn btn-primary">Comprar Agora</button>
<button className="btn btn-secondary">Ver Mais</button>
<button className="btn btn-outline">Cancelar</button>

// Status badges
<span className="bg-photo-success text-white px-3 py-1 rounded-full text-sm">
  Confirmado
</span>
```

### 3. Tipografia — Classes Semânticas
```jsx
<h1 className="h1">Vendas de Fotos</h1>
<h2 className="h2">Próximos Eventos</h2>
<p className="body">Lorem ipsum dolor sit amet...</p>
<p className="caption">Data: 15 de maio de 2026</p>
<div className="eyebrow">PROMOÇÃO ESPECIAL</div>
```

### 4. Cards
```jsx
<div className="card">
  <img src="/assets/photo.jpg" alt="Foto" />
  <h3 className="h3">Festa de São Rafael</h3>
  <p className="body">R$ 150,00</p>
  <button className="btn btn-primary">Adicionar ao Carrinho</button>
</div>
```

### 5. Variáveis CSS (fallback)
```css
.custom-section {
  background: var(--photo-paper);
  color: var(--photo-ink);
  border: 1px solid var(--photo-primary-light);
  box-shadow: var(--shadow-md);
}
```

---

## 🔤 Tipografia

### Fonts
- **Display:** Playfair Display (serif, liturgical, headings)
- **Body:** Nunito (humanist sans, warmth, body copy)
- **Mono:** JetBrains Mono (eyebrows, labels, code)

### Ramp (tamanhos)
| Classe | Tamanho | Uso |
|--------|---------|-----|
| `.display` | 40–64px | Hero headlines |
| `.h1` | 30–40px | Seções principais |
| `.h2` | 24–32px | Subseções, títulos |
| `.h3` | 20px | Cards, small titles |
| `.h4` | 18px | Subtítulos |
| `.body` | 16px | Body copy (default) |
| `.body-sm` | 14px | Muted, secondary text |
| `.caption` | 12px | Meta, labels |
| `.eyebrow` | 12px | Uppercase mono labels |

---

## 🎨 Ornamentation

### Divider (seção)
```jsx
<div className="ornament-divider">
  {/* Linha automática com três pontos centralizados */}
</div>
```

### Corner Ornaments (hero cards, dark sections)
Coloque no `assets/ornament-corner.svg` a 20–40% opacity:
```jsx
<div className="relative">
  <img 
    src="/assets/ornament-corner.svg" 
    alt="" 
    className="absolute top-0 right-0 w-16 h-16 opacity-30"
  />
</div>
```

---

## ⚡ Quick Reference

### Cores Derivadas (copia direto em classes)
```
photo-primary          → #8B3E7A (roxo magenta)
photo-primary-dark     → #5C2650
photo-primary-light    → rgba(139, 62, 122, 0.08)
photo-accent           → #E8B923 (ouro saturado)
photo-accent-dark      → #B8860B
photo-success          → #2B7A8E (teal)
photo-paper            → #F9F5F0 (cream)
photo-ink              → #1A1410 (near-black)
```

### Shadows
```
shadow-sm   → subtle (borders, light dividers)
shadow-md   → default (cards at rest)
shadow-lg   → hover (cards elevated)
shadow-2xl  → hero card (floating widgets)
```

### Transitions
```
duration-fast   → 150ms (snappy)
duration-base   → 200ms (default)
duration-slow   → 300ms (header scroll)

ease-out        → energetic out
ease-in-out     → smooth both directions
```

---

## 📋 Design Principles (inherited from source)

1. **Warm & Reverent** — Tone is invitational, not aggressive
2. **No Emoji** — Text only, Lucide icons for visual
3. **No Gradients** — Solid colors only (except hero overlay)
4. **Soft Shadows** — Never harsh, never inner-shadow
5. **Accessibility** — Always ring-on-focus, legible text
6. **Responsive Typography** — `clamp()` for fluid scaling
7. **Transitions 200ms** — Fast but readable, no springs

---

## 🔗 Assets Included

```
assets/
├── logo-header.png              # Main logo
├── logo-full.png                # Full mark
├── logo-footer.png              # Footer variant
├── logo-white.png               # Inverted
├── favicon.svg                  # Browser tab
├── church-background.png        # Hero photo
├── ornament-corner.svg          # Decorative corner
├── ornament-divider.svg         # Section divider
├── icons.svg                    # Sprite (if used)
└── (user photos will go here)
```

---

## ✅ Checklist de Uso

- ✅ Tailwind config com paleta derivada
- ✅ Google Fonts carregadas dinamicamente
- ✅ Todas as classes CSS semânticas definidas
- ✅ Assets copiados e prontos
- ✅ Componentes base (Header, Footer, icons) trazidos
- ✅ Diferenciação visual clara (roxo magenta ≠ roxo paróquia)

---

## 📞 Referência Rápida

**Dúvida:** Como faço um botão secundário?
```jsx
<button className="btn btn-secondary hover:bg-photo-primary-dark">Ação</button>
```

**Dúvida:** Cor de texto em dark section?
```jsx
<div className="bg-photo-primary text-white">
  <h2 className="h2 text-white">White heading on dark</h2>
</div>
```

**Dúvida:** Como estilo um card de foto?
```jsx
<div className="card bg-white rounded-xl shadow-md overflow-hidden">
  <img src="/photo.jpg" alt="" className="w-full h-60 object-cover" />
  <div className="p-6">
    <h3 className="h3">Título</h3>
    <p className="body">Descrição</p>
    <button className="btn btn-primary mt-4">Comprar</button>
  </div>
</div>
```

---

**Last Updated:** 2026-05-06  
**Base:** Paróquia São Rafael Design System  
**Variant:** Paleta Derivada para Foto Venda (roxo magenta + ouro saturado)
