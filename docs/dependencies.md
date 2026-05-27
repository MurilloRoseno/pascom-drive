# Dependências do Projeto

## Frontend

| Dependência | Motivo | Criticidade | Risco |
| --- | --- | --- | --- |
| `react` | UI declarativa | Alta | Baixo |
| `react-dom` | Render no browser | Alta | Baixo |
| `react-router-dom` | Rotas SPA | Alta | Médio se migrar para data routers |
| `zod` | Validação de checkout | Alta | Baixo |
| `prop-types` | Validação runtime de props | Média | Inconsistente com docs antigas que citavam JSDoc |
| `@vitejs/plugin-react` | Build React no Vite | Alta dev | Baixo |
| `vite` | Dev server/build | Alta dev | Mudanças major podem afetar config |
| `tailwindcss` | Estilização utilitária | Média | Baixo |
| `jest`, `babel-jest`, `jest-environment-jsdom` | Testes | Alta dev | Config pode ficar sensível a ESM |
| `@testing-library/*` | Testes de componentes | Alta dev | Baixo |
| `eslint`, plugins React | Qualidade | Média dev | ESLint 8 está em manutenção legada |

## Backend

| Dependência | Motivo | Criticidade | Risco |
| --- | --- | --- | --- |
| `express` | API local e app exportado | Alta | Express 4 é estável, mas não serverless-native |
| `@vercel/functions` | Runtime Cache | Alta | APIs de cache podem variar por ambiente |
| `dotenv` | `.env` local | Média | Não usar em produção para segredos |
| `express-rate-limit` | Rate limits | Alta | Requer trust proxy correto |
| `helmet` | Headers de segurança | Alta | CSP está customizada fora dele |
| `google-auth-library` | Autenticação Google | Alta | Chave privada exige higiene forte |
| `google-spreadsheet` | Acesso ao Sheets | Alta | Sheets é gargalo arquitetural |
| `mercadopago` | Pagamentos | Alta | Contratos de SDK/webhook devem ser monitorados |
| `nodemailer` | Entrega por e-mail | Média | Entrega depende de SMTP externo |
| `sharp` | Processamento de imagem | Alta | Dependência nativa; atenção a deploy/serverless |
| `zod` | Validação backend | Alta | Baixo |
| `jest`, `supertest` | Testes | Alta dev | Baixo |
| `nodemon` | Dev local | Baixa dev | Baixo |

## Google Apps Script

| Dependência | Motivo | Criticidade | Risco |
| --- | --- | --- | --- |
| `jest` | Testes locais com mocks | Alta dev | Mocks precisam acompanhar APIs globais |
| `@google/clasp` via `npx` | Deploy Apps Script | Alta operação | Versão é chamada no script; validar antes de release |

## Dependências Críticas

- `mercadopago`: fluxo financeiro.
- `google-spreadsheet` e `google-auth-library`: persistência operacional.
- `sharp`: previews e marca d'água.
- `@vercel/functions`: cache.
- `zod`: fronteira de segurança de payload.
- `express-rate-limit`: proteção contra abuso.

## Dependências Obsoletas ou Questionáveis

- `eslint@8`: funcional, mas já não é a linha mais moderna do ecossistema.
- `prop-types`: válido, porém o projeto também usa validação Zod; manter apenas onde ajuda testes e documentação runtime.
- `express` em Vercel: simples e útil, mas para escala pode ser substituído por funções isoladas ou framework serverless-native.

## Dependências Não Utilizadas

Nenhuma dependência foi removida nesta auditoria. A confirmação final deve ser feita com ferramenta dedicada como `depcheck`, porque a análise manual pode perder imports dinâmicos, scripts ou mocks.

## Dependências Perigosas

- `sharp`: exige atenção a consumo de memória e payloads grandes.
- SDK Mercado Pago: mudanças de contrato afetam receita e entrega.
- Google APIs: falhas de permissão quebram catálogo e downloads.
- SMTP: falha não impede pagamento, mas afeta experiência de entrega.

## Sugestões

1. Rodar auditoria periódica de vulnerabilidades com `npm audit`.
2. Fixar estratégia de atualização mensal.
3. Documentar breaking changes de SDKs externos em `technical-changelog.md`.
4. Adicionar teste de smoke para Mercado Pago sandbox antes de produção.
5. Avaliar migração de ESLint 8 para Flat Config apenas após V1 estável.
