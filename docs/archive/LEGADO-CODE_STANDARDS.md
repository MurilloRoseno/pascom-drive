# CODE_STANDARDS.md - PadrÃµes do Projeto

**Data:** 2026-05-05
**Desenvolvedor:** 1 pessoa
**Ferramenta:** ESLint + Prettier

---

## ðŸŽ¯ Filosofia

> "CÃ³digo deve ser entendÃ­vel em 3 minutos, nÃ£o precisa ser bonito"
> - Simplicidade > PerfeiÃ§Ã£o
> - LegÃ­vel > Inteligente
> - Pronto > Polido

---

## ðŸ“ JAVASCRIPT / NODE.JS

### Nomes de VariÃ¡veis
```javascript
// âœ… BOM
const totalComTaxa = 20.99;
const fotosSelecionadas = [];
const isLoading = false;
const handleClickProximo = () => {};

// âŒ RUIM
const t = 20.99;
const fotos = [];  // "fotos" Ã© genÃ©rico, qual fotos?
const dados = [];
const click = () => {};
```

**Regra:** Nomes DESCRITIVOS (maior que 3 letras, please)

### FunÃ§Ãµes
```javascript
// âœ… BOM
function calcularSubtotal(fotos) {
  return fotos.reduce((sum, foto) => sum + foto.preco, 0);
}

function validarWhatsApp(numero) {
  return /^(\+55|55)?[1-9]\d{8,9}$/.test(numero);
}

// âŒ RUIM
function calc(arr) {
  return arr.reduce((a, b) => a + b.price, 0);
}

function valid(x) {
  return x.match(/\d{11}/);
}
```

**Regra:** Nome descritivo (verbo + objeto), parÃ¢metros claros, max 20 linhas

### ComentÃ¡rios - MENOS Ã© MAIS
```javascript
// âœ… BOM (documenta O QUÃŠ Ã© nÃ£o Ã³bvio)
// Timeout de 30 min porque MP expira Pix aprÃ¨s isso
const PAMENTO_TIMEOUT_MS = 30 * 60 * 1000;

// âœ… BOM (JSDoc para funÃ§Ãµes pÃºblicas)
/**
 * Calcula taxa de conveniÃªncia Mercado Pago
 * @param {number} subtotal - em reais
 * @returns {number} taxa em reais
 */
function calcularTaxa(subtotal) {
  return subtotal * 0.0299 + 0.30;
}

// âŒ RUIM (Ã³bvio, comentÃ¡rio desnecessÃ¡rio)
// Adiciona 1 a x
const x = 1;
x = x + 1; // incrementar

// âŒ RUIM (comentÃ¡rio desatualizado)
// TODO: Adicionar suporte a Apple Pay (nunca vai fazer)
```

**Regra:** ComentÃ¡rio = "por que", nÃ£o "o que"

### Async/Await
```javascript
// âœ… BOM
async function buscarFotos() {
  try {
    const fotos = await fetch('/api/eventos').then(r => r.json());
    return fotos;
  } catch (err) {
    console.error('Erro ao buscar fotos:', err);
    return [];
  }
}

// âŒ RUIM
function buscarFotos() {
  return fetch('/api/eventos')
    .then(r => r.json())
    .then(fotos => fotos)
    .catch(err => console.log(err));
}
```

**Regra:** async/await preferred, sempre try-catch

### Const vs Let vs Var
```javascript
// âœ… BOM
const MAX_FOTOS = 1000;  // nunca muda
let contador = 0;        // muda
contador++;

// âŒ RUIM
var x = 10;              // NUNCA usar var
let MAX_FOTOS = 1000;    // Ã© constante, use const
```

**Regra:** Prefer `const`, depois `let`, NUNCA `var`

---

## âš›ï¸ REACT

### Componentes
```javascript
// âœ… BOM - Funcional com hooks
export default function FotoCard({ foto, selected, onToggle }) {
  return (
    <div className="card">
      <img src={foto.linkAmostra} alt={foto.id} />
      <label>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(foto.id)}
        />
        R$ {foto.preco.toFixed(2)}
      </label>
    </div>
  );
}

// âŒ RUIM - Classe (evitar)
class FotoCard extends React.Component { ... }

// âŒ RUIM - Props genÃ©ricas
function Card({ data, func, toggle }) { ... }
```

**Regra:** Functional components, props descritivas, max 50 linhas

