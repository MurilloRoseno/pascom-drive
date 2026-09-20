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
| `EspacoLiberacao` | Vazio, `parcial` ou `concluida`: arquivos do evento arquivado mandados para a lixeira pelo Painel Pascom. Preenchido bloqueia publicar e liberar venda. |
| `EspacoLiberadoEm` | Última execução de "Liberar espaço" |
| `EspacoLiberadoBytes` | Total de bytes mandados para a lixeira (acumulado entre execuções parciais) |

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
| `ArquivoOrigemID` | ID do arquivo de entrada que gerou a foto. Na retomada de um processamento interrompido, evita registrar a mesma foto duas vezes. |
| `ArquivosLiberados` | `SIM` quando prévia e miniatura (e o original, se a foto nunca foi vendida) foram para a lixeira. Os IDs continuam gravados para auditoria. |

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
| `EmailStatus` | `enviado`, `falhou`, `nao_configurado` ou `pendente` (pagamento confirmado com a entrega ainda por fazer) |
| `EmailErro` | Erro de envio |
| `EmailUltimaTentativaEm` | Última tentativa |
| `WhatsAppLink` | Link assistido de entrega |
| `EntregaTentativas` | Tentativas de e-mail ja feitas (volta a zero quando o e-mail sai) |
| `EntregaProximaEm` | Quando a conciliacao pode tentar de novo (5, 20 e 60 minutos); vazio na terceira falha |

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
| `ExpiraEm` | Expiração (7 dias a partir da emissao) |
| `UsosMaximos` | Limite de uso (5) |
| `Usos` | Usos atuais |
| `CriadoEm` | Criação |
| `UltimoUsoEm` | Último download |

Ha no maximo uma linha por `PedidoID` + `FotoID`: reemitir um link (reenvio de entrega, recuperacao pelo comprador ou "gerar links sem e-mail") substitui o `TokenHash` da mesma linha, o que revoga o link anterior e zera `Usos`.

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
## `PedidosProcessamento`

Fila de operações lentas pedidas pelo Painel Pascom e executadas pelo gatilho de 5 minutos (hoje: `trocarCapa`). Criada automaticamente.

| Campo | Descrição |
| --- | --- |
| `PedidoID` | Identificador (`PP_<timestamp>`) |
| `Quando` / `Quem` | Data do pedido e membro da equipe |
| `Tipo` | `trocarCapa` |
| `EventoID` / `Alvo` | Evento e foto escolhida |
| `Status` | `pendente`, `executando`, `concluido` ou `erro` |
| `Detalhe` / `ConcluidoEm` | Resultado ou mensagem de erro, e quando terminou |

Tentativas de processamento de cada foto ficam na descrição do próprio arquivo no Drive (`pascom:tentativas=N`). Na 3ª falha, o arquivo vai para a subpasta `_FALHAS` da pasta do evento.

## Propriedades operacionais do Apps Script

Além das configurações (IDs de pastas, segredos), o Apps Script grava estas propriedades de controle:

| Propriedade | Descrição |
| --- | --- |
| `ULTIMA_EXECUCAO` | JSON `{ inicio, fim, resultado, evento, erro }` gravado ao fim de cada `processarEventos` (`ok`, `parcial`, `sem_eventos`, `ocupado` ou `erro`), com `restantes` quando a fatia parou antes do fim. Lido pela aba Sistema. |
| `ALERTA_ESPACO_EM` | Timestamp do último e-mail de alerta de espaço (no máximo um por dia, acima de 85% de uso). |
| `PROCESSING_LOCK` | Trava do evento em processamento (TTL de 10 minutos). |
| `ULTIMA_CONCILIACAO` | JSON `{ quando, verificados, conciliados, entregues, reenviados, parcial, resumo, problemas }` da ultima conferencia de pagamentos (ou `{ quando, erro }`). Guarda no maximo 5 problemas, sem dados do comprador. Lido pela aba Sistema. |
| `ALERTA_ENTREGA_EM` | Timestamp do último e-mail de aviso sobre pedidos pagos sem entrega (no máximo um por dia). |
| `ULTIMA_VARREDURA_MP` | Timestamp da última busca por pagamentos aprovados sem pedido na planilha (no máximo uma por hora). |

## `AuditoriaPascom`

Trilha das ações de gestão de eventos feitas pelo Painel Pascom, gravada por `google-apps-script/EventAdmin.js`. A aba é criada automaticamente na primeira ação.

| Campo | Descrição |
| --- | --- |
| `Quando` | Timestamp ISO |
| `Quem` | E-mail ou telefone do membro autenticado |
| `Acao` | `publicar`, `despublicar`, `autorizarVenda`, `revogarVenda`, `definirVisibilidade`, `gerarCodigo`, `revogarCodigo`, `arquivar`, `editar` ou `liberarEspaco` |
| `EventoID` | Evento afetado |
| `Detalhe` | Versão do código, visibilidade escolhida ou campos editados. O código de acesso em claro nunca é gravado. |

## `EnviosPascom`

Trilha de auditoria dos envios de fotos feitos pelo Painel Pascom, gravada pelo Web App (`google-apps-script/Upload.js`). A aba é criada automaticamente no primeiro envio.

| Campo | Descrição |
| --- | --- |
| `Quando` | Timestamp ISO da etapa |
| `Quem` | E-mail ou telefone do membro autenticado (vazio na limpeza automática) |
| `UploadID` | ID da pasta de envio no Drive |
| `NomePasta` | Nome final `categoria__AAAA-MM-DD__titulo` |
| `Arquivos` | Fotos previstas (`enviando`) ou recebidas (`finalizado`) |
| `Status` | `enviando`, `finalizado`, `cancelado` ou `abandonado` |
| `Detalhe` | Informação complementar, como a capa escolhida |

## `EquipePascom`

Aba de autorização operacional da equipe Pascom. Clerk autentica a identidade; esta aba decide quem pode acessar o painel.

| Campo | Descrição |
| --- | --- |
| `Identificador` | E-mail em minúsculas ou telefone normalizado com DDI/DDD |
| `Tipo` | `email` ou `phone` |
| `Nome` | Nome exibido no painel |
| `Role` | `admin` no MVP |
| `Ativo` | `SIM` ou `NAO` |
| `CriadoEm` | Data de cadastro operacional |
| `UltimoAcessoEm` | Atualizado pelo backend ao autorizar acesso |

Risco: Sheets não é banco transacional; para V2, roles granulares e auditoria administrativa devem migrar para banco relacional.
