# Changelog Tecnico

## 2026-05-28 - Modo escuro mobile fiel ao standalone

- **Tipo:** frontend, mobile e documentacao.
- **Alteracao:** bloco `.app.dark` mobile atualizado com tokens e overrides visuais extraidos de `C:\Users\muril\Downloads\Pascom Drive _standalone_ (2).html`.
- **Motivo:** alinhar o tema escuro mobile ao layout pesquisado e planejado no HTML standalone, sem depender de adaptacao manual roxa anterior.
- **Impacto:** somente usuarios mobile/tablet ao acionar o botao de tema veem o novo modo escuro; desktop, APIs, checkout, backend e banco permanecem intactos.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Responsavel:** Codex.

## 2026-05-28 - Protecao em camadas para fotos

- **Tipo:** seguranca, privacidade, backend, frontend, Apps Script e documentacao.
- **Alteracao:** previews passam a receber `mt` temporario assinado, middleware de abuso de midia bloqueia padroes massivos, watermark de amostras ganha grade/texto/seed deterministico e downloads pagos passam a gerar copia full-res com fingerprint forense por pedido/download.
- **Motivo:** reduzir captura/coleta casual, preservar originais privados e permitir rastreabilidade proporcional de vazamentos sem tecnicas destrutivas de anti-debug.
- **Impacto:** `GET /api/download` mantem o mesmo contrato de entrada, mas entrega copia fingerprinted; planilha `Downloads` ganha colunas forenses; producao exige `FORENSIC_WATERMARK_SECRET`.
- **Breaking changes:** nenhum contrato publico de checkout/pagamento; operadores devem atualizar env e inicializar estrutura da planilha para novas colunas.
- **Migracoes necessarias:** configurar `FORENSIC_WATERMARK_SECRET`, opcionalmente `MEDIA_TOKEN_SECRET`, e executar `inicializarEstrutura()` no Apps Script para adicionar colunas em `Downloads`.
- **Responsavel:** Codex.


## 2026-05-28 - Protecao discreta contra DevTools nas galerias

- **Tipo:** `feat/security`
- **Responsavel:** Codex
- **Alteracao:** criacao de `useDevtoolsGuard` production-only, integracao em evento/galeria/lightbox desktop e mobile, blur de previas `.photo-blur-target` e aviso discreto quando ha sinal consistente de DevTools aberto.
- **Motivo:** reduzir captura casual/inspecao de previas sem usar tecnicas agressivas que travem navegador, quebrem suporte ou bloqueiem checkout.
- **Impacto:** previas ficam ocultas visualmente enquanto DevTools parece aberto; navegacao, APIs, carrinho, Mercado Pago e downloads autorizados seguem intactos.
- **Breaking changes:** nenhum contrato de API alterado.
- **Migracoes necessarias:** nenhuma.
- **Documentos afetados:** `docs/components.md`, `docs/system-flows.md`, `docs/mobile-experience.md`, `docs/technical-audit.md`, `docs/technical-changelog.md`.

## 2026-05-28 — Port fiel do HTML standalone no mobile

- **Tipo:** `refactor`
- **Responsável:** Codex
- **Alteração:** reconstrução das telas mobile a partir de `C:\Users\muril\Downloads\Pascom Drive _standalone_ (1).html`, preservando appbar, bottom nav, calendário completo, perfil público/Pascom, galeria, lightbox, carrinho sheet, checkout em stepper e retorno visual de pagamento.
- **Motivo:** tornar o mobile do site fiel ao HTML criado na ferramenta de design, sem depender apenas da implementação anterior inspirada no protótipo.
- **Impacto:** usuários mobile recebem a experiência interna do standalone conectada às APIs reais; funcionalidades sem backend permanecem como placeholders inativos.
- **Breaking changes:** nenhum contrato de API alterado.
- **Migrações necessárias:** nenhuma.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/components.md`, `docs/system-flows.md`, `docs/technical-changelog.md`.

## 2026-05-28 — Política de Privacidade pública

- **Tipo:** `feat/docs`
- **Responsável:** Codex
- **Alteração:** criação da página `PrivacyPolicy`, rotas públicas `/privacidade` e `/politica-de-privacidade`, links de acesso no rodapé desktop e na tela `/perfil` mobile.
- **Motivo:** tornar transparente o tratamento de dados pessoais no fluxo de venda/entrega de fotos, incluindo Google Sheets/Drive, Mercado Pago, WhatsApp, e-mail, galerias protegidas, downloads e logs técnicos.
- **Impacto:** usuários passam a ter acesso público à política LGPD adaptada ao Pascom Drive, com seção pastoral sobre dignidade, proporcionalidade, confidencialidade e não vigilância.
- **Breaking changes:** nenhum contrato de API alterado.
- **Migrações necessárias:** nenhuma.
- **Documentos afetados:** `docs/components.md`, `docs/system-flows.md`, `docs/mobile-experience.md`, `docs/technical-changelog.md`.

## 2026-05-27 — Reimplementação fiel do layout mobile

- **Tipo:** `refactor`
- **Responsável:** Codex
- **Alteração:** substituição da primeira UI mobile por um porte fiel do projeto `pascom-drive-mobile`, preservando tokens, classes, fluxo visual, bottom navigation, cards, galeria, lightbox, carrinho sheet e checkout vertical.
- **Motivo:** o projeto `pascom-drive-mobile` foi criado especificamente como referência pesquisada e planejada para melhorar o fluxo mobile; a implementação anterior estava apenas inspirada nela.
- **Impacto:** usuários mobile/tablet recebem uma experiência visual mais próxima do design aprovado, mantendo integrações reais com APIs, carrinho e Mercado Pago.
- **Breaking changes:** nenhum contrato de API alterado.
- **Migrações necessárias:** nenhuma.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/architecture.md`, `docs/components.md`, `docs/technical-changelog.md`.

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
