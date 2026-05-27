# Convenções do Projeto

## Nomenclatura

- Componentes React: `PascalCase`.
- Hooks: `useNome`.
- Funções JS: `camelCase`.
- Constantes globais: `UPPER_SNAKE_CASE`.
- IDs públicos: strings estáveis e URL-safe.
- Abas Sheets: nomes em português com inicial maiúscula.
- Colunas Sheets: manter exatamente os headers documentados em `database.md`.

## Branches

- Prefixo padrão para branches de agente: `codex/`.
- Use nomes descritivos: `codex/docs-canonicas`, `codex/fix-webhook-hmac`.

## Commits

Formato recomendado:

```text
tipo(escopo): resumo curto
```

Tipos:

- `feat`
- `fix`
- `docs`
- `test`
- `refactor`
- `chore`
- `security`

Exemplo:

```text
docs(project): consolidate canonical technical documentation
```

## Organização de Código

- Handlers HTTP ficam em `backend/api`.
- Regras e integrações ficam em `backend/lib`.
- Middleware fica em `backend/middleware`.
- Componentes compartilhados ficam em `frontend/src/components`.
- Páginas roteáveis ficam em `frontend/src/pages`.
- Estado global fica em `frontend/src/context`.
- Automação Google fica em `google-apps-script`.

## APIs

- Sempre validar entrada com Zod quando houver body/query relevante.
- Sempre restringir método HTTP.
- Responder erros como `{ error: string }`.
- Não vazar stack em produção.
- Documentar payload e resposta em `apis.md`.
- Atualizar testes quando contrato mudar.

## Componentização

- Página pode conter subcomponentes internos enquanto forem específicos.
- Extraia componente quando houver reutilização real ou complexidade excessiva.
- Não refatore por estética antes de V1.
- Evite acoplar UI diretamente a regras financeiras sem teste.

## Estilização

- Manter CSS existente salvo necessidade real.
- Usar classes consistentes com design atual.
- Não introduzir nova biblioteca visual sem decisão documentada.
- Alterações visuais relevantes devem atualizar documentação de componentes.

## Segurança Obrigatória

- Nunca hardcode credenciais.
- Nunca commite `.env` ou service account.
- Webhook Mercado Pago deve validar HMAC.
- Endpoints sensíveis exigem segredo.
- Downloads usam token assinado e hash salvo.
- Novos endpoints devem ter rate limit apropriado.
- Dados pessoais precisam de retenção e acesso mínimos.

## Testes

- Rodar testes do pacote alterado.
- Backend: `cd backend && npm test`.
- Frontend: `cd frontend && npm test`.
- Apps Script: `cd google-apps-script && npm test`.
- Fluxos de pagamento exigem validação sandbox antes de produção.

## Documentação

- Toda mudança relevante atualiza docs correspondentes.
- Toda mudança relevante atualiza `technical-changelog.md`.
- Docs antigas não devem permanecer ativas se contradizem o código.
- Material legado fica em `docs/archive/`.

## Revisão Antes de Finalizar

- Código compila/testa.
- Documentação afetada está atualizada.
- APIs e fluxos alterados estão descritos.
- Riscos e limitações foram registrados.
- Não há credenciais em diff.
