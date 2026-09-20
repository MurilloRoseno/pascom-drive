# Fluxos do Sistema

## Jornada do Usuário Comprador

```text
Cliente
  -> index.html detecta desktop/mobile/tablet
  -> React carrega DesktopApp ou MobileApp
  -> acessa /
  -> busca evento em /buscar
  -> abre /evento/:eventoId
  -> informa código se galeria protegida
  -> seleciona fotos
  -> revisa carrinho
  -> preenche checkout
  -> paga no Mercado Pago
  -> retorna para /pagamento/:resultado
  -> recebe links seguros por e-mail ou WhatsApp assistido
```

Em smartphones e tablets, a jornada usa a interface dedicada mobile portada do HTML standalone, com navegação inferior, calendário completo, perfil/Pascom, carrinho em bottom sheet, checkout em duas etapas e lightbox fullscreen.

Recuperação de pedidos por e-mail/código, cupons, pacotes e compartilhamento controlado já possuem integração real. Funcionalidades que ainda permanecem como placeholders inativos: débito virtual CAIXA, upload Pascom, relatórios e moderação.

## Fluxo de Política de Privacidade

```text
Usuário
  -> acessa /privacidade ou /politica-de-privacidade
  -> React carrega DesktopApp ou MobileApp conforme plataforma
  -> PrivacyPolicy renderiza a mesma política canônica
  -> usuário consulta dados coletados, finalidades, direitos e contato
```

Detalhes operacionais:

- A rota é pública e não chama APIs backend.
- No desktop, o acesso fica disponível no rodapé institucional.
- No mobile, o acesso fica na tela `/perfil`, sem poluir a navegação inferior principal.
- O conteúdo descreve Google Sheets/Drive, Mercado Pago, Vercel, WhatsApp, SMTP/e-mail, galerias protegidas, downloads e logs técnicos.
- Qualquer alteração futura em coleta, pagamento, entrega, fornecedores ou retenção deve atualizar a política e o changelog técnico.

## Fluxo de Envio de Fotos pelo Painel Pascom

1. Membro da Pascom abre a aba "Enviar fotos" em `/pascom` (no mobile, em `/perfil` → Pascom).
2. Preenche categoria, data e título; o painel mostra o nome da pasta `categoria__AAAA-MM-DD__titulo`.
3. Seleciona as fotos (JPG/PNG até 40 MB; HEIC é recusado com orientação) e toca numa foto para marcá-la como capa.
4. O backend chama o Web App `criarEvento`, que cria `_ENVIANDO__<nome>` em `Fotos_Origem`. O prefixo faz `listarEventosNovos()` ignorar a pasta enquanto o envio está em andamento.
5. Em lotes de 20, o Web App abre sessões de upload retomável como dono do Drive (`criarSessoes`).
6. O navegador envia cada foto direto para o Drive em pedaços de 8 MB, 3 fotos por vez, retomando do último byte confirmado após falhas. O estado fica em `localStorage` para retomar depois de fechar a aba, selecionando as mesmas fotos.
7. `finalizar` confere a contagem, renomeia a capa para `capa.<ext>` e remove o prefixo; o trigger de 5 minutos processa o evento normalmente.
8. Envios abertos há mais de 48 h vão para a lixeira via `limparEnviosAbandonados()`. Cada etapa é registrada na aba `EnviosPascom`.

## Fluxo de Gestão de Eventos pelo Painel Pascom

1. A aba "Eventos" (padrão do painel) lista envios na fila, eventos em processamento, para revisar, publicados e arquivados. Enquanto houver fila ou processamento, a lista se atualiza a cada 30 segundos com a aba visível.
2. Ao selecionar um evento, o painel mostra as etapas (Enviado → Processando → Revisar → Publicado → À venda), avisos e a grade de revisão com prévias com marca d’água, inclusive de rascunhos (token de mídia de administração).
3. Cada botão vem com `acoes` calculadas por `backend/lib/event-rules.js`; indisponíveis mostram o motivo. Ações que mudam o que o público vê pedem confirmação.
4. O backend repassa a ação assinada ao Web App; `EventAdmin.js` executa a mesma função do menu da planilha sob `LockService`, grava `AuditoriaPascom` e invalida o cache do site.
5. "Gerar código" devolve o código em claro uma única vez, exibido num diálogo para a equipe anotar; a planilha guarda só o hash.
6. O menu "Pascom Drive" da planilha continua disponível como alternativa.

