# Banco de Dados — Google Sheets

## Visão Geral

O banco operacional do MVP é um Google Spreadsheet. As abas são inicializadas e mantidas por `google-apps-script/Sheet.js`. O backend lê e atualiza essas abas via `google-spreadsheet`.

Não há chaves estrangeiras, índices ou transações ACID. A integridade depende de convenções, validações e testes.

## Diagrama Relacional Textual

```text
Eventos (EventoID)
  1 -- N Cupons (EventoID opcional)
  1 -- N Pacotes (EventoID)
  1 ── N Fotos (EventoID)
  1 ── N ItensPedido (EventoID)

Pedidos (PedidoID)
  1 ── N ItensPedido (PedidoID)
  1 ── N Downloads (PedidoID)

Fotos (FotoID)
  1 ── N ItensPedido (FotoID)
  1 ── N Downloads (FotoID)

Webhooks
  referencia PaymentID/ChaveEvento, sem FK formal

RegrasPagamento
  usadas por MeioPagamento no checkout

Cupons/Pacotes
  usados pelo checkout para descontos sem empilhamento
```

## `Eventos`

| Coluna | Significado |
| --- | --- |
| `EventoID` | Identificador público e chave lógica |
| `NomePasta` | Nome original da pasta no Drive |
| `FolderID` | ID da pasta do evento |
| `Titulo` | Título exibido ao usuário |
| `SlugPublico` | Alias publico amigavel para `/e/:slug` |
| `Categoria` | Categoria de evento |
| `DataEvento` | Data do evento |
| `HorarioEvento` | Horário exibido |
| `StatusProcessamento` | Estado do processamento |
| `Visibilidade` | `publica` ou `protegida` |
| `VendaAutorizada` | `SIM`/`NAO` |
| `Publicacao` | `rascunho`, `publicado`, `arquivado` |
| `ProtecaoMenores` | Indica cuidado extra com menores |
| `CodigoHash` | Hash do código de acesso |
| `CodigoVersao` | Versão do código |
| `CodigoGeradoEm` | Quando código foi gerado |
| `CodigoRevogadoEm` | Quando código foi revogado |
| `TotalFotos` | Total detectado |
| `FotosProcessadas` | Quantidade processada |
| `FotosEntregues` | Contador operacional |
| `DataCriacao` | Criação do registro |
| `DataInicio` | Início do processamento |
| `DataConclusao` | Conclusão do processamento |
| `DataPublicacao` | Publicação |
| `Erros` | Último erro relevante |
| `PastaRemovida` | Controle de limpeza do Drive |

## `Fotos`

| Coluna | Significado |
| --- | --- |
| `FotoID` | Identificador da foto |
| `EventoID` | Evento dono |
| `OriginalFileID` | Arquivo original no Drive |
| `PreviewFileID` | Arquivo com marca d'água |
| `ThumbnailFileID` | Miniatura |
| `ThumbnailStatus` | Status da miniatura |
| `ThumbnailGeradaEm` | Timestamp de geração |
| `TipoFoto` | `foto` ou `capa` |
| `StatusProcessamento` | Estado da foto |
| `DisponivelVenda` | `SIM`/`NAO` |
| `PrecoUnitario` | Preço individual |
| `DataProcessamento` | Timestamp do processamento |

## `Pedidos`

| Coluna | Significado |
| --- | --- |
| `PedidoID` | ID interno do pedido |
| `PreferenceID` | Preferência Mercado Pago |
| `PaymentID` | Pagamento Mercado Pago |
| `Status` | Status operacional |
| `Nome` | Nome do comprador |
| `Email` | E-mail do comprador |
| `WhatsApp` | WhatsApp informado |
| `MeioPagamento` | `pix` ou `credit_card` no backend atual |
| `Subtotal` | Soma das fotos |
| `TotalAntesDesconto` | Total original antes de cupom/pacote |
| `CupomCodigo` | Codigo do cupom aplicado, se houver |
| `DescontoTotal` | Valor total abatido |
| `PacoteID` | Pacote comercial aplicado, se houver |
| `TaxaServico` | Taxa de serviço |
| `TaxaComodidade` | Taxa de comodidade |
| `CustoPagamentoEstimado` | Custo estimado do meio |
| `Total` | Total cobrado |
| `TarifaReal` | Tarifa real retornada pelo Mercado Pago |
| `DataCriacao` | Criação do pedido |
| `DataPagamento` | Confirmação de pagamento |
| `EmailEnviadoEm` | Envio bem-sucedido |
| `EmailStatus` | `enviado`, `falhou`, `nao_configurado` |
| `EmailErro` | Erro de envio |
| `EmailUltimaTentativaEm` | Última tentativa |
| `WhatsAppLink` | Link assistido de entrega |

## `ItensPedido`

