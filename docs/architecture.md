# Arquitetura do Projeto

## Visão Arquitetural

O Pascom Drive usa uma arquitetura modular simples:

- Frontend SPA para experiência de compra.
- Backend Node.js como camada de integração e segurança.
- Google Apps Script como worker/automação acoplado ao Drive e Sheets.
- Google Sheets como banco operacional e painel administrativo.
- Vercel como plataforma de deploy do frontend e backend.

```text
Browser
  -> React SPA
  -> /api/* na Vercel
  -> Express handlers
  -> Google Sheets / Google Drive / Mercado Pago / SMTP

Google Drive
  -> Apps Script trigger
  -> Google Sheets
  -> Backend image endpoints
  -> Drive folders de originais, previews e thumbnails
```

## Estrutura de Pastas

| Pasta | Responsabilidade |
| --- | --- |
| `frontend/` | Aplicação React/Vite, páginas, componentes, contexto de carrinho e testes UI |
| `frontend/src/pages/` | Rotas principais: home, busca, evento, checkout e retorno de pagamento |
| `frontend/src/components/` | Componentes compartilhados como cartão de foto, resumo do carrinho e layout |
| `frontend/src/context/` | Estado global do carrinho |
| `frontend/src/lib/` | Cliente HTTP, validação e formatação |
| `backend/api/` | Handlers HTTP usados por Express/Vercel |
| `backend/api/webhook/` | Webhooks externos |
| `backend/lib/` | Integrações e regras: Sheets, Drive, Mercado Pago, pricing, cache, delivery |
| `backend/middleware/` | Rate limiting e tratamento de erro |
| `google-apps-script/` | Automação Drive/Sheets, triggers, watermark orchestration e testes |
| `docs/` | Documentação técnica ativa |
| `docs/archive/` | Documentação legada preservada como histórico |
| `graphify-out/` | Índice de grafo para navegação técnica |

## Fluxo de Dados

```text
Eventos e Fotos
  Drive pasta nova
  -> Apps Script processarEventos()
  -> Eventos/Fotos no Sheets
  -> APIs GET /api/eventos e /api/eventos/:id/fotos
  -> React Home/Search/Event

Compra
  React Checkout
  -> POST /api/checkout/quote
  -> Sheets RegrasPagamento + Fotos
  -> POST /api/checkout/preference
  -> Sheets Pedidos/ItensPedido
  -> Mercado Pago

Confirmação
  Mercado Pago webhook
  -> valida HMAC
  -> consulta pagamento
  -> atualiza Pedidos/Webhooks
  -> cria Downloads
  -> envia e-mail ou gera WhatsApp assistido
```

## Relação Entre Componentes

```text
App
├─ CarrinhoProvider
├─ Header
├─ ScrollToTop
├─ Routes públicas: Home, Search, PaymentReturn
├─ CartSummary global
├─ Routes comerciais: Event, Checkout
└─ Footer
```

O carrinho fica acima das rotas para preservar seleção entre páginas. `CartSummary` é global, mas se oculta no checkout para evitar ação duplicada.

## Padrões Arquiteturais

- **SPA + API backend:** React consome endpoints REST.
- **Serverless-compatible Express:** `backend/server.js` exporta app para `backend/api/index.js`.
- **Repository-like modules:** `google-sheets.*.js` encapsula acesso ao Sheets por domínio.
- **Gateway externo:** módulos `mercado-pago.js`, `google-drive.js` e `delivery.js` isolam dependências externas.
- **Read-through cache:** `runtime-cache.js` centraliza cache Vercel.
- **Append/Update auditável:** Sheets mantém abas explícitas para pedidos, itens, webhooks e downloads.
- **Worker externo via Apps Script:** processamento é iniciado por trigger e chama backend para trabalho que Apps Script não faz bem.

## Padrões de Design Identificados