### Hooks Customizados
```javascript
// âœ… BOM
function useCarrinho() {
  const [selecionadas, setSelecionadas] = useState([]);
  
  const adicionar = (fotoId) => {
    setSelecionadas([...selecionadas, fotoId]);
  };
  
  const remover = (fotoId) => {
    setSelecionadas(selecionadas.filter(id => id !== fotoId));
  };
  
  return { selecionadas, adicionar, remover };
}

// Uso
function App() {
  const { selecionadas, adicionar, remover } = useCarrinho();
}

// âŒ RUIM (prop drilling)
function App() {
  const [selecionadas, setSelecionadas] = useState([]);
  return (
    <Galeria selecionadas={selecionadas} setSelecionadas={setSelecionadas} />
  );
}
```

**Regra:** Custom hooks para lÃ³gica reutilizÃ¡vel, Context para estado global

### Props Validation (apenas JSDoc, sem PropTypes)
```javascript
// âœ… BOM
/**
 * @param {{ id: string, preco: number, evento: string }} foto
 * @param {boolean} selected
 * @param {(id: string) => void} onToggle
 */
function FotoCard({ foto, selected, onToggle }) { ... }

// âŒ RUIM (nem JSDoc nem PropTypes)
function FotoCard({ foto, selected, onToggle }) { ... }
```

**Regra:** JSDoc para todas funÃ§Ãµes pÃºblicas

### RenderizaÃ§Ã£o Condicional
```javascript
// âœ… BOM
return (
  <>
    {isLoading ? <Spinner /> : <Galeria fotos={fotos} />}
    {erro && <ErrorMessage msg={erro} />}
  </>
);

// âŒ RUIM
return (
  <>
    {isLoading === true ? <Spinner /> : null}
    {erro ? <ErrorMessage msg={erro} /> : null}
  </>
);
```

**Regra:** Ternary para 1 linhas, `&&` para condicional simples

---

## ðŸ”§ BACK-END (Node.js / Vercel Functions)

### Endpoints REST
```javascript
// âœ… BOM - backend/api/eventos.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const fotos = await buscarFotos();
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(200).json(fotos);
  } catch (err) {
    auditLog('fotos_error', { error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// âŒ RUIM
app.get('/fotos', (req, res) => {
  const fotos = buscarFotos(); // sem await
  res.send(fotos); // sem status code
});
```

**Regra:** Always status codes, try-catch, logging

### ValidaÃ§Ã£o com Zod
```javascript
// âœ… BOM
import { z } from 'zod';

const schemaPagamento = z.object({
  whatsapp: z.string().regex(/^(\+55|55)?[1-9]\d{8,9}$/),
  fotoIds: z.array(z.string()).min(1),
  totalComTaxa: z.number().gt(0).lte(10000)
});

export default async function handler(req, res) {
  try {
    const dados = schemaPagamento.parse(req.body);
    // processa...
  } catch (err) {
    return res.status(400).json({ error: 'Validation failed' });
  }
}

// âŒ RUIM (sem validaÃ§Ã£o)
export default async function handler(req, res) {
  const { whatsapp, totalComTaxa } = req.body;
  // ninguÃ©m sabe se Ã© vÃ¡lido!
}
```

**Regra:** SEMPRE Zod no backend

### Middleware
```javascript
// âœ… BOM
function corsMiddleware(req, res, next) {
  res.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
  next();
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  req.user = verifyJWT(token);
  next();
}

// Uso
app.use(corsMiddleware);
app.post('/admin', authMiddleware, deletePhoto);

// âŒ RUIM (middleware inline)
app.post('/admin', (req, res) => {
  if (!req.headers.authorization) return res.status(401);
  // ...tudo aqui
});
```

**Regra:** Middleware reutilizÃ¡vel, separado em arquivo

---

## ðŸ“‚ ESTRUTURA DE PASTAS

