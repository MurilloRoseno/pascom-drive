# Fluxo Comercial Seguro - Pascom Drive

## Entrada No Drive

A Pascom cria uma pasta dentro de `Fotos_Origem` usando:

```text
{categoria}__{AAAA-MM-DD}__{titulo}
casamento__2026-05-20__joao-e-maria
```

Categorias aceitas: `celebracoes`, `batismo`, `eucaristia`, `crisma`, `casamento`, `uncao-dos-enfermos` e `ordem`.

O Apps Script processa fotos imediatamente para original privado, thumbnail leve e preview com marca d'agua. Todo evento novo nasce oculto com `Publicacao=rascunho`, `Visibilidade=protegida` e `VendaAutorizada=NAO`. Nomes invalidos ficam pendentes de configuracao e nunca sao publicados automaticamente.

Para escolher a imagem do card e do cabecalho do evento, inclua na pasta uma imagem chamada exatamente `capa` com extensao de imagem, por exemplo `capa.jpg`. Ela e tratada como imagem editorial publica: recebe reducao para ate `1280px`, nao recebe marca d'agua e nunca e liberada para venda. Use nessa capa somente uma imagem autorizada para exposicao publica. As demais imagens continuam como previews protegidas com marca d'agua.

## Onde Fica A Foto Original

A aba `Fotos` possui colunas antigas e novas porque a planilha foi migrada sem perder historico:

| Coluna | Uso Atual |
| --- | --- |
| `OriginalFileID` | ID privado do original, usado apenas pelo backend depois da compra aprovada. Deve estar preenchido nas fotos novas. |
| `PreviewFileID` | ID da amostra com marca d'agua exibida no site. |
| `ThumbnailFileID` | ID da miniatura leve usada nas grades de cards/fotos. |
| `ThumbnailStatus` / `ThumbnailGeradaEm` | Controle operacional da geracao ou migracao de miniaturas. |
| `TipoFoto` | `foto` para item vendavel ou `capa` para a imagem editorial publica sem marca d'agua. |
| `Link_Amostra` | Compatibilidade visual com linhas antigas; pode continuar preenchido. |
| `Link_Original` | Campo legado. Em fotos novas deve ficar vazio de proposito. |

Nao crie nem preencha `Link_Original` para as fotos novas. Um link permanente do original permitiria acesso fora do checkout e quebraria a protecao comercial. Quando houver uma compra aprovada, o backend usa `OriginalFileID` para gerar um download temporario registrado em `Downloads`.

## Abas Da Planilha

Execute `inicializarEstrutura()` no Apps Script antes da estreia. A funcao cria ou amplia:

- `Eventos`: configuracao editorial, visibilidade, autorizacao comercial e hash do codigo.
- `Fotos`: apenas IDs privados e previews processados, preco unitario e disponibilidade de venda.
- `Pedidos` e `ItensPedido`: snapshot de comprador, taxas, itens cobrados e status da entrega por e-mail.
- `Webhooks`: idempotencia persistida das notificacoes Mercado Pago.
- `Downloads`: autorizacoes temporarias, expiracao e limite de usos.
- `RegrasPagamento`: taxas estimadas ativas por meio de pagamento.

Ao executar `inicializarEstrutura()`, as colunas com opcoes controladas recebem listas suspensas. Se a planilha atual tiver somente `Fotos` e `Eventos`, execute esta funcao novamente depois de copiar a versao mais recente do Apps Script para criar as abas comerciais que faltam. Como o projeto Apps Script e independente da planilha, a confirmacao aparece em `Registro de execucao`, e nao em uma caixa de dialogo.

Se uma atualizacao anterior tiver deixado validacao `SIM/NAO` em coluna de data ou status (por exemplo, erro em `DataInicio`), a versao atual de `inicializarEstrutura()` remove as validacoes antigas das abas administradas e reaplica somente as listas corretas, sem apagar os dados.

Se o processamento ja falhou antes dessa correcao, atualize `Sheet.gs` e `Watermark.gs`, execute `inicializarEstrutura()` e recoloque a pasta em fila: uma pasta renomeada para `_ERRO_*` deve voltar ao formato `{categoria}__{AAAA-MM-DD}__{titulo}`. Caso a versao anterior tenha enviado a foto de origem para a lixeira antes de registrar sua linha, restaure ou adicione novamente essa foto na pasta do evento antes de executar `processarEventos()`.

