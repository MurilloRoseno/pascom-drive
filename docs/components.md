# Documentação de Componentes

## Visão Geral

O frontend atual é uma SPA React com duas experiências: desktop original e mobile/tablet dedicada. A estrutura favorece simplicidade: estado global apenas para carrinho, busca em páginas e contratos HTTP concentrados em `frontend/src/lib/api.js`.

## `App`

- **Arquivo:** `frontend/src/App.jsx`
- **Responsabilidade:** detectar plataforma e carregar desktop ou mobile por `React.lazy`.
- **Hooks:** `useState`, `useEffect`.
- **Melhoria:** manter a deteccao em `shared/platform.js` para nao duplicar regras.

## `DesktopApp`

- **Arquivo:** `frontend/src/desktop/DesktopApp.jsx`
- **Responsabilidade:** preservar a experiencia desktop original.
- **Observacao:** importa CSS desktop e paginas existentes.

## `MobileApp`

- **Arquivo:** `frontend/src/mobile/MobileApp.jsx`
- **Responsabilidade:** orquestrar a experiencia mobile/tablet portada do HTML standalone `Pascom Drive _standalone_ (1).html`, com app bar, bottom nav, calendario completo, galeria touch-first, lightbox, carrinho sheet, checkout em stepper, perfil/Pascom e modo escuro copiado do bloco `.app.dark` de `Pascom Drive _standalone_ (2).html`.
- **Dependencias:** APIs compartilhadas, `CarrinhoProvider`, `useCarrinho`, `checkoutSchema`, helpers de galeria e `useDevtoolsGuard` nas telas de galeria.
- **Componentes internos:** `referencePublicScreens.jsx`, `referenceFlowScreens.jsx`, `referenceUtils.jsx`, `referenceIcons.jsx`, CSS `reference-*` e `reference-gallery-calendar.css`.
- **Modo escuro:** `className="app dark"` troca tokens e classes auxiliares corrigem contraste de estilos inline herdados do standalone, incluindo buscas, chips de sacramento, agenda, cart bar e atalhos Pascom.
- **Cards mobile:** `EventCard`, `formatMobileCardTitle` e `formatMobileCardDate` em `referencePublicScreens.jsx` renderizam os cards da home e de `/buscar` no padrão do standalone `(2)`: capa grande, badges superiores, data em caixa alta, título serifado, local e rodapé `Ver fotos ->`; a troca ` e ` -> ` & ` é display-only e não altera `ev.titulo`.
- **Evento/galeria mobile:** `EventoScreen`, `GaleriaFotosScreen` e `FotoLightboxScreen` usam `reference-gallery-calendar.css` para reproduzir a tela completa do standalone `(2)`: hero roxo, capa, metadados, bloco de previa protegida, grid com seletor `2x/3x/4x`, card de preco/WhatsApp e lightbox fullscreen escuro com contador e selecao.
- **Calendario mobile:** `CalendarioScreen` em `referencePublicScreens.jsx` implementa navegacao mensal, dias marcados por eventos reais e lista de destaques, mantendo a aba de calendario funcional no padrao visual do standalone.
- **Riscos:** precisa acompanhar novas rotas/regras implementadas no desktop, preservar URLs `mt` retornadas pela API e substituir placeholders do standalone quando houver backend real.

## `useDevtoolsGuard`

- **Arquivo:** `frontend/src/shared/devtoolsGuard.js`
- **Responsabilidade:** aplicar protecao discreta contra inspecao casual de previas nas galerias.
- **Props/opcoes:** `enabled`, alem de opcoes internas de teste para producao, threshold e intervalo.
- **Dependencias:** `useEffect`, `useState`, `window`, `document.body.classList`.
- **Estado interno:** `isDevtoolsOpen`, contadores de histerese para abertura/fechamento.
- **Hooks:** `useEffect`, `useState`.
- **Fluxo:** em producao, mede diferenca entre viewport externa/interna; apos duas leituras suspeitas adiciona `body.devtools-open`; apos tres leituras limpas remove a classe.
- **Problemas:** deteccao por viewport pode ter falso positivo com janelas estreitas, por isso a resposta e apenas visual e reversivel.
- **Melhoria:** manter como antifraude leve; nao transformar em DRM ou bloqueio agressivo.
- **Risco futuro:** qualquer tentativa de travar navegador ou bloquear checkout prejudica suporte, acessibilidade e confianca.

