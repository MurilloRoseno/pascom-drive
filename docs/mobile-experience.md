# Experiência Mobile Dedicada

## Objetivo

A experiência mobile/tablet do Pascom Drive foi refeita para usar como base fiel o arquivo standalone `C:\Users\muril\Downloads\Pascom Drive _standalone_ (1).html`, gerado a partir do projeto de design mobile.

A regra arquitetural atual é:

- **Desktop:** continua usando a experiência original em `frontend/src/desktop/DesktopApp.jsx`.
- **Mobile/tablet:** usa a experiência própria em `frontend/src/mobile/MobileApp.jsx`, portada do layout interno do HTML standalone.

O mobile não é uma versão responsiva do desktop. Ele segue o desenho app-like da referência: app bar alta, navegação inferior, seções litúrgicas, cards visuais, galeria touch-first, lightbox fullscreen, carrinho em bottom sheet e checkout vertical.

## Origem Visual

A referência visual ativa é o HTML standalone:

```text
C:\Users\muril\Downloads\Pascom Drive _standalone_ (1).html
```

O modo escuro mobile usa como referência visual específica o bloco `.app.dark` do HTML:

```text
C:\Users\muril\Downloads\Pascom Drive _standalone_ (2).html
```

Elementos preservados da referência:

- tokens de cor, tipografia, espaçamento e superfícies;
- estrutura `app`, `appbar`, `scroll`, `section`, `card`, `botnav`, `sheet`, `wm` e `cart-bar`;
- linguagem visual paroquial com roxo, dourado, ornamentos e textura institucional;
- fluxo de home, galerias, calendário completo, evento, galeria de fotos, lightbox, carrinho, checkout, retorno de pagamento e perfil/Pascom;
- comportamento app-like com bottom navigation e bottom sheet.
- modo escuro acionado pelo botão de tema no appbar, com fundo grafite, superfícies elevadas, texto branco, acentos dourados e overrides próprios para cards, botões, inputs, tags, appbar e botnav.
- os ajustes de contraste do modo escuro devem tratar elementos mobile com estilos inline do standalone (`mobile-search-card`, `sacramento-chip`, `section-purple`, `agenda-date-tile`, `cart-bar-icon`, `pascom-action-tile`) para evitar estados branco-sobre-branco após a troca de tokens.
- cards de eventos da home e de `/buscar` seguem o padrão visual do standalone `(2)`, com capa grande, badges superiores, data em caixa alta, título serifado, local e rodapé com `Ver fotos ->`; nesses cards, a conjunção ` e ` é exibida como ` & ` apenas na apresentação visual.
- a pagina de entrada do evento mobile e a pagina interna da galeria (`/evento/:eventoId?view=galeria`) seguem a tela completa do standalone `(2)`: hero roxo, capa grande, metadados, bloco de previa protegida, grade com seletor `2x/3x/4x`, card de preco e atalho de WhatsApp.
- o lightbox mobile segue o standalone `(2)`: fundo preto, contador `FOTO 02/9`, controles laterais, previa protegida, texto de entrega sem marca d'agua e botao amarelo de selecao.
- a aba calendario usa a estrutura funcional do standalone `(2)`, com navegacao mensal, marcadores de evento/agenda e lista de destaques vinculada aos eventos reais.
- a moldura de iPhone e o painel `Tweaks` do protótipo não são exibidos no site público.

## Estratégia de Detecção

A detecção ocorre antes e depois do carregamento React:

1. `frontend/index.html` define `data-platform` antes do bundle principal.
2. `frontend/src/shared/platform.js` recalcula plataforma no runtime com user-agent, viewport e ponteiro coarse.
3. `frontend/src/App.jsx` decide entre `DesktopApp` e `MobileApp` usando `React.lazy`.

Critérios principais:

- user-agent de smartphone → `mobile`;
- user-agent de tablet → `tablet`;
- viewport menor que `768px` → `mobile`;
- ponteiro coarse entre `600px` e `1024px` → `tablet`;
- demais casos → `desktop`.

`mobile` e `tablet` carregam a experiência mobile dedicada.

## Organização Atual

```text
frontend/src/
├─ desktop/
│  └─ DesktopApp.jsx
├─ mobile/
│  ├─ MobileApp.jsx
│  ├─ referenceIcons.jsx
│  ├─ referenceUtils.jsx
│  ├─ referencePublicScreens.jsx
│  ├─ referenceFlowScreens.jsx
│  ├─ reference-tokens.css
│  ├─ reference-layout.css
│  ├─ reference-adapter.css
│  └─ reference-gallery-calendar.css
└─ shared/
   ├─ gallery.js
   └─ platform.js
```

## Integração com Dados Reais

O projeto `pascom-drive-mobile` era um protótipo com dados globais/mockados. No Pascom Drive real, a UI foi conectada a:

- `listarEventos` para catálogo publicado;
- `obterEvento` para detalhe do evento;
- `listarFotosEvento` para galeria;
- `validarAcessoGaleria` para galerias protegidas;
- `cotarCheckout` para preço final;
- `criarPagamento` para Checkout Pro Mercado Pago;
- `statusPagamento` para retorno de pagamento;
- `listarOfertasEvento` para pacotes/cupons da galeria;
- `recuperarPedido` para consulta por e-mail/código no perfil público;
- `useFavoritePhotos` para favoritos locais por dispositivo;
- `CarrinhoProvider` e `useCarrinho` para estado compartilhado.