Se uma linha existente ficou com o carimbo de quarentena no nome, por exemplo `_202605261456`, copie tambem `EventQueue.gs` e execute `normalizarMetadadosEventos()`. O script remove o carimbo de `NomePasta` e recompõe `Titulo`, `Categoria` e `DataEvento` sem mexer em publicacao ou venda.

Eventos existentes permanecem conservadoramente em rascunho/protegidos/sem venda ate revisao manual.

### Miniaturas E Performance

Novas fotos geram dois derivados: `ThumbnailFileID` para a grade (`480px`) e `PreviewFileID` para a ampliacao (`1280px`). Originais permanecem privados e nao sao usados na navegacao publica.

Para fotos antigas sem `ThumbnailFileID`, execute `reprocessarMiniaturasEmLote()`. A funcao parte da previa ja protegida, gera versoes mais leves sem duplicar a marca d'agua, atualiza somente os campos derivados e preserva preco, venda e original. Depois da atualizacao confirmada na planilha, a previa pesada substituida e movida para a lixeira. O lote padrao e de `5` fotos; use a propriedade `THUMBNAIL_BATCH_SIZE` apenas se precisar ajustar o tempo de execucao.

Configure `THUMBNAILS_FOLDER_ID` nas propriedades do Apps Script apontando para uma pasta privada `Miniaturas`. `AMOSTRAS_FOLDER_ID` passa a concentrar as previews para ampliacao e `THUMBNAILS_FOLDER_ID` guarda somente imagens leves da grade. O fallback para `AMOSTRAS` existe apenas para compatibilidade enquanto a nova pasta ainda nao tiver sido configurada.

### Inicio Limpo Antes Da Estreia

Se todas as linhas atuais forem apenas testes, use a funcao protegida `reiniciarDadosParaEstreia()` em vez de excluir celulas manualmente:

1. Em `Configuracoes do projeto > Propriedades do script`, crie `CONFIRMAR_RESET_INICIAL` com valor `APAGAR_DADOS_DE_TESTE`.
2. Execute `reiniciarDadosParaEstreia()`.
3. Confira no registro a mensagem de conclusao. A propriedade de confirmacao e removida automaticamente.
4. Execute `inicializarEstrutura()` e `criarTriggers()`.

O reset remove dados das abas `Eventos`, `Fotos`, `Pedidos`, `ItensPedido`, `Webhooks`, `Downloads` e `RegrasPagamento`, mantendo apenas os cabecalhos novos e as listas suspensas. Ele nao apaga arquivos que ja tenham sido gerados no Drive. Se uma pasta de entrada de teste ja foi processada e removida, crie novamente a pasta em `Fotos_Origem` com as fotos para que o evento seja cadastrado na base limpa.

## Opcoes Da Aba Eventos

| Coluna | Valores Permitidos | Efeito |
| --- | --- | --- |
| `Categoria` | `celebracoes`, `batismo`, `eucaristia`, `crisma`, `casamento`, `uncao-dos-enfermos`, `ordem` | Define filtro e agrupamento no site. |
| `DataEvento` | data no formato `AAAA-MM-DD`, por exemplo `2026-05-26` | Define a data da celebracao exibida no site. |
| `HorarioEvento` | hora no formato `HH:mm`, por exemplo `15:32` | Exibe `26 de maio de 2026 as 15:32`; deixe vazio para `Horario a confirmar`. |
| `StatusProcessamento` | preenchido pelo script, normalmente `Pendente`, `Processando`, `Processado` ou `Erro` | Indica se previews e originais foram preparados. |
| `Visibilidade` | `publica` ou `protegida` | `publica` abre previews sem codigo; `protegida` exige codigo valido. |
| `VendaAutorizada` | `SIM` ou `NAO` | Autoriza checkout; o script sincroniza esse valor para as fotos no proximo processamento ou por execucao manual. |
| `Publicacao` | `rascunho`, `publicado` ou `arquivado` | Somente `publicado` aparece no site. |
| `ProtecaoMenores` | `SIM` ou `NAO` | Com `SIM`, o evento deve continuar `protegida`. |

Nao edite `CodigoHash` manualmente. Em galerias protegidas, execute `gerarCodigoEventoSelecionado()` conforme as instrucoes abaixo; somente o hash fica salvo na planilha.

`DataPublicacao` nao e o horario do evento: ela e preenchida pelo script ao publicar e registra quando a galeria entrou no ar. Para o horario da celebracao, use somente `HorarioEvento`.

## Liberacao Administrativa