## Fluxo de Entrega Garantida (pagou, recebe)

1. **Caminho normal:** o webhook do Mercado Pago confirma o pagamento e `entregarPedidoPago` (`backend/lib/order-fulfillment.js`) emite os links, manda o e-mail e grava o link assistido de WhatsApp.
2. **Se a entrega quebrar depois do pagamento confirmado** (segredo ausente, Drive fora do ar), o pedido fica com `EmailStatus=pendente` e o webhook responde `EntregaPendente` em vez de perder o servico.
3. **A cada 5 minutos**, o gatilho do Apps Script chama `POST /api/automacao/entregas` (assinada) com o tempo que sobrou do ciclo. A varredura:
   - confere no Mercado Pago os pendentes de 10 minutos a 72 horas (`Payment.search` por `external_reference`) e entrega os que ja foram aprovados;
   - entrega os pedidos pagos que ficaram sem nenhum link;
   - tenta de novo o e-mail que falhou, ate 3 vezes, esperando 5, 20 e 60 minutos;
   - uma vez por hora, procura pagamento aprovado sem linha em `Pedidos` (so reporta: sem a linha nao da para saber quais fotos foram compradas);
   - roda `auditarConsistenciaComercial()`.
4. **Aviso:** na terceira falha, o Apps Script manda e-mail para `ADMIN_EMAIL` pelo `MailApp` — canal independente do SMTP, que pode ser justamente o que quebrou — no maximo um por dia.
5. **No painel**, a aba Pedidos abre com "Precisam de atencao" e dois botoes: **Reenviar entrega** (links novos + e-mail, revogando os anteriores) e **Conferir no Mercado Pago**.
6. **Reenvio automatico so vale para pedido pago nas ultimas 72 horas** e para `EmailStatus` `falhou` ou `pendente`: em pedido antigo, ou quando o SMTP nunca foi configurado, reemitir revogaria um link que ja pode estar com o comprador, entao o painel apenas avisa.

## Fluxo de Processamento em Fatias