| Padrão | Onde aparece | Observação |
| --- | --- | --- |
| Facade | `backend/lib/google-sheets.js` | Reexporta módulos shared/catalog/orders |
| Adapter | `google-drive.js`, `mercado-pago.js` | Adapta SDKs externos ao domínio |
| Reducer | `CarrinhoContext.jsx` | Estado previsível para adicionar/remover fotos |
| Gateway | APIs em `backend/api/` | Controlam validação, autorização e resposta |
| Idempotency guard | `registrarWebhookSeNovo` | Evita processar webhook duplicado |
| Token capability | galeria/download | Acesso temporário assinado sem sessão de usuário |

## Estratégia de Estado

- Estado global mínimo via Context API em `CarrinhoContext.jsx`.
- Carrinho armazena objetos de foto selecionados.
- Páginas usam `useState`, `useEffect`, `useMemo`, `useCallback` conforme necessidade.
- Token de galeria protegida é mantido em `sessionStorage` com chave por evento.
- Não há Redux/Zustand; a complexidade atual não exige store externa.

## Estratégia de Rotas

Frontend:

- `/` home institucional e eventos recentes.
- `/buscar` busca/listagem de eventos.
- `/categoria` redireciona legado para `/buscar`.
- `/evento/:eventoId` galeria do evento.
- `/checkout` formulário e criação de pagamento.
- `/pagamento/:resultado` retorno do Mercado Pago.

Backend:

- Rotas públicas de catálogo e checkout em `/api`.
- Rotas protegidas por segredo para processamento e cache.
- Webhook Mercado Pago com HMAC.
- Download por token assinado.

## Estratégia de APIs

- JSON como formato padrão.
- Métodos explicitamente limitados por handler.
- Validação Zod nos endpoints de payload/consulta críticos.
- Erros retornam `{ error: string }`.
- Rate limits aplicados por classe de rota em `backend/middleware/rate-limit.js`.
- Alias legado `POST /api/criar-pagamento` aponta para `checkout-preference`.

## Estratégia de Autenticação e Autorização

Não há autenticação de usuário final por login.

Mecanismos atuais:

- Galeria protegida: código validado contra hash e token temporário assinado.
- Download: JWT assinado com `downloadId`, expiração e hash salvo no Sheets.
- Endpoints de processamento: header `Authorization: Bearer WATERMARK_API_SECRET`.
- Cache admin: segredo comparado por hash timing-safe.
- Webhook: assinatura HMAC Mercado Pago.

## Estratégia de Cache

- `backend/lib/runtime-cache.js` usa Vercel Runtime Cache.
- Catálogo publicado usa cache read-through.
- Previews podem ser cacheados por chave e tag.
- Invalidação ocorre via `POST /api/admin/cache/invalidate`.
- Apps Script chama invalidação quando fotos/eventos mudam.
- Risco atual: ambiente local depende de disponibilidade/comportamento de `@vercel/functions`.

## Estratégia de Renderização

- Frontend é SPA estática gerada por Vite.
- Vercel entrega `frontend/dist` com fallback para `index.html`.
- Dados são buscados no cliente.
- Não há SSR, SSG dinâmico ou hidratação server-side.

## Estratégia de Deploy

```text
Git push
  -> Vercel build
  -> frontend/package.json static-build
  -> backend/api/index.js @vercel/node
  -> routes /api/* e SPA fallback

Apps Script
  -> npm run validate:release
  -> clasp push
  -> triggers criados por criarTriggers()
```

## Decisões Importantes

- Google Sheets é banco do MVP por simplicidade operacional.
- JavaScript é usado em todas as camadas; não há TypeScript.
- Express é mantido para desenvolvimento local e compatibilidade Vercel.
- Apps Script fica responsável pela automação nativa do Google Workspace.
- O backend processa imagens para evitar limitações do Apps Script.

## Riscos Arquiteturais

- Sheets como banco pode virar gargalo em volume, concorrência e consistência.
- Estado de pedidos depende de atualizações em linhas, não transações ACID.
- Documentação histórica antiga causava ruído e precisava ser arquivada.
- Algumas regras usam timestamps ISO/UTC apesar da política de `America/Sao_Paulo`.
- CSP atual permite `unsafe-inline`, aceitável para MVP mas não ideal.
