# Changelog Tecnico

## 2026-05-29 - Selecao desktop alinhada ao mobile

- **Tipo:** frontend desktop e documentacao.
- **Alteracao:** a galeria desktop passou a selecionar/remover fotos por botao circular sobreposto `+`/`✓`, mantendo clique na imagem para abrir o lightbox e usando texto de lightbox alinhado ao mobile.
- **Motivo:** deixar a interacao de selecao da foto consistente entre desktop e mobile.
- **Impacto:** somente apresentacao/interacao desktop; carrinho, checkout, APIs, mobile, pagamentos, downloads e banco permanecem inalterados.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/components.md` e `docs/technical-changelog.md`.

## 2026-05-29 - Remocao do recurso local de salvar fotos

- **Tipo:** frontend e documentacao.
- **Alteracao:** removida a conveniencia local de salvar fotos antes da compra em desktop e mobile, incluindo botoes, estado em navegador, entradas de perfil e textos de politica/documentacao.
- **Motivo:** simplificar a experiencia e eliminar uma funcionalidade que nao deve mais existir no produto.
- **Impacto:** usuarios continuam selecionando fotos diretamente para o carrinho; dados antigos eventualmente presentes no navegador ficam inacessiveis e nao sao migrados.
- **Breaking changes:** nenhum contrato de API, pagamento, download, galeria protegida ou banco foi alterado.
- **Migracoes necessarias:** nenhuma.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/components.md`, `docs/mobile-experience.md`, `docs/system-flows.md`, `docs/technical-audit.md`, `docs/technical-roadmap.md`, `docs/technical-changelog.md` e `frontend/src/pages/PrivacyPolicy.jsx`.

## 2026-05-29 - Area Pascom autenticada com Clerk

- **Tipo:** autenticacao, backend, frontend, Apps Script e documentacao.
- **Alteracao:** criada area operacional `/pascom` no desktop e entrada Pascom em `/perfil` mobile, protegidas por Clerk e allowlist `EquipePascom` no Google Sheets.
- **Motivo:** permitir que a equipe Pascom consulte pedidos, downloads, suporte e metricas basicas sem expor administracao ao fluxo publico de compradores.
- **Impacto:** novas APIs protegidas em `/api/pascom/*`; compradores continuam sem login; producao exige `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` e allowlist ativa na aba `EquipePascom`.
- **Breaking changes:** nenhum contrato publico de compra, galeria, checkout, Mercado Pago ou download foi removido.
- **Migracoes necessarias:** executar `inicializarEstrutura()` no Apps Script para criar/migrar `EquipePascom`; configurar Clerk com e-mail OTP e, opcionalmente, SMS.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/components.md`, `docs/system-flows.md`, `docs/setup-environment.md`, `docs/security-hardening-plan.md`, `docs/mobile-experience.md`, `docs/technical-changelog.md` e `frontend/src/pages/PrivacyPolicy.jsx`.

## 2026-05-29 - Funcionalidades comerciais desktop/mobile

- **Tipo:** produto, backend, frontend, Apps Script e documentacao.
- **Alteracao:** adicionados recuperar pedido por e-mail/codigo, cupons pastorais, pacotes promocionais, compartilhamento controlado e alias publico `/e/:slug`.
- **Motivo:** melhorar conversao e suporte sem login, mantendo regras comerciais centralizadas no backend e experiencia equivalente em desktop/mobile.
- **Impacto:** checkout passa a aceitar `couponCode` e `packageId`; pedido registra `TotalAntesDesconto`, `CupomCodigo`, `DescontoTotal` e `PacoteID`; Apps Script cria/migra `Cupons`, `Pacotes` e `SlugPublico`.
- **Breaking changes:** nenhum contrato publico removido; descontos nao sao empilhados e o backend aplica a melhor condicao valida.
- **Migracoes necessarias:** executar `inicializarEstrutura()` no Apps Script para criar `Cupons`, `Pacotes` e novas colunas comerciais.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/system-flows.md`, `docs/components.md`, `docs/mobile-experience.md`, `docs/technical-changelog.md` e `frontend/src/pages/PrivacyPolicy.jsx`.

## 2026-05-28 - Hardening de seguranca multicamadas

