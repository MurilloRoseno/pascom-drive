# Changelog Tecnico

## 2026-09-20 - Entrega garantida: conciliacao com o Mercado Pago e reenvio pelo painel

- **Tipo:** backend, Apps Script, frontend Pascom e documentacao.
- **Alteracao:** novo `backend/lib/order-fulfillment.js`, unico caminho de entrega, usado pelo webhook, pela conciliacao automatica e pelo painel. Nova rota interna `POST /api/automacao/entregas`, chamada pelo novo `google-apps-script/Entregas.js` no fim de cada ciclo do gatilho de 5 minutos: confere pendentes no Mercado Pago por `external_reference`, entrega pedido pago sem link, tenta o e-mail de novo (3 vezes: 5, 20 e 60 minutos) e roda `auditarConsistenciaComercial()`, que ate entao nao tinha chamador. Aviso ao `ADMIN_EMAIL` pelo `MailApp`, no maximo um por dia. Aba Pedidos com "Precisam de atencao", "Reenviar entrega" e "Conferir no Mercado Pago". Links de download passaram de 24 h / 2 usos para 7 dias / 5 usos, e reemitir passou a atualizar a mesma linha de `Downloads` (revoga o link anterior em vez de acumular linhas). `VERSAO_WEBAPP` = 5.
- **Motivo:** sem webhook nao havia nenhuma conferencia com o Mercado Pago, entao um pagamento aprovado podia ficar "Pendente" para sempre; o e-mail tinha uma unica tentativa; e o painel nao mostrava nada disso (`deliveryIssues` contava `emailStatus === "erro"`, valor que o codigo nunca grava).
- **Impacto:** pedido pago que nao chegou aparece no painel e, na maioria dos casos, se resolve sozinho em ate 5 minutos. Reenviar a entrega invalida os links antigos do comprador. Pedido pago ha mais de 72 horas nao tem reenvio automatico.
- **Breaking changes:** nenhum. Colunas novas em `Pedidos` (`EntregaTentativas`, `EntregaProximaEm`) sao criadas automaticamente.
- **Migracoes necessarias:** `npm run push:production` e publicar nova versao do Web App (versao 5). `ADMIN_EMAIL` precisa estar nas propriedades do Apps Script para o aviso de entrega.
- **Responsavel:** Claude.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/system-flows.md`, `docs/setup-environment.md`, `google-apps-script/DEPLOY.md` e `docs/technical-changelog.md`.

## 2026-09-19 - Processamento em fatias, quarentena e troca de capa pelo painel

- **Tipo:** Apps Script, backend, frontend Pascom e documentacao.
- **Alteracao:** novo `Processamento.js`. O processamento de eventos passa a rodar em fatias de ate `4,5 min retomadas pelo gatilho, sempre com o mesmo `EventoID` da pasta (sem linhas duplicadas em `Eventos` ao reprocessar). `Fotos.ArquivoOrigemID` evita duplicar foto quando a execucao morre no meio. Cada foto tem ate 3 tentativas (contador na descricao do arquivo) antes de ir para `_FALHAS`. O painel ganhou "Tentar de novo", "Descartar as fotos com falha", correcao de nome de pasta em quarentena e troca de capa (fila `PedidosProcessamento` executada pelo gatilho). `liberarEspaco` chamado pelo painel usa orcamento de 18 s. `VERSAO_WEBAPP` = 4.
- **Motivo:** eventos grandes (300+ fotos) passavam do limite de 6 min e ficavam presos em `Processando`; reprocessar duplicava o evento; uma foto ruim mandava a pasta inteira para a quarentena; a capa nao podia ser trocada.
- **Impacto:** evento grande leva varios ciclos de 5 minutos, com progresso visivel. A capa antiga vira foto a venda com marca d’agua. Rotulos das etapas do evento nao se sobrepoem mais em telas estreitas.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** `npm run push:production` e publicar nova versao do Web App (versao 4). Colunas e abas novas sao criadas automaticamente.
- **Responsavel:** Claude.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/system-flows.md`, `google-apps-script/DEPLOY.md` e `docs/technical-changelog.md`.

## 2026-09-19 - Saude do sistema e espaco no Drive pelo Painel Pascom

- **Tipo:** frontend Pascom, backend, Apps Script e documentacao.
- **Alteracao:** nova aba "Sistema" com checklist de producao (variaveis da Vercel por presenca, abas da planilha, Web App e sua versao, gatilho de 5 minutos, ultima execucao, propriedades e pastas do Apps Script, quarentena e envios abertos), uso do Drive com divisao por pasta e projecao de eventos, lista de pastas `_ERRO_` e liberacao de espaco de eventos arquivados. Novo `Sistema.js` (acoes `diagnostico`, `estimarLiberacao` e `liberarEspaco`), registro `ULTIMA_EXECUCAO` em `processarEventos`, alerta diario por e-mail acima de 85% de uso e `notificarAdministracao` com e-mail opcional. `VERSAO_WEBAPP`/`VERSAO_WEBAPP_ESPERADA` detectam implantacao antiga. Eventos com espaco liberado nao podem ser publicados nem vendidos de novo. O acesso ao Drive do backend passou a aceitar `GOOGLE_PRIVATE_KEY_B64`, como a planilha.
- **Motivo:** permitir o go-live sabendo o que falta configurar e evitar que os 15 GB gratuitos do Drive acabem.
- **Impacto:** downloads de fotos compradas continuam funcionando depois da liberacao (originais vendidos ficam). Arquivos vao para a lixeira do Drive e a cota so volta apos 30 dias ou ao esvaziar a lixeira.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** `npm run push:production` no Apps Script, publicar nova versao do Web App e configurar `ADMIN_EMAIL`. As colunas novas (`EspacoLiberacao`, `EspacoLiberadoEm`, `EspacoLiberadoBytes` em `Eventos` e `ArquivosLiberados` em `Fotos`) sao criadas automaticamente.
- **Responsavel:** Claude.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/system-flows.md`, `docs/setup-environment.md`, `google-apps-script/DEPLOY.md` e `docs/technical-changelog.md`.

