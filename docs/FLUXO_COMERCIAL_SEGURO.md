# Fluxo Comercial Seguro - Pascom Drive

## Entrada No Drive

A Pascom cria uma pasta dentro de `Fotos_Origem` usando:

```text
{categoria}__{AAAA-MM-DD}__{titulo}
casamento__2026-05-20__joao-e-maria
```

Categorias aceitas: `celebracoes`, `batismo`, `eucaristia`, `crisma`, `casamento`, `uncao-dos-enfermos` e `ordem`.

O Apps Script processa fotos imediatamente para original privado e preview com marca d'agua. Todo evento novo nasce oculto com `Publicacao=rascunho`, `Visibilidade=protegida` e `VendaAutorizada=NAO`. Nomes invalidos ficam pendentes de configuracao e nunca sao publicados automaticamente.

## Onde Fica A Foto Original

A aba `Fotos` possui colunas antigas e novas porque a planilha foi migrada sem perder historico:

| Coluna | Uso Atual |
| --- | --- |
| `OriginalFileID` | ID privado do original, usado apenas pelo backend depois da compra aprovada. Deve estar preenchido nas fotos novas. |
| `PreviewFileID` | ID da amostra com marca d'agua exibida no site. |
| `Link_Amostra` | Compatibilidade visual com linhas antigas; pode continuar preenchido. |
| `Link_Original` | Campo legado. Em fotos novas deve ficar vazio de proposito. |

Nao crie nem preencha `Link_Original` para as fotos novas. Um link permanente do original permitiria acesso fora do checkout e quebraria a protecao comercial. Quando houver uma compra aprovada, o backend usa `OriginalFileID` para gerar um download temporario registrado em `Downloads`.

## Abas Da Planilha

Execute `inicializarEstrutura()` no Apps Script antes da estreia. A funcao cria ou amplia:

- `Eventos`: configuracao editorial, visibilidade, autorizacao comercial e hash do codigo.
- `Fotos`: apenas IDs privados e previews processados, preco unitario e disponibilidade de venda.
- `Pedidos` e `ItensPedido`: snapshot de comprador, taxas e itens cobrados.
- `Webhooks`: idempotencia persistida das notificacoes Mercado Pago.
- `Downloads`: autorizacoes temporarias, expiracao e limite de usos.
- `RegrasPagamento`: taxas estimadas ativas por meio de pagamento.

Ao executar `inicializarEstrutura()`, as colunas com opcoes controladas recebem listas suspensas. Se a planilha atual tiver somente `Fotos` e `Eventos`, execute esta funcao novamente depois de copiar a versao mais recente do Apps Script para criar as abas comerciais que faltam. Como o projeto Apps Script e independente da planilha, a confirmacao aparece em `Registro de execucao`, e nao em uma caixa de dialogo.

Eventos existentes permanecem conservadoramente em rascunho/protegidos/sem venda ate revisao manual.

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
| `StatusProcessamento` | preenchido pelo script, normalmente `Pendente`, `Processando`, `Processado` ou `Erro` | Indica se previews e originais foram preparados. |
| `Visibilidade` | `publica` ou `protegida` | `publica` abre previews sem codigo; `protegida` exige codigo valido. |
| `VendaAutorizada` | `SIM` ou `NAO` | Autoriza checkout; o script sincroniza esse valor para as fotos no proximo processamento ou por execucao manual. |
| `Publicacao` | `rascunho`, `publicado` ou `arquivado` | Somente `publicado` aparece no site. |
| `ProtecaoMenores` | `SIM` ou `NAO` | Com `SIM`, o evento deve continuar `protegida`. |

Nao edite `CodigoHash` manualmente. Em galerias protegidas, execute `gerarCodigoEventoSelecionado()` conforme as instrucoes abaixo; somente o hash fica salvo na planilha.

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

1. Confira `Titulo`, `Categoria` e `DataEvento`.
2. Para uma galeria aberta, escolha `Visibilidade=publica`; para galeria privada, escolha `Visibilidade=protegida` e gere o codigo.
3. Escolha `VendaAutorizada=SIM` para fotos comercializaveis, ou `NAO` para apenas exibir a galeria.
4. Execute `sincronizarConfiguracoesAdministrativas()` para liberar imediatamente as fotos autorizadas; o trigger tambem executa esta sincronizacao automaticamente.
5. Escolha `Publicacao=publicado`. O card surgira na home e na busca assim que a API consultar a planilha atualizada.

Para retirar um evento do ar, escolha `Publicacao=arquivado`. Para manter o evento visivel sem compra, escolha `VendaAutorizada=NAO` e execute a sincronizacao.

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

O frontend nunca envia um total confiavel. O backend valida fotos, evento publicado, venda autorizada, sessao de galeria protegida e recalcula o valor antes de criar a preferencia Checkout Pro.

## Pagamento E Entrega

O Mercado Pago hospeda o pagamento em Checkout Pro. A notificacao assinada e consultada novamente na API antes de qualquer entrega.

Depois da aprovacao:

- O backend gera links temporarios registrados em `Downloads`, com expiracao e limite de uso.
- O Resend envia os links por e-mail automaticamente.
- A planilha recebe um link de WhatsApp com mensagem pronta para envio assistido pela secretaria.

Originais nunca devem ser compartilhados publicamente no Drive, retornados por API de galeria ou inseridos no HTML.

## Segredos E Implantacao

Configure somente em variaveis privadas do backend/Vercel:

```text
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
DOWNLOAD_JWT_SECRET
GALLERY_SESSION_SECRET
GALLERY_CODE_SALT
RESEND_API_KEY
DELIVERY_FROM_EMAIL
PUBLIC_APP_URL
```

Configure `GALLERY_CODE_SALT` tambem nas propriedades privadas do Apps Script, com o mesmo valor usado no backend. Nunca registre tokens, senhas ou codigos abertos em documentos, commits ou planilhas publicas.

Credenciais de teste previamente compartilhadas ou expostas devem ser rotacionadas antes de homologacao compartilhada e obrigatoriamente antes da producao.

## Limite Tecnico

Previews exibidas podem ser capturadas por screenshot. Marca d'agua incorporada, resolucao reduzida, controle de acesso, originais privados e rastreabilidade reduzem abuso, mas nao tornam impossivel a copia do que ja foi mostrado na tela.
