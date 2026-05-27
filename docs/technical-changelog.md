# Changelog Técnico

## 2026-05-27 — Experiência mobile dedicada

- **Tipo:** `feat`
- **Responsável:** Codex
- **Alteração:** criação de detecção de plataforma, carregamento lazy de desktop/mobile, experiência mobile dedicada e documentação `mobile-experience.md`.
- **Motivo:** oferecer UI mobile-first real para smartphones/tablets sem depender apenas de responsividade desktop.
- **Impacto:** usuários mobile/tablet recebem `MobileApp`; desktop permanece em `DesktopApp`.
- **Breaking changes:** nenhum contrato de API alterado.
- **Migrações necessárias:** nenhuma.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/architecture.md`, `docs/components.md`, `docs/system-flows.md`, `docs/technical-audit.md`.

## 2026-05-27 — Consolidação da documentação canônica

- **Tipo:** `docs`
- **Responsável:** Codex
- **Alteração:** criação de documentação técnica canônica em `docs/`, README profissional na raiz, política de documentação contínua e changelog técnico.
- **Motivo:** reduzir dívida documental, remover ambiguidade de onboarding e alinhar documentação ao código atual do working tree.
- **Impacto:** novos desenvolvedores devem iniciar por `README.md` e `docs/README.md`; documentação legada passa a ficar em `docs/archive/`.
- **Breaking changes:** nenhum no código de produção.
- **Migrações necessárias:** nenhuma.
- **Documentos afetados:** `README.md`, `docs/README.md`, `docs/project-overview.md`, `docs/architecture.md`, `docs/components.md`, `docs/apis.md`, `docs/system-flows.md`, `docs/database.md`, `docs/dependencies.md`, `docs/setup-environment.md`, `docs/technical-audit.md`, `docs/technical-roadmap.md`, `docs/conventions.md`, `docs/documentation-policy.md`.