## `Desktop Layout Interno`

- **Arquivo:** `frontend/src/desktop/DesktopApp.jsx`
- **Responsabilidade:** compor providers, layout, rotas e carrinho global.
- **Props:** nenhuma.
- **Dependencias:** `react-router-dom`, `CarrinhoProvider`, `Header`, `Footer`, `ScrollToTop`, `CartSummary`, paginas.
- **Estado interno:** nenhum.
- **Hooks:** `useLocation` no helper `LegacyCategoryRedirect`.
- **Fluxo:** monta `BrowserRouter`, envolve tudo com `CarrinhoProvider`, renderiza rotas publicas, `CartSummary`, rotas comerciais e footer.
- **Problemas:** `CartSummary` fica entre dois blocos de `Routes`, o que funciona mas aumenta surpresa para novos devs.
- **Melhoria:** separar `AppLayout` com outlet se migrar para configuracao declarativa.
- **Risco futuro:** novas rotas podem duplicar layout se nao houver convencao clara.

## `CarrinhoProvider` e `useCarrinhoContext`

- **Arquivo:** `frontend/src/context/CarrinhoContext.jsx`
- **Responsabilidade:** manter fotos selecionadas no carrinho.
- **Props:** `children`, `initialFotos`.
- **Dependências:** `createContext`, `useContext`, `useReducer`, `PropTypes`.
- **Estado interno:** array `fotos`.
- **Hooks:** `useReducer`, `useContext`.
- **Fluxo:** reducer trata `add` e `remove`; provider expõe `fotos`, `addFoto`, `removeFoto`, `isSelected`.
- **Problemas:** carrinho não persiste ao recarregar página.
- **Melhoria:** persistir em `sessionStorage` com versionamento simples.
- **Risco futuro:** objetos de foto podem ficar obsoletos se disponibilidade mudar no backend.

## `useCarrinho`

- **Arquivo:** `frontend/src/hooks/useCarrinho.js`
- **Responsabilidade:** hook público para acessar contexto de carrinho.
- **Props:** nenhuma.
- **Dependências:** `useCarrinhoContext`.
- **Estado interno:** nenhum.
- **Hooks:** `useCarrinhoContext`.
- **Fluxo:** delega direto ao contexto.
- **Problemas:** camada fina; existe para ergonomia.
- **Melhoria:** manter como API estável do carrinho.
- **Risco futuro:** adicionar lógica aqui sem testes pode gerar comportamento divergente.

## `Header`

- **Arquivo:** `frontend/src/components/layout/Header.jsx`
- **Responsabilidade:** navegação principal e identidade visual.
- **Props:** nenhuma.
- **Dependências:** `Link`, `useLocation`.
- **Estado interno:** nenhum.
- **Hooks:** `useLocation`.
- **Fluxo:** marca item Eventos como ativo em `/buscar` e `/evento/*`.
- **Problemas:** navegação é hardcoded.
- **Melhoria:** extrair lista de links se crescer.
- **Risco futuro:** rotas novas podem não refletir estado ativo correto.

## `Footer`

- **Arquivo:** `frontend/src/components/layout/Footer.jsx`
- **Responsabilidade:** rodapé institucional, links e marca.
- **Props:** nenhuma.
- **Dependências:** `Link`.
- **Estado interno:** nenhum.
- **Hooks:** nenhum.
- **Problemas:** conteúdo institucional está hardcoded.
- **Melhoria:** mover textos para configuração se houver multi-paróquia.
- **Risco futuro:** duplicar links com header.

## `ScrollToTop`