```
src/
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ FotoCard.jsx
â”‚   â”œâ”€â”€ GaleriaGrid.jsx
â”‚   â”œâ”€â”€ Header.jsx
â”‚   â””â”€â”€ common/              (Button, Input, Modal)
â”‚
â”œâ”€â”€ pages/
â”‚   â”œâ”€â”€ index.jsx            (galeria)
â”‚   â”œâ”€â”€ compra/
â”‚   â”‚   â””â”€â”€ index.jsx        (fluxo multi-step)
â”‚   â””â”€â”€ admin/
â”‚       â””â”€â”€ index.jsx
â”‚
â”œâ”€â”€ hooks/
â”‚   â”œâ”€â”€ useEventos.js
â”‚   â”œâ”€â”€ useCarrinho.js
â”‚   â”œâ”€â”€ usePagamento.js
â”‚   â””â”€â”€ useValidacao.js
â”‚
â”œâ”€â”€ context/
â”‚   â”œâ”€â”€ CarrinhoContext.js
â”‚   â””â”€â”€ AuthContext.js       (se precisar)
â”‚
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ api.js               (axios instance)
â”‚   â”œâ”€â”€ validation.js        (regexes, validadores)
â”‚   â””â”€â”€ utils.js
â”‚
â”œâ”€â”€ styles/
â”‚   â”œâ”€â”€ globals.css
â”‚   â”œâ”€â”€ components.css
â”‚   â””â”€â”€ colors.css           (design system)
â”‚
â””â”€â”€ __tests__/
    â”œâ”€â”€ unit/
    â”œâ”€â”€ integration/
    â””â”€â”€ e2e/
```

**Regra:** 1 componente = 1 arquivo, pastas por funÃ§Ã£o

---

## âœ… ESLINT + PRETTIER CONFIG

### `.eslintrc.json`
```json
{
  "env": { "browser": true, "es2021": true, "node": true },
  "extends": ["eslint:recommended"],
  "rules": {
    "no-var": "error",
    "prefer-const": "error",
    "semi": ["error", "always"],
    "quotes": ["error", "single"],
    "comma-dangle": ["error", "never"],
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

### `.prettierrc.json`
```json
{
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "none"
}
```

### Pre-commit Hook (automÃ¡tico)
```bash
# .husky/pre-commit
npm run lint:fix   # ESLint fix
npm run test:unit  # Jest rÃ¡pido
```

---

## ðŸ§ª TESTES

### Nomenclatura
```javascript
// âœ… BOM
describe('calcularSubtotal', () => {
  it('deve retornar 0 para array vazio', () => {
    expect(calcularSubtotal([])).toBe(0);
  });
  
  it('deve somar preÃ§os corretamente', () => {
    const fotos = [{ preco: 10 }, { preco: 5 }];
    expect(calcularSubtotal(fotos)).toBe(15);
  });
});

// âŒ RUIM
it('works', () => {
  expect(func()).toBe(true);
});
```

**Regra:** Descreva O QUE testa (deve..., quando..., se...)

### Coverage
```bash
# Rodar com cobertura
npm test -- --coverage

# Output esperado:
# Statements   : 70% ( mÃ­nimo para MVP )
# Branches     : 65%+
# Functions    : 75%+
# Lines        : 70%+
```

**Regra:** MÃ­nimo 70% coverage

---

## ðŸš« PROIBIÃ‡Ã•ES ABSOLUTAS

```javascript
// âŒ NUNCA
console.log(senha, token, apiKey);  // PII em logs
const dados = any;                  // any type (sem tipos)
setTimeout(() => {}, 1000);         // sem motivo
const x = require('./file.js');     // sem import ES6
var globalVar = 1;                  // var + global
function func(a,b,c,d,e) {}         // >4 parÃ¢metros
const obj = { ...bigObject };       // copiar sem necessidade
eval(userInput);                    // eval nunca!
```

**Regra:** PadrÃ£o > SeguranÃ§a > Performance

---

## âœ… CHECKLIST antes de fazer COMMIT

- [ ] ESLint pass: `npm run lint`
- [ ] Prettier formatado: `npm run format`
- [ ] Testes passando: `npm test`
- [ ] Sem console.log deixado
- [ ] Sem TODO/FIXME nÃ£o explicado
- [ ] Nomes descritivos (todas variÃ¡veis/funÃ§Ãµes)
- [ ] Sem import/require desnecessÃ¡rio
- [ ] JSDoc em funÃ§Ãµes pÃºblicas

```bash
# Script rÃ¡pido (roda tudo):
npm run lint:fix && npm run format && npm test
```

---

## ðŸ“– PrÃ³ximas Leituras

1. **DEFINITION_OF_DONE.md** - Quando considerar pronto
2. **ROADMAP_SOLO.md** - ImplementaÃ§Ã£o