O projeto atual do Apps Script e independente da planilha. Por isso ele nao possui menu dentro do Google Sheets, e a administracao principal deve ser feita diretamente nas colunas com lista suspensa da aba `Eventos`:

1. Valide categoria, data, autorizacao de imagem e eventual protecao de menores.
2. Escolha `Visibilidade=publica` somente para galerias adequadas a acesso publico; use `protegida` nos demais casos.
3. Preencha `VendaAutorizada=SIM` somente com autorizacao comercial confirmada, ou `NAO` para manter apenas visualizacao.
4. Execute `sincronizarConfiguracoesAdministrativas()` ou aguarde o proximo trigger `processarEventos`, para refletir `VendaAutorizada` em `DisponivelVenda` na aba `Fotos`.
5. Troque `Publicacao` para `publicado` para tornar o evento visivel no site; use `arquivado` para retira-lo do ar.

Galerias com menores devem permanecer protegidas e demandam revisao expressa antes de publicacao e venda.

Para gerar ou revogar codigo em uma galeria protegida:

1. Copie o valor da coluna `EventoID` da linha desejada.
2. Em `Propriedades do script`, defina `ADMIN_EVENTO_ID` com esse valor.
3. Execute `gerarCodigoEventoSelecionado()` e anote imediatamente o codigo exibido no `Registro de execucao`, ou execute `revogarCodigoEventoSelecionado()` para bloquear o codigo existente.
4. Exclua `ADMIN_EVENTO_ID` ao concluir para evitar agir no evento errado no futuro.

### Fazer Uma Pasta Processada Aparecer No Site

Depois que a linha do evento estiver com `StatusProcessamento=Processado`:

1. Confira `Titulo`, `Categoria`, `DataEvento` e preencha `HorarioEvento` se o horario ja for conhecido.
2. Para uma galeria aberta, escolha `Visibilidade=publica`; para galeria privada, escolha `Visibilidade=protegida` e gere o codigo.
3. Escolha `VendaAutorizada=SIM` para fotos comercializaveis, ou `NAO` para apenas exibir a galeria.
4. Execute `sincronizarConfiguracoesAdministrativas()` para liberar imediatamente as fotos autorizadas; o trigger tambem executa esta sincronizacao automaticamente.
5. Escolha `Publicacao=publicado` ou execute `publicarEventoSelecionado()`. Usando as funcoes administrativas, o cache do site e invalidado imediatamente; alteracoes diretas na planilha sao refletidas na proxima sincronizacao automatica.

Para retirar um evento do ar, escolha `Publicacao=arquivado`. Para manter o evento visivel sem compra, escolha `VendaAutorizada=NAO` e execute a sincronizacao.

O site nao possui catalogo demonstrativo: home, busca, atividades e galeria mostram somente eventos publicados na aba `Eventos` e fotos processadas na aba `Fotos`.

As imagens exibidas nao usam link publico permanente do Drive. Para galerias `publica`, a API transmite a amostra real com marca d'agua por uma URL interna do evento. Para galerias `protegida`, a mesma URL so responde enquanto houver uma sessao temporaria valida obtida pelo codigo da galeria. Os originais permanecem privados e sao usados apenas na entrega apos pagamento aprovado.

A API usa cache interno da Vercel somente depois de validar o acesso. Capas editoriais podem receber cache publico por serem deliberadamente publicas; previews comerciais continuam sem cache publico duradouro para que uma galeria alterada para `protegida` interrompa novas entregas nao autorizadas.

A unica excecao intencional e `capa.jpg`: por ser a imagem de divulgacao escolhida pela secretaria, ela e servida publicamente sem marca d'agua e nao aparece na grade compravel.

## Opcoes Da Aba RegrasPagamento

| Coluna | Valores Permitidos | Uso |
| --- | --- | --- |
| `MeioPagamento` | `pix`, `debit_card`, `credit_card` | Forma oferecida no checkout. |
| `PercentualEstimado` | numero decimal | Percentual estimado de tarifa do Mercado Pago. |
| `ValorFixo` | numero decimal | Parcela fixa estimada da tarifa. |
| `Vigencia` | data/texto administrativo | Referencia da tabela cadastrada. |
| `Ativo` | `SIM` ou `NAO` | Somente linhas ativas liberam cotacao daquele meio. |

## Precos E Checkout

- Foto: `R$ 10,00`.
- Taxa de servico: `R$ 2,00` por pedido.
- Taxa de comodidade: `R$ 1,00` por pedido.
- Custo estimado do pagamento: calculado no backend conforme a aba `RegrasPagamento`.