- **Arquivo:** `frontend/src/components/layout/ScrollToTop.jsx`
- **Responsabilidade:** restaurar scroll ao trocar de rota.
- **Props:** nenhuma.
- **Dependências:** `useLocation`.
- **Estado interno:** nenhum.
- **Hooks:** `useEffect`, `useLocation`.
- **Fluxo:** observa `pathname` e chama `window.scrollTo(0, 0)`.
- **Problemas:** não preserva scroll em volta de busca.
- **Melhoria:** aplicar exceções se UX exigir.
- **Risco futuro:** pode incomodar em páginas com filtros avançados.

## `CartSummary`

- **Arquivo:** `frontend/src/components/CartSummary.jsx`
- **Responsabilidade:** mostrar resumo sticky do carrinho e levar ao checkout.
- **Props:** nenhuma.
- **Dependências:** `useCarrinho`, `useNavigate`, `useLocation`.
- **Estado interno:** nenhum.
- **Hooks:** `useCarrinho`, `useNavigate`, `useLocation`.
- **Fluxo:** se carrinho vazio ou rota `/checkout`, não renderiza; caso contrário mostra quantidade e CTA.
- **Problemas:** soma não aparece no componente atual, apenas quantidade.
- **Melhoria:** mostrar subtotal estimado se preços forem confiáveis no frontend.
- **Risco futuro:** checkout recalcula no backend; qualquer total visual deve ser tratado como estimativa.

## `PhotoCard`

- **Arquivo:** `frontend/src/components/PhotoCard.jsx`
- **Responsabilidade:** exibir preview de foto e botão de seleção.
- **Props:** `foto`, `event`.
- **Dependências:** `PropTypes`, `useCarrinho`.
- **Estado interno:** nenhum.
- **Hooks:** `useCarrinho`.
- **Fluxo:** identifica seleção, permite adicionar/remover quando venda está autorizada e foto disponível.
- **Problemas:** depende de shape de `foto` vindo do backend; falhas de dados podem quebrar UX.
- **Melhoria:** normalizar foto em camada de API ou função de mapeamento.
- **Risco futuro:** regras de disponibilidade podem crescer e deixar o componente acoplado ao domínio.

## `HomePage`

- **Arquivo:** `frontend/src/pages/Home.jsx`
- **Responsabilidade:** landing page com busca, categorias e eventos recentes.
- **Props:** nenhuma.
- **Dependências:** `listarEventos`, `scheduleLabel`, `categories`, React Router.
- **Estado interno:** `q`, `events`, `eventsLoading`.
- **Hooks:** `useState`, `useEffect`, `useNavigate`.
- **Fluxo:** carrega eventos publicados, mostra skeletons e permite buscar navegando para `/buscar`.
- **Problemas:** componente grande e contém subcomponentes internos (`Ornament`, `EventCard`, skeletons).
- **Melhoria:** extrair cards/skeletons quando houver reutilização.
- **Risco futuro:** home pode virar página monolítica se novas seções forem adicionadas.

## `SearchPage`

- **Arquivo:** `frontend/src/pages/Search.jsx`
- **Responsabilidade:** busca/listagem filtrada de eventos.
- **Props:** nenhuma.
- **Dependências:** `listarEventos`, `categories`, `categoryLabel`, `scheduleLabel`.
- **Estado interno:** `form`, `events`, `loadError`, `loading`.
- **Hooks:** `useState`, `useEffect`, `useMemo`, `useSearchParams`.
- **Fluxo:** lê filtros da URL, carrega eventos e renderiza cards.
- **Problemas:** filtros são simples e dependem de query string manual.
- **Melhoria:** centralizar parsing/build de filtros.
- **Risco futuro:** filtros adicionais podem aumentar duplicação com `HomePage`.

## `EventPage`

- **Arquivo:** `frontend/src/pages/Event.jsx`
- **Responsabilidade:** mostrar galeria de um evento e controlar acesso protegido.
- **Props:** nenhuma.
- **Dependências:** `obterEvento`, `listarFotosEvento`, `validarAcessoGaleria`, `useDevtoolsGuard`, carrinho.
- **Estado interno:** `event`, `photos`, `code`, `error`, `loading`, controle de foto atual.
- **Hooks:** `useState`, `useEffect`, `useCallback`, `useRef`, `useParams`, `useSearchParams`.
- **Fluxo:** carrega evento, tenta fotos com token, exibe formulário de código se protegido e renderiza fotos compráveis.
- **Problemas:** lida com busca, autorização, navegação de foto e compra no mesmo componente.
- **Melhoria:** extrair hook `useEventGallery` e componente de bloqueio protegido.
- **Risco futuro:** qualquer mudança em regras de acesso pode gerar regressão ampla.

