# CODE_STANDARDS.md - Padrões do Projeto

**Data:** 2026-05-05
**Desenvolvedor:** 1 pessoa
**Ferramenta:** ESLint + Prettier

---

## 🎯 Filosofia

> "Código deve ser entendível em 3 minutos, não precisa ser bonito"
> - Simplicidade > Perfeição
> - Legível > Inteligente
> - Pronto > Polido

---

## 📝 JAVASCRIPT / NODE.JS

### Nomes de Variáveis
```javascript
// ✅ BOM
const totalComTaxa = 20.99;
const fotosSelecionadas = [];
const isLoading = false;
const handleClickProximo = () => {};

// ❌ RUIM
const t = 20.99;
const fotos = [];  // "fotos" é genérico, qual fotos?
const dados = [];
const click = () => {};
```

**Regra:** Nomes DESCRITIVOS (maior que 3 letras, please)

### Funções
```javascript
// ✅ BOM
function calcularSubtotal(fotos) {
  return fotos.reduce((sum, foto) => sum + foto.preco, 0);
}

function validarWhatsApp(numero) {
  return /^(\+55|55)?[1-9]\d{8,9}$/.test(numero);
}

// ❌ RUIM
function calc(arr) {
  return arr.reduce((a, b) => a + b.price, 0);
}

function valid(x) {
  return x.match(/\d{11}/);
}
```

**Regra:** Nome descritivo (verbo + objeto), parâmetros claros, max 20 linhas

### Comentários - MENOS é MAIS
```javascript
// ✅ BOM (documenta O QUÊ é não óbvio)
// Timeout de 30 min porque MP expira Pix après isso
const PAMENTO_TIMEOUT_MS = 30 * 60 * 1000;

// ✅ BOM (JSDoc para funções públicas)
/**
 * Calcula taxa de conveniência Mercado Pago
 * @param {number} subtotal - em reais
 * @returns {number} taxa em reais
 */
function calcularTaxa(subtotal) {
  return subtotal * 0.0299 + 0.30;
}

// ❌ RUIM (óbvio, comentário desnecessário)
// Adiciona 1 a x
const x = 1;
x = x + 1; // incrementar

// ❌ RUIM (comentário desatualizado)
// TODO: Adicionar suporte a Apple Pay (nunca vai fazer)
```

**Regra:** Comentário = "por que", não "o que"

### Async/Await
```javascript
// ✅ BOM
async function buscarFotos() {
  try {
    const fotos = await fetch('/api/fotos').then(r => r.json());
    return fotos;
  } catch (err) {
    console.error('Erro ao buscar fotos:', err);
    return [];
  }
}

// ❌ RUIM
function buscarFotos() {
  return fetch('/api/fotos')
    .then(r => r.json())
    .then(fotos => fotos)
    .catch(err => console.log(err));
}
```

**Regra:** async/await preferred, sempre try-catch

### Const vs Let vs Var
```javascript
// ✅ BOM
const MAX_FOTOS = 1000;  // nunca muda
let contador = 0;        // muda
contador++;

// ❌ RUIM
var x = 10;              // NUNCA usar var
let MAX_FOTOS = 1000;    // é constante, use const
```

**Regra:** Prefer `const`, depois `let`, NUNCA `var`

---

## ⚛️ REACT

### Componentes
```javascript
// ✅ BOM - Funcional com hooks
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

// ❌ RUIM - Classe (evitar)
class FotoCard extends React.Component { ... }

// ❌ RUIM - Props genéricas
function Card({ data, func, toggle }) { ... }
```

**Regra:** Functional components, props descritivas, max 50 linhas

### Hooks Customizados
```javascript
// ✅ BOM
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

// ❌ RUIM (prop drilling)
function App() {
  const [selecionadas, setSelecionadas] = useState([]);
  return (
    <Galeria selecionadas={selecionadas} setSelecionadas={setSelecionadas} />
  );
}
```

**Regra:** Custom hooks para lógica reutilizável, Context para estado global

### Props Validation (apenas JSDoc, sem PropTypes)
```javascript
// ✅ BOM
/**
 * @param {{ id: string, preco: number, evento: string }} foto
 * @param {boolean} selected
 * @param {(id: string) => void} onToggle
 */
function FotoCard({ foto, selected, onToggle }) { ... }

// ❌ RUIM (nem JSDoc nem PropTypes)
function FotoCard({ foto, selected, onToggle }) { ... }
```

**Regra:** JSDoc para todas funções públicas