1. A cada 5 minutos, `processarEventos` escolhe uma pasta de `Fotos_Origem`, dando prioridade a eventos já em `Pendente`/`Processando` (retomadas).
2. `resolverEventoDaPasta` reaproveita a linha de `Eventos` com o mesmo `FolderID`; só uma pasta nunca vista ganha `EventoID` novo. Isso vale também para pastas que voltam da quarentena.
3. `processarFatia` processa fotos por até `4,5 minutos (limite de 6 min do Apps Script) e para. O progresso (`FotosProcessadas`) é gravado a cada 5 fotos; o próximo ciclo continua de onde parou. Fotos já registradas (`ArquivoOrigemID`) não são reprocessadas.
4. Foto que falha é tentada de novo nos ciclos seguintes; na 3ª falha vai para `_FALHAS` e não prende o resto.
5. Sem arquivos pendentes: sem falhas, o evento fica `Processado` e a pasta vai para a lixeira; com falhas, fica `Erro` e a pasta é renomeada `_ERRO_...`. As fotos boas já estão prontas e o evento pode ser publicado.
6. No painel: "Tentar de novo" devolve `_FALHAS` para a fila; "Descartar as fotos com falha" conclui o evento; na aba Sistema, pastas com nome fora do padrão podem ser corrigidas por formulário.
7. Troca de capa: o painel enfileira; no fim do ciclo, com tempo sobrando, o gatilho gera a nova capa sem marca a partir do original, transforma a capa antiga em foto à venda com marca d’água e manda os derivados antigos para a lixeira.

## Fluxo de Saúde do Sistema e Espaço no Drive

1. Ao abrir o Painel Pascom, uma verificação (sem polling) consulta `GET /api/pascom/sistema`. Se houver itens que impedem vendas, a aba "Sistema" mostra o selo "Sistema · N erros".
2. A aba "Sistema" agrupa o checklist em Pagamentos, Planilha e Drive, Envio pelo painel, Automação, Entregas, Galerias e Site. Erros já vêm com a orientação aberta; itens em ordem ficam recolhidos.
3. O processamento automático grava `ULTIMA_EXECUCAO` a cada ciclo e, acima de 85% de uso do Drive, envia um e-mail para `ADMIN_EMAIL` (no máximo um por dia). Envios abandonados também avisam por e-mail.
4. Política de espaço: só eventos **arquivados** podem liberar espaço. Saem as prévias e miniaturas de todas as fotos e os originais das fotos sem pedido ativo. Originais de fotos em pedidos confirmados, pendentes ou divergentes ficam, porque o download pago lê `Fotos.OriginalFileID`. Pedido aguardando pagamento há menos de 48 horas bloqueia a liberação.
5. O painel mostra a estimativa, exige digitar o nome do evento e chama `liberarEspaco`, que roda sob `LockService` e grava `AuditoriaPascom`. Os arquivos vão para a lixeira do Drive (30 dias); a cota só volta depois disso ou ao esvaziar a lixeira manualmente. Se o tempo do Apps Script acabar, o evento fica `parcial` e a ação continua de onde parou.
6. Depois de liberado, o evento não pode ser publicado nem ter a venda liberada de novo.

## Fluxo de Publicação de Evento

1. Operador cria pasta de evento em `SOURCE_FOLDER_ID` (manualmente no Drive ou pelo envio do Painel Pascom).
2. Apps Script `processarEventos()` roda por trigger.
3. `listarEventosNovos()` identifica pasta ainda não registrada.
4. `registrarEvento()` cria linha na aba `Eventos`.
5. Fotos são processadas por `processarFoto()`.
6. Originais vão para pasta de originais.
7. Previews/thumbnails são gerados via backend e salvos no Drive.
8. Aba `Fotos` recebe IDs dos derivados.
9. Operador revisa e publica/libera a venda pela aba "Eventos" do Painel Pascom (ou pelo menu da planilha).
10. Apps Script invalida cache do site quando necessário.

## Fluxo de Galeria Pública

1. Frontend chama `GET /api/eventos/:eventoId`.
2. Backend lê catálogo publicado do Sheets.
3. Se evento existe e está publicado, retorna dados seguros.
4. Frontend chama `GET /api/eventos/:eventoId/fotos`.
5. Backend retorna fotos `Processada`, não capa e disponíveis conforme regra.
6. Usuário adiciona fotos ao carrinho.

## Fluxo de Galeria Protegida

1. Frontend tenta carregar fotos sem token.
2. Backend identifica `visibility=protegida`.
3. Backend retorna `401` com indicação de proteção.
4. Usuário informa código.
5. Frontend chama `POST /api/eventos/:eventoId/acesso`.
6. Backend compara código com `CodigoHash`.
7. Se válido, emite token assinado com expiração.
8. Frontend salva token em `sessionStorage`.
9. Próximas chamadas usam `X-Gallery-Token`.

## Fluxo de Tokens Temporarios de Midia

1. Frontend chama `GET /api/eventos/:eventoId/fotos` com permissao de galeria ja validada.
2. Backend retorna `previewUrl` e `thumbnailUrl` com `mt` assinado por evento, foto e variante.
3. O token de midia expira em 10 minutos e nao substitui o token de galeria ou o pagamento.
4. `GET /api/eventos/:eventoId/previews/:fotoId` valida `mt`; o fallback `token` de galeria segue temporariamente aceito.
5. Capas editoriais continuam publicas/cacheaveis; fotos vendaveis continuam `private, no-store`.
6. `mediaAbuseGuard` bloqueia padroes massivos por IP/evento/variante com `429`, sem afetar checkout/pagamento.

## Fluxo de Protecao Discreta contra DevTools

1. Em producao, paginas de evento/galeria/lightbox ativam `useDevtoolsGuard`.
2. O guard mede diferencas entre viewport externa e interna em intervalo leve.
3. Duas leituras suspeitas adicionam `body.devtools-open`.
4. CSS borra elementos `.photo-blur-target` e a UI mostra aviso discreto.
5. Tres leituras limpas removem a classe e restauram as previas.
6. O fluxo nao bloqueia checkout, APIs, Mercado Pago, navegacao ou downloads autorizados.

Esta protecao e antifraude leve contra captura casual, nao DRM. A seguranca real continua em marca d'agua, tokens assinados, download controlado e rate limit.

## Fluxo de Checkout

1. Carrinho possui uma ou mais fotos.
2. `CheckoutPage` coleta tokens por evento protegido.
3. Frontend envia `couponCode` e/ou `packageId` quando o usuario escolhe oferta.
4. Frontend chama `POST /api/checkout/quote`.
5. Backend valida payload e permissoes.
6. Backend le fotos, regras de pagamento, cupons e pacotes no Sheets.
7. Backend recalcula preco, nao empilha descontos e aplica a melhor condicao valida.
8. Usuario preenche nome, e-mail e WhatsApp.
9. Frontend valida com Zod.
10. Frontend chama `POST /api/checkout/preference` com os mesmos dados comerciais.
11. Backend registra `Pedidos`, `ItensPedido`, `CupomCodigo`, `DescontoTotal`, `PacoteID` e `TotalAntesDesconto`.
12. Backend cria preferencia no Mercado Pago.
13. Frontend redireciona para `checkoutUrl`.

## Fluxo de Cupons e Pacotes

1. Galeria chama `GET /api/eventos/:eventoId/ofertas`.
2. Backend filtra `Cupons` e `Pacotes` ativos, vigentes e aplicaveis ao evento.
3. Frontend mostra sugestoes como `Levar todas`, `Combo familia`, `3 fotos com desconto` e chips de cupom.
4. Usuario seleciona pacote ou digita cupom no checkout.
5. Backend valida evento, quantidade minima, vigencia, uso maximo e disponibilidade das fotos.
6. Se cupom e pacote forem aplicaveis ao mesmo tempo, o backend compara condicoes e aplica apenas uma.
7. Pedido salva o desconto aplicado para auditoria financeira e reconciliacao do webhook.

## Fluxo de Recuperacao de Pedido

1. Usuario abre `Recuperar pedido` no desktop ou a area publica de `/perfil` no mobile.
2. Informa e-mail e `pedidoId`/codigo do pedido.
3. Frontend chama `POST /api/pedidos/recuperar`.
4. Backend aplica rate limit, valida payload e busca pedido por ID.
5. E-mail informado deve bater com o e-mail salvo no pedido.
6. Se o pedido estiver aprovado, backend regenera/retorna links seguros de download e mensagem assistida de WhatsApp.
7. Se estiver pendente ou consultavel, a UI mostra status e orienta acompanhamento.

## Fluxo de Compartilhamento Controlado

1. Usuario toca em `Compartilhar evento`.
2. O helper `eventShare` monta a URL publica preferindo `/e/:slug`; se nao houver slug, usa `/evento/:eventoId`.
3. Desktop abre `https://web.whatsapp.com/send?text=...` em nova aba, com a mensagem `Veja esta galeria da Paroquia Sao Rafael: {titulo} {url}` ja preenchida.
4. Mobile/tablet usa `navigator.share({ title, text, url })` para abrir a folha nativa de compartilhamento; se a API estiver indisponivel ou falhar, copia o link publico para a area de transferencia.
5. Evento protegido continua exigindo codigo de galeria; o link bonito nao libera fotos nem downloads.
6. Metadados de compartilhamento devem usar titulo, capa editorial/thumbnail e descricao segura, sem expor originais.