- **Tipo:** seguranca, backend, Apps Script, CI e documentacao.
- **Alteracao:** chamadas Apps Script -> backend passam a aceitar HMAC com timestamp, webhook Mercado Pago valida valor/moeda antes da entrega, downloads exigem pedido pago e item comprado, logs estruturados foram ampliados, CI foi criado e docs de hardening/incidente foram adicionadas.
- **Motivo:** reduzir spoofing, IDOR, divergencia financeira, abuso de worker e conhecimento operacional implicito.
- **Impacto:** contratos publicos de checkout, galeria e download permanecem estaveis; producao deve configurar `APPS_SCRIPT_HMAC_SECRET` e manter fallback legado somente durante migracao.
- **Breaking changes:** nenhum imediato enquanto `ALLOW_LEGACY_WORKER_SECRET=true`; apos desligar fallback, Apps Script sem HMAC sera rejeitado.
- **Migracoes necessarias:** configurar `APPS_SCRIPT_HMAC_SECRET` na Vercel e nas propriedades Apps Script; revisar `ALLOW_LEGACY_WORKER_SECRET`.
- **CI/CD:** workflow inicial usa `npm install` porque os `package-lock.json` locais nao sao versionados neste MVP.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/security-hardening-plan.md`, `docs/security-incident-response.md`, `docs/apis.md`, `docs/setup-environment.md`, `docs/system-flows.md`, `docs/technical-audit.md`, `docs/technical-roadmap.md`, `docs/technical-changelog.md`.

## 2026-05-28 - Evento, galeria e calendario mobile completos

- **Tipo:** frontend, mobile e documentacao.
- **Alteracao:** a entrada do evento mobile, a pagina interna da galeria, o lightbox e a aba calendario foram refinados para seguir o HTML standalone `(2)`, com hero completo, grade 2x/3x/4x, card de preco/WhatsApp, lightbox escuro com contador e calendario navegavel.
- **Motivo:** pedido de fidelidade visual e funcional ao prototipo aprovado para o fluxo de galeria do evento e para a aba de calendario.
- **Impacto:** somente experiencia mobile; desktop, backend, APIs, checkout, pagamentos, downloads e banco permanecem inalterados.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/components.md`, `docs/technical-changelog.md`.

## 2026-05-28 - Refinamento dos cards e galeria mobile

- **Tipo:** `fix/frontend`
- **Responsavel:** Codex
- **Alteracao:** card mobile ajustado para reproduzir o visual aprovado da imagem/standalone: capa no topo, pill do sacramento, contador de fotos, data como `24 DE MAIO DE 2026`, titulo com `&`, local e resumo no rodape; a tela interna de galeria recebeu classes dedicadas para preservar o mesmo padrao visual mobile.
- **Motivo:** pedido de fidelidade visual para a pagina inicial mobile, aba de galerias e pagina interna da galeria.
- **Impacto:** somente apresentacao mobile; desktop, APIs, checkout, backend, pagamentos e banco permanecem inalterados.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/components.md`, `docs/technical-changelog.md`.

## 2026-05-28 - Cards mobile fieis ao standalone

- **Tipo:** `fix/frontend`
- **Responsavel:** Codex
- **Alteracao:** cards de eventos da home mobile e de `/buscar` passam a usar estrutura visual dedicada inspirada no standalone `(2)`, com capa grande, badges superiores, titulo serifado e metadados abaixo.
- **Motivo:** alinhar as telas iniciais mobile ao layout aprovado no HTML standalone e corrigir a apresentacao de nomes como `Casamento de Ana & Pedro`.
- **Impacto:** apenas apresentacao mobile; `ev.titulo`, busca, ordenacao, rotas, desktop, APIs, checkout, backend e banco permanecem inalterados.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/components.md`, `docs/technical-changelog.md`.

## 2026-05-28 - Correcoes de contraste no modo escuro mobile

- **Tipo:** `fix/frontend`
- **Responsavel:** Codex
- **Alteracao:** ajustes no CSS mobile para corrigir contraste no modo escuro em buscas, chips de sacramento, `section-purple`, tiles de agenda, cart bar, atalhos Pascom e aviso LGPD do checkout.
- **Motivo:** alguns elementos portados do HTML standalone usavam estilos inline com `var(--brand)`; no modo escuro esse token vira branco, causando estados branco-sobre-branco.
- **Impacto:** experiencia mobile escura fica mais legivel sem alterar desktop, rotas, APIs, checkout, banco ou comportamento do toggle.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Documentos afetados:** `docs/mobile-experience.md`, `docs/components.md`, `docs/technical-changelog.md`.

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