## `CheckoutPage`

- **Arquivo:** `frontend/src/pages/Checkout.jsx`
- **Responsabilidade:** coletar comprador, cotar carrinho e iniciar Mercado Pago.
- **Props:** nenhuma.
- **Dependências:** `checkoutSchema`, `cotarCheckout`, `criarPagamento`, carrinho.
- **Estado interno:** comprador, método, pricing, erros e loading.
- **Hooks:** `useState`, `useEffect`, `useCallback`.
- **Fluxo:** monta tokens por evento, cota ao alterar carrinho/método, valida formulário e redireciona para `checkoutUrl`.
- **Problemas:** depende de `sessionStorage` para tokens de galeria.
- **Melhoria:** abstrair coleta de tokens em util testado.
- **Risco futuro:** inconsistência entre validação frontend e backend se schemas divergirem.

## `PaymentReturnPage`

- **Arquivo:** `frontend/src/pages/PaymentReturn.jsx`
- **Responsabilidade:** mostrar status após retorno do Mercado Pago.
- **Props:** nenhuma.
- **Dependências:** `statusPagamento`, `Link`, params/query.
- **Estado interno:** `order`, `error`.
- **Hooks:** `useState`, `useEffect`, `useParams`, `useSearchParams`.
- **Fluxo:** lê `pedidoId`, consulta backend e exibe mensagem de sucesso/pendência/erro.
- **Problemas:** retorno depende de query param; se ausente, tem pouco contexto.
- **Melhoria:** oferecer busca por e-mail/pedido em operação futura.
- **Risco futuro:** Mercado Pago pode retornar parâmetros diferentes por fluxo.

## `PrivacyPolicy`

- **Arquivo:** `frontend/src/pages/PrivacyPolicy.jsx`
- **Responsabilidade:** publicar a Política de Privacidade do Pascom Drive nas rotas `/privacidade` e `/politica-de-privacidade`, com conteúdo único para desktop e mobile.
- **Props:** `mobile` controla ajustes de layout e scroll quando renderizado dentro da experiência app-like mobile.
- **Dependências:** `react-router-dom`, CSS próprio `frontend/src/pages/privacy-policy.css`.
- **Estado interno:** nenhum.
- **Hooks:** nenhum.
- **Fluxo:** renderiza hero institucional, índice, seções LGPD, compartilhamento, retenção, direitos do titular e compromisso pastoral com privacidade.
- **Problemas:** conteúdo jurídico/pastoral depende de revisão humana periódica para refletir práticas reais e obrigações legais vigentes.
- **Melhoria:** criar rotina anual de revisão com responsável pastoral/jurídico e incluir data formal de aprovação.
- **Risco futuro:** mudanças em checkout, downloads, fornecedores ou coleta de dados podem deixar a política desatualizada se o changelog documental não for seguido.

## Componentes Reutilizáveis

- `Header`, `Footer`, `ScrollToTop`, `CartSummary`, `PhotoCard`, `PrivacyPolicy`.
- Subcomponentes internos de `HomePage` e `SearchPage` são candidatos a reutilização, mas ainda não justificam extração agressiva.

## Componentes Acoplados

- `EventPage` é acoplado a acesso de galeria, carrinho, API e UI de fotos.
- `CheckoutPage` é acoplado a carrinho, validação, tokens e Mercado Pago.
- `HomePage` é acoplado ao design institucional.

## Candidatos à Refatoração

1. `EventPage`: extrair hook de carregamento/acesso.
2. `CheckoutPage`: extrair hook de cotação/pagamento.
3. `HomePage`: extrair cards e skeletons se crescer.
4. Cliente API: tratar respostas sem JSON para evitar erro secundário em falhas HTML/proxy.