## Nota de Compatibilidade do Checkout

O fluxo anterior sem cupons/pacotes foi substituido pelo fluxo acima. O alias legado `POST /api/criar-pagamento` continua apontando para `POST /api/checkout/preference`, mas usa as mesmas regras comerciais centralizadas.

## Fluxo Mercado Pago

```text
Mercado Pago
  -> POST /api/webhook/mercado-pago
  -> validarAssinaturaWebhook()
  -> registrarWebhookSeNovo()
  -> consultarPagamento()
  -> buscarPedidoByPreferenceOrPayment()
  -> validar valor, moeda BRL e pedido esperado
  -> atualizarPedidoPagamento()
  -> criarDownloadsDoPedido()
  -> enviarEmailEntrega()
  -> registrarEntrega()
  -> finalizarWebhook()
```

Pontos críticos:

- webhook precisa ser idempotente;
- assinatura HMAC é obrigatória;
- pagamento aprovado, valor correto e moeda `BRL` são condições obrigatórias para entrega;
- divergência vira `PagamentoDivergente` e não cria downloads;
- falha de e-mail não deve apagar pedido nem download.

## Fluxo de Download

1. Apos pagamento aprovado, backend cria registros na aba `Downloads`.
2. Cada registro recebe `DownloadID`, `TokenHash`, expiracao, limite de uso e `FingerprintID` por pedido/foto/download.
3. Link contem JWT assinado com `downloadId` e `exp`.
4. Cliente acessa `GET /api/download?token=...`.
5. Backend valida assinatura e expiracao do JWT.
6. Backend compara hash do token com Sheets e exige pedido confirmado + item comprado sem consumir uso ainda.
7. Backend baixa original privado do Drive.
8. Backend gera copia full-res com fingerprint forense invisivel e metadados tecnicos.
9. Somente apos a copia ser gerada, incrementa `Usos` e registra status/versao/aplicacao do fingerprint.
10. Se a geracao falhar, retorna `503` e nao consome o token.