| Coluna | Significado |
| --- | --- |
| `PedidoID` | Pedido dono |
| `FotoID` | Foto comprada |
| `EventoID` | Evento associado |
| `PrecoUnitario` | Preço usado na compra |

## `Webhooks`

| Coluna | Significado |
| --- | --- |
| `ChaveEvento` | Chave idempotente |
| `PaymentID` | Pagamento relacionado |
| `Tipo` | Tipo de notificação |
| `RecebidoEm` | Recebimento |
| `ProcessadoEm` | Processamento |
| `Status` | `Recebido`, `Processado`, etc. |

## `Downloads`

| Coluna | Significado |
| --- | --- |
| `DownloadID` | ID usado no JWT |
| `PedidoID` | Pedido dono |
| `FotoID` | Foto entregue |
| `OriginalFileID` | Arquivo original no Drive |
| `TokenHash` | Hash do token enviado |
| `FingerprintID` | Identificador forense nao sensivel do download |
| `FingerprintHash` | Hash do identificador forense para auditoria |
| `FingerprintVersao` | Versao do algoritmo aplicado |
| `FingerprintStatus` | `Pendente` ou `Aplicado` |
| `FingerprintAplicadoEm` | Quando a copia fingerprinted foi gerada |
| `ExpiraEm` | Expiração |
| `UsosMaximos` | Limite de uso |
| `Usos` | Usos atuais |
| `CriadoEm` | Criação |
| `UltimoUsoEm` | Último download |

## `RegrasPagamento`

| Coluna | Significado |
| --- | --- |
| `MeioPagamento` | Meio configurado |
| `PercentualEstimado` | Percentual da taxa |
| `ValorFixo` | Valor fixo da taxa |
| `Vigencia` | Vigência informativa |
| `Ativo` | `SIM`/`NAO` |

## `Cupons`

| Coluna | Significado |
| --- | --- |
| `Codigo` | Codigo digitado no checkout |
| `EventoID` | Evento permitido; vazio significa cupom global |
| `TipoDesconto` | `percentual` ou `valor_fixo` |
| `Valor` | Percentual ou valor em reais |
| `Ativo` | `SIM`/`NAO` |
| `ValidoDe` | Inicio da vigencia |
| `ValidoAte` | Fim da vigencia |
| `UsoMaximo` | Limite maximo de usos, quando preenchido |
| `Usos` | Contador operacional incrementado apos pedido criado |
| `Descricao` | Texto publico/operacional da oferta |

## `Pacotes`

| Coluna | Significado |
| --- | --- |
| `PacoteID` | Identificador do pacote |
| `EventoID` | Evento dono da oferta |
| `Tipo` | `all_event_photos`, `quantity_bundle` ou `family_combo` |
| `QuantidadeMinima` | Minimo de fotos exigido para pacote por quantidade |
| `PrecoPacote` | Preco fechado do pacote, quando aplicavel |
| `PercentualDesconto` | Desconto percentual alternativo |
| `Ativo` | `SIM`/`NAO` |
| `Descricao` | Texto mostrado em desktop/mobile |

## Estratégias de Consulta

- Catálogo: leitura de `Eventos` e `Fotos`, filtrando eventos publicados.
- Compra: busca por IDs selecionados em `Fotos`, mapeia eventos por `EventoID`.
- Ofertas: leitura linear de `Cupons` e `Pacotes`, filtrando por evento, vigência, uso e `Ativo=SIM`.
- Pedido: busca linear por `PedidoID`, `PreferenceID` ou `PaymentID`.
- Webhook: busca linear por `ChaveEvento`.
- Download: busca linear por `DownloadID`, valida `TokenHash` e registra uso/fingerprint somente apos gerar a copia protegida.

## Gargalos

- Leituras lineares crescem mal com muitas linhas.
- Google Sheets tem latência maior que banco transacional.
- Escritas concorrentes podem competir em pedidos/webhooks/downloads.
- Não há índices reais.
- Não há transação entre `Pedidos` e `ItensPedido`.
- Contador `Usos` de cupom em Sheets pode sofrer corrida sob compras simultâneas até migrar para banco transacional.

## Melhorias Possíveis

1. Adicionar aba de índices auxiliares se permanecer em Sheets.
2. Migrar pedidos/webhooks/downloads para Postgres quando volume crescer.
3. Manter Sheets apenas como painel editorial de eventos/fotos.
4. Padronizar timezone para `America/Sao_Paulo`.
5. Criar testes de contrato para headers das abas.
6. Adicionar validação de integridade periódica.

## Riscos de Escalabilidade

- Webhooks simultâneos podem gerar corrida.
- Pedido criado parcialmente pode exigir rotina de reconciliação.
- Catálogo grande aumenta tempo de resposta sem cache.
- Operação manual no Sheets pode quebrar headers ou valores esperados.
