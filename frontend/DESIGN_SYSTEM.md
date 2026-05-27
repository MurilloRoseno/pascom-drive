# Pascom Drive - Design System Integrado

## Paleta

| Uso | Cor | Hex | Notas |
|-----|-----|-----|------|
| Primary | Roxo Magenta | `#8B3E7A` | CTA, headings, accents |
| Primary Dark | Roxo Deep | `#5C2650` | Hover, dark sections |
| Accent | Ouro Saturado | `#E8B923` | Buttons, highlights |
| Accent Dark | Ouro Deep | `#B8860B` | Hover states |
| Success | Teal | `#2B7A8E` | Status confirmado, badges |
| Paper | Warm Cream | `#F9F5F0` | Secondary backgrounds |
| Ink | Near-black | `#1A1410` | Primary text |

## Estrutura

```
frontend/
├── src/
│   ├── index.css
│   ├── colors_and_type.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   └── Footer.jsx
│   │   └── ...
│   └── ...
├── public/
│   └── assets/
└── tailwind.config.js
```

## Uso

- Use classes semânticas para botões, cards, badges e tipografia.
- Prefira assets locais em `public/assets`.
- Não dependa dos artefatos legados de ícones ou estilos; eles foram removidos.
- Mantenha a linguagem visual alinhada à paróquia, mas com a área de vendas claramente distinguida.

## Observações

- O frontend usa `import.meta.env.VITE_API_BASE_URL`.
- O checkout exibe valores vindos da cotação do backend.
- O resumo de carrinho não deve calcular preço final localmente.