## Fluxo de Processamento de Imagem

1. Apps Script recebe arquivo do Drive.
2. Assina a chamada interna com `x-pascom-timestamp` e `x-pascom-signature`.
3. Chama `/api/preprocess` para reduzir/converter quando necessário.
4. Chama `/api/watermark` para foto comum ou `/api/cover-preview` para capa.
5. Backend valida HMAC, timestamp e janela maxima de 5 minutos.
6. Watermark de fotos vendaveis usa logo/grade/texto `AMOSTRA`, seed deterministico e metadados de restricao.
7. Backend usa Google Drive API para baixar arquivo.
8. Backend usa Sharp para resize/composicao.
9. Apps Script salva derivado no Drive.
10. Apps Script atualiza `PreviewFileID`, `ThumbnailFileID` e status no Sheets.

## Fluxos de Erro

| Fluxo | Falha | Comportamento esperado |
| --- | --- | --- |
| Catálogo | Sheets indisponível | API deve retornar erro tratado; frontend mostra estado vazio/erro |
| Galeria protegida | Código incorreto | `401` e formulário permanece disponível |
| Checkout | Foto indisponível | `409`; usuário precisa revisar carrinho |
| Pagamento | Mercado Pago indisponível | `409` ou erro; pedido não deve ser marcado como pago |
| Webhook | Assinatura inválida | `401`; nada é processado |
| Entrega | SMTP ausente | Pedido registra status `nao_configurado`; WhatsApp assistido pode ser usado |
| Download | Token vencido | `401` ou `410`; não entrega arquivo |
| Processamento | Arquivo não suportado | `422`; Apps Script registra erro |

## Fluxos Assíncronos

- Trigger Apps Script a cada 5 minutos.
- Webhook Mercado Pago chega fora da sessão do usuário.
- E-mail de entrega ocorre no backend após confirmação.
- Cache pode permanecer até TTL ou invalidação explícita.

## Integrações

- Google Drive: origem de fotos, armazenamento de originais e derivados.
- Google Sheets: banco e painel operacional.
- Mercado Pago: pagamento e confirmação.
- SMTP: e-mail de entrega.
- WhatsApp: canal assistido por link `wa.me`.
- Vercel: hospedagem e cache.
## Área Pascom Autenticada

1. Membro da equipe acessa `/pascom` no desktop ou toca em "Entrar como Pascom" em `/perfil` no mobile.
2. Frontend renderiza Clerk SignIn; e-mail OTP é o canal recomendado e SMS/celular pode ser ativado no Clerk Dashboard.
3. Após login, frontend envia token Clerk em `Authorization: Bearer`.
4. Backend aplica `clerkMiddleware`, obtém `userId`, carrega e-mails/telefones do usuário no Clerk e consulta `EquipePascom`.
5. Se o identificador ativo existir, backend atualiza `UltimoAcessoEm` e libera `/api/pascom/me`, dashboard, pedidos e detalhes.
6. O painel permite regenerar downloads somente para pedido com `Pagamento Confirmado`.
7. Compradores, galerias, checkout, Mercado Pago e download público continuam sem login.