## 2026-09-19 - Gestao de eventos pelo Painel Pascom

- **Tipo:** frontend Pascom, backend, Apps Script, seguranca e documentacao.
- **Alteracao:** nova aba "Eventos", que passa a ser a aba padrao do painel: acompanha envios na fila e o processamento, mostra a revisao das fotos, publica, libera ou pausa a venda, define a visibilidade, gera ou revoga o codigo (exibido uma unica vez), compartilha, edita dados seguros e arquiva. As acoes do menu da planilha foram extraidas para funcoes por `EventoID` em `Sheet.js` (o menu continua como invólucro) e expostas pelo novo `EventAdmin.js` no mesmo Web App assinado, com `LockService` e a aba `AuditoriaPascom`. Publicar agora exige processamento concluido. Tokens de midia ganharam a marca `admin` (1 h), que libera previas de rascunhos apenas para rotas `/api/pascom/*`. O painel foi reorganizado em `EventsTab`, `UploadTab` e `OrdersTab`.
- **Motivo:** fechar o ciclo envio → venda sem abrir a planilha e sem depender de selecionar a linha certa.
- **Impacto:** a previa de um evento nao publicado continua 404 para o publico; o comportamento de galerias publicadas nao mudou. A pagina de pedidos manteve o mesmo comportamento.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** `npm run push:production` no Apps Script e publicar uma nova versao da implantacao do Web App.
- **Responsavel:** Claude.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/system-flows.md`, `google-apps-script/DEPLOY.md` e `docs/technical-changelog.md`.

## 2026-09-19 - Envio de fotos pelo Painel Pascom

- **Tipo:** frontend Pascom, backend, Apps Script, seguranca e documentacao.
- **Alteracao:** nova aba "Enviar fotos" no Painel Pascom. O membro cria o evento por formulario, seleciona as fotos, escolhe a capa e envia direto ao Google Drive por upload retomavel (pedacos de 8 MB, 3 simultaneos, retomada apos falha ou fechamento da aba). O novo Web App `google-apps-script/Upload.js`, assinado por HMAC, cria a pasta `_ENVIANDO__...`, abre as sessoes como dono do Drive, finaliza ou cancela e limpa envios abandonados apos 48 h. Tambem foram criadas as rotas `/api/pascom/uploads/*`, o limitador `uploadsPascom` e a aba `EnviosPascom`, e `https://www.googleapis.com` entrou no `connect-src` da CSP.
- **Motivo:** tirar a equipe da operacao manual no Drive (nome de pasta exato, renomear capa) mantendo custo zero: a Vercel nao recebe os bytes e o armazenamento continua nos 15 GB da conta Google da Pascom.
- **Impacto:** `listarEventosNovos()` passa a ignorar pastas `_ENVIANDO__`; processamento, venda e entrega nao mudaram. Pastas criadas manualmente no Drive continuam funcionando.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** implantar o Apps Script como App da Web e cadastrar `UPLOAD_WEBAPP_URL` na Vercel (ver `google-apps-script/DEPLOY.md`).
- **Responsavel:** Claude.
- **Documentos afetados:** `docs/apis.md`, `docs/database.md`, `docs/setup-environment.md`, `docs/system-flows.md`, `google-apps-script/DEPLOY.md` e `docs/technical-changelog.md`.

## 2026-05-30 - Login Pascom centralizado

- **Tipo:** frontend, autenticacao visual e documentacao.
- **Alteracao:** tela deslogada da area `/pascom` removeu o card informativo lateral, centralizou o componente `SignIn` do Clerk e aplicou `appearance` para ocultar o rodape/branding de desenvolvimento do componente na area Pascom.
- **Motivo:** deixar a entrada operacional mais limpa e com foco no login da equipe.
- **Impacto:** somente apresentacao do login Pascom; fluxo Clerk, allowlist `EquipePascom`, APIs protegidas, compradores, checkout e downloads permanecem inalterados.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/components.md` e `docs/technical-changelog.md`.

## 2026-05-30 - Compartilhamento por plataforma

- **Tipo:** frontend compartilhado, desktop/mobile e documentacao.
- **Alteracao:** criado helper `eventShare` para montar URL publica, texto e link de WhatsApp Web; desktop agora abre WhatsApp Web em nova aba e mobile/tablet usa Web Share API com fallback para copiar o link.
- **Motivo:** alinhar o botao `Compartilhar evento` ao comportamento esperado por plataforma, evitando divergencia entre desktop e mobile.
- **Impacto:** somente interface de compartilhamento; eventos protegidos continuam exigindo codigo e nenhum contrato de API, checkout, pagamento, download ou banco foi alterado.
- **Breaking changes:** nenhum.
- **Migracoes necessarias:** nenhuma.
- **Responsavel:** Codex.
- **Documentos afetados:** `docs/system-flows.md`, `docs/mobile-experience.md`, `docs/components.md` e `docs/technical-changelog.md`.

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