Cadastre em `RegrasPagamento` uma linha ativa por meio (`pix`, `debit_card`, `credit_card`) com percentual e valor fixo obtidos no painel Mercado Pago. Sem regra ativa, o checkout permanece bloqueado.

Para iniciar com as tarifas oficiais confirmadas para Checkout online em liberacao imediata (`D0`), execute `cadastrarRegrasMercadoPagoD0()` no Apps Script. A funcao registra:

| Meio | Percentual | Ativo | Fonte |
| --- | ---: | --- | --- |
| `pix` | `0.99` | `SIM` | Tabela Mercado Pago, vigente a partir de 03/11/2025, Checkout Pix/Open Finance D0. |
| `debit_card` | `4.98` | `SIM` | Estimativa conservadora: mesma tarifa do credito 1x D0 ate confirmar no painel a tarifa especifica do debito virtual. |
| `credit_card` | `4.98` | `SIM` | Tabela Mercado Pago, vigente a partir de 03/11/2025, Checkout cartao de credito 1x D0. |

A tarifa estimada e calculada sobre o valor final cobrado, para que a propria tarifa nao reduza o valor base de fotos e taxas fixas. Se a configuracao da conta Mercado Pago diferir da tabela publica, atualize a aba `RegrasPagamento` antes de aceitar compras.

O frontend nunca envia um total confiavel. O backend valida fotos, evento publicado, venda autorizada, sessao de galeria protegida e recalcula o valor antes de criar a preferencia Checkout Pro.

## Pagamento E Entrega

O Mercado Pago hospeda o pagamento em Checkout Pro. A notificacao assinada e consultada novamente na API antes de qualquer entrega.

Depois da aprovacao:

- O backend gera links temporarios registrados em `Downloads`, com expiracao e limite de uso.
- O backend tenta enviar os links pelo Gmail SMTP autenticado com senha de app, para baixo volume inicial.
- A aba `Pedidos` registra `EmailStatus`, `EmailErro` e `EmailUltimaTentativaEm`; falha no SMTP nao anula o pagamento aprovado.
- A planilha recebe um link de WhatsApp com mensagem pronta para envio assistido pela secretaria, inclusive quando o e-mail falha.

Originais nunca devem ser compartilhados publicamente no Drive, retornados por API de galeria ou inseridos no HTML.

O Gmail pessoal e uma solucao inicial, limitada e sujeita a bloqueio automatizado pelo Google; monitore falhas e migre para um provedor transacional quando o volume ou a confiabilidade exigirem.

## Segredos E Implantacao

Configure somente em variaveis privadas do backend/Vercel:

```text
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
DOWNLOAD_JWT_SECRET
GALLERY_SESSION_SECRET
GALLERY_CODE_SALT
CACHE_INVALIDATION_SECRET
PUBLIC_APP_URL
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_APP_PASSWORD
SMTP_FROM_NAME
SMTP_REPLY_TO
```

Configure `GALLERY_CODE_SALT` tambem nas propriedades privadas do Apps Script, com o mesmo valor usado no backend. Nunca registre tokens, senhas ou codigos abertos em documentos, commits ou planilhas publicas.

Configure `CACHE_INVALIDATION_SECRET` tambem nas propriedades privadas do Apps Script, identico ao valor da Vercel. Ele autentica apenas a invalidacao de cache quando eventos sao publicados, arquivados, protegidos ou reprocessados; nunca o exponha no frontend.

Para a configuracao inicial do Gmail:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=murillo.roseno.lima@gmail.com
SMTP_FROM_NAME=Paroquia Sao Rafael - Fotos
SMTP_REPLY_TO=murillo.roseno.lima@gmail.com
```

Cadastre `SMTP_APP_PASSWORD` apenas como variavel criptografada no Vercel, usando a senha de app do Google sem espacos. Depois de copiar a nova versao do Apps Script, execute `inicializarEstrutura()` novamente para adicionar as colunas de status em `Pedidos` sem apagar as linhas existentes.

Credenciais de teste previamente compartilhadas ou expostas devem ser rotacionadas antes de homologacao compartilhada e obrigatoriamente antes da producao.

## Limite Tecnico

Previews exibidas podem ser capturadas por screenshot. Marca d'agua incorporada, resolucao reduzida, controle de acesso, originais privados e rastreabilidade reduzem abuso, mas nao tornam impossivel a copia do que ja foi mostrado na tela.