A tradução entre backend e layout fica em `frontend/src/mobile/referenceUtils.jsx`, que converte eventos/fotos reais para o formato visual esperado pela referência.

Funcionalidades existentes no HTML de design que agora possuem integração real: favoritos locais, recuperação de pedidos, pacotes/cupons, compartilhamento de evento e checkout com desconto validado no backend. Permanecem como placeholders inativos até haver backend real: débito virtual CAIXA, upload Pascom, relatórios, moderação e configurações administrativas.

## Fluxo Mobile

```text
Usuário acessa site por celular/tablet
  -> index.html marca data-platform
  -> App carrega MobileApp por lazy import
  -> MobileApp usa BrowserRouter + CarrinhoProvider
  -> Home mostra catálogo real no layout da referência
  -> Evento abre detalhe visual institucional
  -> Evento exibe hero completo, capa, metadados, aviso de previa protegida e grade inicial como no standalone (2)
  -> Galeria protegida solicita código quando necessário
  -> Galeria mostra grade 2x/3x/4x, card de preco/WhatsApp e selecao por foto
  -> Fotos abrem em lightbox fullscreen escuro com contador, setas, aviso protegido e botao de selecao
  -> Usuario pode favoritar fotos localmente e adicionar favoritos ao carrinho
  -> Galeria exibe pacotes/cupons retornados por /api/eventos/:eventoId/ofertas
  -> Carrinho abre como bottom sheet
  -> Checkout usa stepper Identificação/Pagamento e aceita cupom pastoral
  -> Pagamento real redireciona para Mercado Pago
  -> Retorno usa visual de confirmação do standalone e consulta status do pedido
```

## Rotas Institucionais no Mobile

- `/privacidade` e `/politica-de-privacidade` renderizam `PrivacyPolicy` em modo mobile, com scroll próprio dentro da shell app-like.
- O link principal fica em `/perfil`, junto de atendimento e recuperação de pedidos, para manter a bottom navigation focada nos fluxos de compra.
- A política reutiliza a mesma fonte de conteúdo do desktop; apenas layout e espaçamento mudam para evitar divergência documental.

## Funcionalidades Comerciais Mobile

- **Favoritos:** ficam em `localStorage` por evento/foto e sao reconciliados com a galeria real ao abrir o evento.
- **Pacotes:** ofertas retornadas pelo backend podem selecionar todas as fotos do evento ou aplicar pacote por quantidade no carrinho atual.
- **Cupons:** o campo de cupom no checkout mobile altera a cotacao via backend; frontend nunca decide desconto.
- **Recuperar pedido:** a tela `/perfil` publica chama `POST /api/pedidos/recuperar` com e-mail e codigo/pedido.
- **Compartilhar evento:** usa Web Share API quando disponivel; fallback copia o link publico do evento.


## Protecao Discreta de Previas

As telas mobile de evento, galeria e lightbox usam `useDevtoolsGuard` apenas em producao. Quando ha sinal consistente de DevTools aberto, o app adiciona `body.devtools-open`, borra imagens `.photo-blur-target` e mostra aviso discreto.

A protecao nao bloqueia navegacao, carrinho, checkout ou Mercado Pago. Ela reduz captura casual das previas, mas nao substitui marca d'agua, tokens de galeria, downloads assinados e rate limits no backend.

## Performance

- Desktop e mobile permanecem em bundles separados.
- CSS da experiência mobile é carregado apenas quando `MobileApp` é importado.
- A folha `reference-gallery-calendar.css` concentra o refinamento fiel do evento, galeria, lightbox e calendario para evitar espalhar overrides em telas nao relacionadas.
- Imagens de lista usam carregamento preguiçoso.
- O layout mobile evita carregar componentes desktop.
- Arquivos mobile foram divididos para manter manutenção e respeitar limite de 500 linhas por arquivo.

## Riscos e Cuidados

- O layout mobile agora segue o HTML standalone; alterações futuras devem comparar contra `C:\Users\muril\Downloads\Pascom Drive _standalone_ (1).html` antes de mudar visualmente.
- A experiência mobile possui telas próprias, então mudanças de regra no desktop precisam ser refletidas no mobile.
- Placeholders de funcionalidades futuras precisam ser substituídos por integrações reais antes de serem anunciados como disponíveis.
- A detecção por user-agent/viewport não é perfeita; o fallback por viewport reduz erro, mas não elimina casos híbridos.
- Como a aplicação é CSR, SEO continua limitado pelo modelo SPA atual.

## Regra de Manutenção

Toda mudança futura no mobile deve responder:

1. A alteração preserva o layout/base do HTML standalone?
2. A regra de negócio continua centralizada em `lib/`, `context/` ou `shared/`?
3. A documentação e o changelog técnico foram atualizados?
4. O fluxo foi validado em viewport mobile real ou emulação equivalente?