### Renderização Condicional
```javascript
// ✅ BOM
return (
  <>
    {isLoading ? <Spinner /> : <Galeria fotos={fotos} />}
    {erro && <ErrorMessage msg={erro} />}
  </>
);

// ❌ RUIM
return (
  <>
    {isLoading === true ? <Spinner /> : null}
    {erro ? <ErrorMessage msg={erro} /> : null}
  </>
);
```

**Regra:** Ternary para 1 linhas, `&&` para condicional simples

---

## 🔧 BACK-END (Node.js / Vercel Functions)

### Endpoints REST
```javascript
// ✅ BOM - backend/api/fotos.js
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

// ❌ RUIM
app.get('/fotos', (req, res) => {
  const fotos = buscarFotos(); // sem await
  res.send(fotos); // sem status code
});
```

**Regra:** Always status codes, try-catch, logging

### Validação com Zod
```javascript
// ✅ BOM
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

// ❌ RUIM (sem validação)
export default async function handler(req, res) {
  const { whatsapp, totalComTaxa } = req.body;
  // ninguém sabe se é válido!
}
```

**Regra:** SEMPRE Zod no backend

### Middleware
```javascript
// ✅ BOM
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

// ❌ RUIM (middleware inline)
app.post('/admin', (req, res) => {
  if (!req.headers.authorization) return res.status(401);
  // ...tudo aqui
});
```

**Regra:** Middleware reutilizável, separado em arquivo

---

## 📂 ESTRUTURA DE PASTAS

```
src/
├── components/
│   ├── FotoCard.jsx
│   ├── GaleriaGrid.jsx
│   ├── Header.jsx
│   └── common/              (Button, Input, Modal)
│
├── pages/
│   ├── index.jsx            (galeria)
│   ├── compra/
│   │   └── index.jsx        (fluxo multi-step)
│   └── admin/
│       └── index.jsx
│
├── hooks/
│   ├── useFotos.js
│   ├── useCarrinho.js
│   ├── usePagamento.js
│   └── useValidacao.js
│
├── context/
│   ├── CarrinhoContext.js
│   └── AuthContext.js       (se precisar)
│
├── lib/
│   ├── api.js               (axios instance)
│   ├── validation.js        (regexes, validadores)
│   └── utils.js
│
├── styles/
│   ├── globals.css
│   ├── components.css
│   └── colors.css           (design system)
│
└── __tests__/
    ├── unit/
    ├── integration/
    └── e2e/
```

**Regra:** 1 componente = 1 arquivo, pastas por função

---

## ✅ ESLINT + PRETTIER CONFIG

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

### Pre-commit Hook (automático)
```bash
# .husky/pre-commit
npm run lint:fix   # ESLint fix
npm run test:unit  # Jest rápido
```

---

## 🧪 TESTES

### Nomenclatura
```javascript
// ✅ BOM
describe('calcularSubtotal', () => {
  it('deve retornar 0 para array vazio', () => {
    expect(calcularSubtotal([])).toBe(0);
  });
  
  it('deve somar preços corretamente', () => {
    const fotos = [{ preco: 10 }, { preco: 5 }];
    expect(calcularSubtotal(fotos)).toBe(15);
  });
});

// ❌ RUIM
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
# Statements   : 70% ( mínimo para MVP )
# Branches     : 65%+
# Functions    : 75%+
# Lines        : 70%+
```

**Regra:** Mínimo 70% coverage

---

## 🚫 PROIBIÇÕES ABSOLUTAS

```javascript
// ❌ NUNCA
console.log(senha, token, apiKey);  // PII em logs
const dados = any;                  // any type (sem tipos)
setTimeout(() => {}, 1000);         // sem motivo
const x = require('./file.js');     // sem import ES6
var globalVar = 1;                  // var + global
function func(a,b,c,d,e) {}         // >4 parâmetros
const obj = { ...bigObject };       // copiar sem necessidade
eval(userInput);                    // eval nunca!
```

**Regra:** Padrão > Segurança > Performance

---

## ✅ CHECKLIST antes de fazer COMMIT

- [ ] ESLint pass: `npm run lint`
- [ ] Prettier formatado: `npm run format`
- [ ] Testes passando: `npm test`
- [ ] Sem console.log deixado
- [ ] Sem TODO/FIXME não explicado
- [ ] Nomes descritivos (todas variáveis/funções)
- [ ] Sem import/require desnecessário
- [ ] JSDoc em funções públicas

```bash
# Script rápido (roda tudo):
npm run lint:fix && npm run format && npm test
```

---

## 📖 Próximas Leituras

1. **DEFINITION_OF_DONE.md** - Quando considerar pronto
2. **ROADMAP_SOLO.md** - Implementação
