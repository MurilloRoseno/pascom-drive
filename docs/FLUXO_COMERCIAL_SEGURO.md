# Fluxo Comercial Seguro - Pascom Drive

## Entrada No Drive

A Pascom cria uma pasta dentro de `Fotos_Origem` usando:

```text
{categoria}__{AAAA-MM-DD}__{titulo}
casamento__2026-05-20__joao-e-maria
```

Categorias aceitas: `celebracoes`, `batismo`, `eucaristia`, `crisma`, `casamento`, `uncao-dos-enfermos` e `ordem`.

O Apps Script processa fotos imediatamente para original privado e preview com marca d'agua. Todo evento novo nasce oculto com `Publicacao=rascunho`, `Visibilidade=protegida` e `VendaAutorizada=NAO`. Nomes invalidos ficam pendentes de configuracao e nunca sao publicados automaticamente.

## Abas Da Planilha

Execute `inicializarEstrutura()` no Apps Script antes da estreia. A funcao cria ou amplia:

- `Eventos`: configuracao editorial, visibilidade, autorizacao comercial e hash do codigo.
- `Fotos`: apenas IDs privados e previews processados, preco unitario e disponibilidade de venda.
- `Pedidos` e `ItensPedido`: snapshot de comprador, taxas e itens cobrados.
- `Webhooks`: idempotencia persistida das notificacoes Mercado Pago.
- `Downloads`: autorizacoes temporarias, expiracao e limite de usos.
- `RegrasPagamento`: taxas estimadas ativas por meio de pagamento.

Eventos existentes permanecem conservadoramente em rascunho/protegidos/sem venda ate revisao manual.

## Liberacao Administrativa

Na aba `Eventos`, selecione a linha e use o menu `Pascom Drive`:

1. Valide categoria, data, autorizacao de imagem e eventual protecao de menores.
2. Use `Alternar visibilidade selecionada` somente para galerias adequadas a acesso publico.
3. Em galeria protegida, use `Gerar codigo de acesso`; compartilhe o codigo exibido uma unica vez. A planilha guarda apenas o hash.
4. Use `Autorizar venda selecionada` somente com autorizacao comercial confirmada.
5. Use `Publicar evento selecionado` para torna-lo visivel no site.
6. Use `Revogar codigo de acesso` ou `Arquivar evento selecionado` sempre que necessario.

Galerias com menores devem permanecer protegidas e demandam revisao expressa antes de publicacao e venda.

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
