# Documentação Técnica — Pascom Drive

Este diretório é a fonte canônica de documentação do Pascom Drive. O código atual em disco é a fonte primária da verdade; quando documentação e código divergem, atualize a documentação.

## Leitura Recomendada

1. `project-overview.md` — contexto, objetivo, público e visão macro.
2. `architecture.md` — arquitetura, pastas, dados, rotas, deploy e decisões.
3. `setup-environment.md` — instalação, variáveis, scripts e produção.
4. `system-flows.md` — fluxos de usuário, pagamento, processamento e entrega.
5. `apis.md` — contratos HTTP reais do backend.
6. `database.md` — modelo Google Sheets usado como banco.
7. `components.md` — páginas, componentes React e estado.
8. `technical-audit.md` — riscos, problemas e recomendações.
9. `technical-roadmap.md` — evolução técnica sugerida.
10. `conventions.md` — padrões obrigatórios.
11. `documentation-policy.md` — cultura de documentação contínua.
12. `technical-changelog.md` — histórico técnico contínuo.

## Mapa de Documentos

| Documento | Propósito | Público |
| --- | --- | --- |
| `project-overview.md` | Explica o sistema e seu problema de negócio | Todos |
| `architecture.md` | Descreve decisões e relacionamento entre módulos | Devs e mantenedores |
| `components.md` | Detalha componentes atuais do frontend | Frontend |
| `apis.md` | Documenta endpoints, payloads e erros | Frontend/backend |
| `system-flows.md` | Explica jornadas ponta a ponta | Produto, suporte e devs |
| `database.md` | Documenta abas e entidades do Google Sheets | Backend, Apps Script |
| `dependencies.md` | Explica dependências e riscos | Devs e segurança |
| `setup-environment.md` | Guia operacional de ambiente | Novos devs e deploy |
| `technical-audit.md` | Lista dívidas, riscos e fragilidades | Tech lead |
| `technical-roadmap.md` | Prioriza melhorias futuras | Planejamento técnico |
| `conventions.md` | Define padrões de trabalho | Todos os devs |
| `documentation-policy.md` | Define regra de documentação contínua | Todos |
| `technical-changelog.md` | Registra mudanças técnicas relevantes | Todos |

## Estado Atual

- Frontend SPA React em `frontend/`.
- Backend Express usado localmente e como Vercel Function em `backend/api/index.js`.
- Automação Apps Script em `google-apps-script/`.
- Banco operacional em Google Sheets.
- Documentos antigos foram movidos para `archive/`.

## Política de Verdade

1. Código atual em disco.
2. Testes atuais.
3. Documentos canônicos deste diretório.
4. Documentação arquivada apenas como histórico.

Não use `archive/` para implementar features novas sem confirmar contra o código atual.
