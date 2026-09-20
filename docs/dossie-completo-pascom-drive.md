# Dossiê Completo do Projeto Pascom Drive

> Documento canônico para entender, apresentar, operar e manter o Pascom Drive.
>
> Este dossiê não contém segredos reais. Sempre cadastre chaves, tokens, senhas e credenciais apenas em variáveis de ambiente da Vercel, propriedades do Apps Script ou arquivos locais ignorados pelo Git.

## Índice

1. [Resumo executivo](#1-resumo-executivo)
2. [O que o projeto resolve](#2-o-que-o-projeto-resolve)
3. [Pessoas, papéis e responsabilidades](#3-pessoas-papéis-e-responsabilidades)
4. [Arquitetura geral](#4-arquitetura-geral)
5. [Fluxos ponta a ponta](#5-fluxos-ponta-a-ponta)
6. [Operação da Pascom no Drive](#6-operação-da-pascom-no-drive)
7. [Google Sheets como painel operacional](#7-google-sheets-como-painel-operacional)
8. [Google Apps Script](#8-google-apps-script)
9. [Frontend e experiência do fiel](#9-frontend-e-experiência-do-fiel)
10. [Backend e APIs](#10-backend-e-apis)
11. [Pagamento, taxas e entrega](#11-pagamento-taxas-e-entrega)
12. [Segurança, privacidade e LGPD](#12-segurança-privacidade-e-lgpd)
13. [Ambiente, deploy e produção](#13-ambiente-deploy-e-produção)
14. [Rotina de testes e validação](#14-rotina-de-testes-e-validação)
15. [Troubleshooting](#15-troubleshooting)
16. [Treinamento da equipe](#16-treinamento-da-equipe)
17. [Governança e rotina de operação](#17-governança-e-rotina-de-operação)
18. [Roadmap, riscos e evolução futura](#18-roadmap-riscos-e-evolução-futura)
19. [Checklists práticos](#19-checklists-práticos)
20. [Referências internas](#20-referências-internas)

---

## 1. Resumo executivo

### 1.1. O que é o Pascom Drive

O Pascom Drive é um sistema para transformar pastas de fotos da Pastoral da Comunicação em galerias publicáveis, com busca, visualização, seleção, compra, confirmação de pagamento e entrega segura das fotos.

Ele foi pensado para a realidade da Paróquia São Rafael: baixo custo operacional, equipe pastoral com escalas variáveis, Google Drive como local natural onde as fotos já circulam, Google Sheets como painel administrativo editável e Vercel como hospedagem do site e das APIs.

### 1.2. Ideia central

```text
Pascom fotografa
  -> cria pasta no Google Drive
  -> Apps Script detecta/processa
  -> Google Sheets vira painel de controle
  -> site mostra eventos publicados
  -> fiel escolhe fotos
  -> Mercado Pago confirma pagamento
  -> backend libera download temporário
  -> entrega acontece por e-mail e WhatsApp assistido
```

### 1.3. O que precisa ficar claro para todos

- O sistema não substitui decisão pastoral.
- A planilha não é apenas banco de dados: ela é o painel administrativo da secretaria/Pascom.
- Eventos começam seguros por padrão: rascunho, protegidos e sem venda autorizada.
- Fotos originais não ficam públicas.
- Prévia com marca d'água não é a foto final comprada.
- Compra só deve existir quando `VendaAutorizada=SIM`.
- Eventos com menores precisam de cuidado reforçado.
- Mercado Pago processa o pagamento; a paróquia não deve armazenar dados de cartão.
- Entrega automática por e-mail é útil, mas WhatsApp assistido continua como fallback operacional.

### 1.4. Estado atual do projeto

O projeto está estruturado em quatro blocos principais:

| Bloco | Pasta | Função |
| --- | --- | --- |
| Frontend | `frontend/` | Site público, mobile/desktop, busca, evento, galeria, carrinho, checkout, retorno, recuperação e área Pascom |
| Backend | `backend/` | APIs, integração com Sheets/Drive/Mercado Pago, segurança, mídia, cache, download e entrega |
| Apps Script | `google-apps-script/` | Automação do Google Drive/Sheets, processamento de eventos, funções administrativas e triggers |
| Documentação | `docs/` | Documentação técnica ativa e agora este dossiê canônico |

### 1.5. O que é obrigatório antes de produção real

- Credenciais de produção configuradas e sem vazamento.
- Planilha inicializada com abas e validações.
- Webhook Mercado Pago configurado e validado.
- Apps Script publicado sem arquivos de teste.
- Fluxo sandbox testado de ponta a ponta.
- Política de privacidade revisada.
- Regras de menores e autorização de venda aprovadas pelo padre/pároco.
- Responsável financeiro definido.
- Responsável de atendimento definido.
- Evento piloto real executado antes de abertura ampla.

---

## 2. O que o projeto resolve

### 2.1. Problemas anteriores

Antes do Pascom Drive, o fluxo de fotos tende a depender de muitas ações manuais:

- fotos espalhadas em pastas e conversas;
- dificuldade de saber quais fotos pertencem a qual evento;
- aplicação manual de marca d'água;
- publicação sem padrão;
- venda sem rastreabilidade;
- entrega manual de arquivo final;
- risco de expor originais;
- dificuldade de atender pedidos depois;
- ausência de controle claro de menores e eventos protegidos;
- dependência de uma pessoa específica que "sabe como faz".

### 2.2. Problemas que o sistema passa a resolver

| Problema | Como o projeto resolve |
| --- | --- |
| Organização de eventos | Padrão de pasta no Drive e registro na aba `Eventos` |
| Controle de fotos | Aba `Fotos` com original, preview, thumbnail, tipo e preço |
| Publicação | Campo `Publicacao` controla `rascunho`, `publicado` e `arquivado` |
| Privacidade | Campo `Visibilidade` e código de galeria protegida |
| Venda | Campo `VendaAutorizada` e validação backend |
| Pagamento | Checkout Pro Mercado Pago e webhook |
| Entrega | Downloads temporários, e-mail SMTP e WhatsApp assistido |
| Auditoria | Abas `Pedidos`, `ItensPedido`, `Webhooks` e `Downloads` |
| Performance | Cache Vercel e thumbnails separadas de previews |
| Segurança | Tokens assinados, rate limits, originais privados e marca d'água |

### 2.3. O que o sistema não resolve sozinho

O projeto ajuda muito, mas não decide sozinho:

- se a foto pode ser publicada;
- se a foto pode ser vendida;
- se a família autorizou;
- se o evento envolve menores;
- se o título público está correto;
- se a capa está adequada;
- se a taxa do Mercado Pago está atualizada;
- se uma solicitação de remoção deve ser atendida;
- se um pedido deve ser estornado.

Essas decisões continuam sendo pastorais, administrativas ou financeiras.

---

## 3. Pessoas, papéis e responsabilidades

### 3.1. Padre/pároco e coordenador atual da Pascom

Responsabilidades principais:

- aprovar a finalidade pastoral do uso das fotos;
- definir limites para venda;
- aprovar regras para eventos com menores;
- definir quando uma galeria deve ser protegida;
- autorizar ou não o piloto;
- escolher quem pode publicar e autorizar venda;
- validar a comunicação pública para a comunidade.

O que precisa saber:

- `VendaAutorizada=SIM` permite compra.
- `Publicacao=publicado` faz o evento aparecer no site.
- `Visibilidade=protegida` exige código para ver fotos.
- `ProtecaoMenores=SIM` deve acionar cuidado reforçado.

O que não precisa fazer:

- configurar Vercel;
- mexer em código;
- alterar tokens;
- processar imagens manualmente.

### 3.2. Antiga coordenadora da Pascom

Responsabilidades sugeridas:

- validar se a rotina proposta cabe na realidade da equipe;
- apontar gargalos históricos;
- ajudar a desenhar a escala mínima para eventos;
- apoiar transição de conhecimento;
- revisar o piloto com olhar de experiência operacional.

### 3.3. Membros da Pascom por escala

Responsabilidades possíveis:

- fotografar evento;
- criar ou conferir pasta;
- subir fotos;
- separar `capa.jpg`;
- revisar se fotos estão adequadas;
- avisar secretaria sobre publicação;
- apoiar atendimento em eventos grandes.

Como a escala varia, cada evento precisa ter:

- responsável principal;
- substituto;
- prazo para subir fotos;
- prazo para revisão;
- responsável por publicar.

### 3.4. Fotógrafos

Responsabilidades:

- produzir fotos com qualidade mínima;
- não misturar eventos diferentes;
- separar capa quando houver;
- evitar fotos inadequadas;
- sinalizar eventos com crianças/adolescentes;
- não enviar arquivos finais por fora quando o fluxo oficial for o Pascom Drive.

Padrões práticos:

- colocar a foto de capa como `capa.jpg`, `capa.jpeg` ou `capa.png`;
- evitar nomes muito confusos nos arquivos;
- subir fotos na pasta correta;
- avisar quando terminou o envio.

### 3.5. Secretaria

Responsabilidades:

- atender dúvidas dos fiéis;
- orientar sobre código de galeria protegida;
- receber pedido de remoção;
- acompanhar pedidos não recebidos;
- usar WhatsApp assistido quando e-mail falhar;
- registrar problemas recorrentes para a coordenação.

O que precisa saber:

- como localizar pedido;
- como conferir status de pagamento;
- como explicar marca d'água;
- como explicar link temporário;
- como encaminhar solicitação de remoção.

### 3.6. Financeiro

Responsabilidades:

- configurar e acompanhar Mercado Pago;
- aprovar preço por foto;
- aprovar taxa de serviço e comodidade;
- manter tabela de taxa de pagamento atualizada;
- conferir repasses;
- lidar com estornos e contestações;
- conciliar pedidos aprovados com extrato Mercado Pago.

Campos importantes:

- `Subtotal`;
- `TaxaServico`;
- `TaxaComodidade`;
- `CustoPagamentoEstimado`;
- `Total`;
- `TarifaReal`;
- `PaymentID`;
- `PreferenceID`.

### 3.7. Dev/mantenedor

Responsabilidades:

- manter frontend/backend/Apps Script;
- configurar Vercel e segredos;
- publicar Apps Script com segurança;
- acompanhar erros técnicos;
- validar webhooks e downloads;
- manter documentação atualizada;
- corrigir bugs e evoluir o sistema.

O que o dev não deve assumir sozinho:

- autorização pastoral;
- liberação de venda;
- política de menores;
- resposta a pedidos de remoção;
- definição de preço;
- conciliação financeira.

---

## 4. Arquitetura geral

### 4.1. Visão em camadas

```text
Usuário/fiel
  -> Frontend React
  -> API Node/Express na Vercel
  -> Google Sheets, Google Drive, Mercado Pago, SMTP

Pascom/Drive
  -> Apps Script
  -> Google Sheets
  -> Backend de imagem
  -> Pastas de originais, previews e thumbnails
```

### 4.2. Tecnologias principais

| Área | Tecnologia | Uso |
| --- | --- | --- |
| Interface | React 18 | SPA pública e área Pascom |
| Build | Vite | Desenvolvimento e build |
| Rotas | React Router | Navegação |
| Validação | Zod | Payloads e formulários |
| Backend | Express | APIs locais e Vercel |
| Hospedagem | Vercel | Frontend, backend, headers e cache |
| Imagens | Sharp | Redimensionamento, marca d'água e fingerprint |
| Banco operacional | Google Sheets | Eventos, fotos, pedidos, downloads e regras |
| Arquivos | Google Drive | Originais e derivados |
| Automação | Google Apps Script | Leitura de pastas, registro e manutenção |
| Pagamento | Mercado Pago | Checkout e confirmação |
| E-mail | Nodemailer/SMTP | Entrega automática |
| Login equipe | Clerk | Área Pascom autenticada |
| Testes | Jest, Testing Library, Supertest | Cobertura frontend/backend/Apps Script |

### 4.3. Pastas importantes

| Pasta | O que contém |
| --- | --- |
| `frontend/src/pages` | Home, busca, evento, checkout, retorno, recuperação, painel Pascom e privacidade |
| `frontend/src/desktop` | Experiência desktop |
| `frontend/src/mobile` | Experiência mobile/tablet dedicada |
| `frontend/src/components` | Header, footer, photo card, cart summary |
| `frontend/src/context` | Carrinho |
| `backend/api` | Endpoints HTTP |
| `backend/lib` | Regras e integrações |
| `backend/middleware` | Rate limit, media abuse e erro |
| `google-apps-script` | Automação Drive/Sheets |
| `docs` | Documentos canônicos |
| `entregaveis/producao-apresentacao` | Apresentação, checklist e materiais de reunião |

### 4.4. Estratégia de deploy

```text
GitHub
  -> Vercel build
  -> frontend/package.json static-build
  -> backend/api/index.js como função Node
  -> rotas /api/*
  -> fallback SPA para frontend/index.html
```

Apps Script é publicado separadamente:

```powershell
cd google-apps-script
npm run push:production
```

Esse comando deve validar a publicação antes de enviar arquivos para o Google Apps Script.

### 4.5. Decisões arquiteturais importantes

- Google Sheets é aceito como banco do MVP por simplicidade operacional.
- Google Drive guarda originais e derivados.
- Backend processa imagens porque Apps Script não é bom para processamento pesado.
- Frontend tem experiências desktop e mobile separadas.
- Pagamento real fica no Mercado Pago.
- Downloads finais são temporários e controlados.
- Área Pascom usa Clerk para login de equipe.

---

## 5. Fluxos ponta a ponta

### 5.1. Fluxo de criação de evento

```text
Pascom cria pasta no Drive
  -> Apps Script detecta
  -> valida padrão do nome
  -> registra linha em Eventos
  -> processa fotos
  -> gera previews e thumbnails
  -> registra Fotos
  -> secretaria/Pascom revisa
  -> publica quando estiver correto
```

O evento novo deve começar conservador:

| Campo | Valor inicial seguro |
| --- | --- |
| `Publicacao` | `rascunho` |
| `Visibilidade` | `protegida` |
| `VendaAutorizada` | `NAO` |
| `ProtecaoMenores` | Conforme tipo do evento, preferindo cuidado |

### 5.2. Fluxo de galeria pública

1. Usuário acessa home ou busca.
2. Frontend chama `GET /api/eventos`.
3. Backend retorna eventos publicados.
4. Usuário abre evento.
5. Frontend chama `GET /api/eventos/:eventoId`.
6. Frontend chama `GET /api/eventos/:eventoId/fotos`.
7. Backend retorna thumbnails e previews seguros.
8. Usuário seleciona fotos.
9. Carrinho mostra resumo.

### 5.3. Fluxo de galeria protegida

1. Usuário abre evento protegido.
2. Frontend tenta carregar fotos.
3. Backend retorna `401` indicando proteção.
4. Usuário informa código.
5. Frontend chama `POST /api/eventos/:eventoId/acesso`.
6. Backend valida contra `CodigoHash`.
7. Se correto, backend emite token temporário.
8. Frontend salva token em `sessionStorage`.
9. Próximas chamadas usam `X-Gallery-Token`.

Importante:

- código aberto não deve ficar na planilha;
- a planilha guarda hash;
- código pode ser revogado;
- evento protegido não vira público só por ter link.

### 5.4. Fluxo de compra

```text
Usuário seleciona fotos
  -> carrinho
  -> checkout
  -> backend cota valor
  -> backend cria pedido
  -> Mercado Pago
  -> retorno para o site
  -> webhook confirma
  -> downloads são criados
  -> entrega por e-mail/WhatsApp
```

O navegador nunca decide o valor final. O backend recalcula:

- fotos selecionadas;
- preço unitário;
- desconto de cupom/pacote, se houver;
- taxa de serviço;
- taxa de comodidade;
- custo estimado do pagamento;
- total final.

### 5.5. Fluxo de webhook Mercado Pago

```text
Mercado Pago
  -> POST /api/webhook/mercado-pago
  -> valida assinatura
  -> registra idempotência
  -> consulta pagamento na API Mercado Pago
  -> localiza pedido
  -> valida valor/moeda/status
  -> atualiza pedido
  -> cria downloads
  -> envia e-mail
  -> registra WhatsApp assistido
```

Condições obrigatórias para liberar download:

- assinatura válida;
- pagamento consultado na API do Mercado Pago;
- pedido encontrado;
- moeda `BRL`;
- valor compatível com o pedido salvo;
- status aprovado.

### 5.6. Fluxo de entrega

1. Pagamento aprovado.
2. Backend cria registros na aba `Downloads`.
3. Cada download recebe token temporário assinado.
4. E-mail SMTP tenta enviar links ao comprador.
5. WhatsApp assistido fica registrado como fallback.
6. Se e-mail falhar, pedido continua aprovado e suporte consegue ajudar.

### 5.7. Fluxo de recuperação de pedido

1. Usuário informa e-mail e código/pedido.
2. Frontend chama `POST /api/pedidos/recuperar`.
3. Backend valida e-mail contra pedido.
4. Se aprovado, retorna links seguros regenerados ou disponíveis.
5. Se pendente, orienta acompanhar pagamento.
6. Se não encontrado, retorna erro sem revelar dados sensíveis.

### 5.8. Fluxo da área Pascom

1. Membro acessa `/pascom`.
2. Clerk autentica.
3. Backend consulta aba `EquipePascom`.
4. Se ativo, libera dashboard e pedidos.
5. Painel pode ver pedidos e regenerar downloads de pedido aprovado.

---

## 6. Operação da Pascom no Drive

### 6.1. Padrão de nome de pasta

Formato:

```text
categoria__AAAA-MM-DD__titulo-do-evento
```

Exemplo:

```text
ordem__2026-05-01__paulo-roberto-nosso-paroco
casamento__2026-05-20__joao-e-maria
eucaristia__2026-06-11__primeira-comunhao
```

### 6.2. Categorias permitidas

| ID técnico | Nome exibido |
| --- | --- |
| `celebracoes` | Celebrações |
| `batismo` | Batismo |
| `eucaristia` | Eucaristia |
| `crisma` | Crisma |
| `casamento` | Casamento |
| `uncao-dos-enfermos` | Unção dos Enfermos |
| `ordem` | Ordem |

Não crie categorias novas direto no Drive sem alinhar código, planilha e frontend.

### 6.3. Uso de capa

Para definir uma capa editorial:

```text
capa.jpg
capa.jpeg
capa.png
```

Regras:

- capa não deve entrar na venda;
- capa não deve receber marca d'água visível;
- capa pode ser pública/cacheável;
- capa deve representar bem o evento;
- se não houver capa, o sistema pode usar foto do evento conforme regras atuais.

### 6.4. Fotos vendáveis

Fotos normais:

- recebem preview com marca d'água;
- recebem thumbnail leve;
- ficam disponíveis para venda apenas se evento e foto permitirem;
- original permanece privado;
- arquivo final só é entregue após pagamento aprovado.

### 6.5. Pasta futura sem fotos

Se a Pascom criar uma pasta para evento futuro e ainda não colocar fotos:

- a pasta não deve ser excluída;
- a pasta não deve necessariamente virar galeria pública;
- quando fotos forem adicionadas, o trigger processará;
- o ideal é registrar depois que houver conteúdo mínimo.

### 6.6. Revisão antes de publicar

Checklist mínimo:

- [ ] Nome do evento está correto.
- [ ] Categoria está correta.
- [ ] Data está correta.
- [ ] Horário está correto.
- [ ] Local está correto.
- [ ] Capa está adequada.
- [ ] Fotos inadequadas foram removidas ou marcadas como não vendáveis.
- [ ] Menores foram avaliados.
- [ ] Venda foi autorizada, se aplicável.
- [ ] Galeria protegida recebeu código, se necessário.

### 6.7. Publicar evento

Para aparecer no site:

```text
Publicacao=publicado
```

Para ocultar:

```text
Publicacao=rascunho
```

Para encerrar/historizar:

```text
Publicacao=arquivado
```

### 6.8. Autorizar venda

Para permitir compra:

```text
VendaAutorizada=SIM
```

Para bloquear compra:

```text
VendaAutorizada=NAO
```

Mesmo que a galeria esteja publicada, a venda precisa estar autorizada.

### 6.9. Definir visibilidade

Galeria aberta:

```text
Visibilidade=publica
```

Galeria com código:

```text
Visibilidade=protegida
```

Regra recomendada:

- eventos com menores: `protegida`;
- eventos familiares sensíveis: `protegida`;
- eventos institucionais amplos: pode ser `publica`, se autorizado.

---

## 7. Google Sheets como painel operacional

### 7.1. Visão geral

O Google Sheets é o banco operacional e painel administrativo. Isso é ótimo para uma equipe não técnica, mas exige disciplina.

Não é banco transacional. Portanto:

- evite editar headers;
- evite apagar linhas manualmente sem saber;
- use valores permitidos;
- preserve IDs;
- registre decisões;
- faça backup antes de mudanças grandes.

### 7.2. Abas principais

| Aba | Função |
| --- | --- |
| `Eventos` | Cadastro e status dos eventos |
| `Fotos` | Registro de fotos, originais e derivados |
| `Pedidos` | Pedidos criados no checkout |
| `ItensPedido` | Fotos dentro de cada pedido |
| `Webhooks` | Notificações Mercado Pago processadas |
| `Downloads` | Links temporários e controle de uso |
| `RegrasPagamento` | Taxas estimadas por meio |
| `Cupons` | Cupons de desconto |
| `Pacotes` | Pacotes comerciais |
| `EquipePascom` | Membros autorizados na área Pascom |

### 7.3. Aba `Eventos`

Campos críticos:

| Campo | O que significa | Valores importantes |
| --- | --- | --- |
| `EventoID` | ID lógico do evento | Não editar depois de criado |
| `NomePasta` | Nome original no Drive | Ajuda auditoria |
| `FolderID` | ID da pasta do Drive | Não editar manualmente |
| `Titulo` | Nome público | Revisar antes de publicar |
| `SlugPublico` | Link amigável | Opcional, se configurado |
| `Categoria` | Tipo do evento | Categorias permitidas |
| `DataEvento` | Data da celebração | `AAAA-MM-DD` |
| `HorarioEvento` | Horário público | `HH:mm` ou texto válido |
| `Visibilidade` | Acesso às fotos | `publica` ou `protegida` |
| `VendaAutorizada` | Libera compra | `SIM` ou `NAO` |
| `Publicacao` | Exibição no site | `rascunho`, `publicado`, `arquivado` |
| `ProtecaoMenores` | Cuidado extra | `SIM` ou `NAO` |
| `CodigoHash` | Hash do código | Não substituir por código aberto |
| `CodigoVersao` | Versão do código | Usado para revogação |
| `DataPublicacao` | Quando publicou | Não é horário do evento |
| `Erros` | Último erro | Usar para diagnóstico |

Erros comuns:

- colocar horário do evento em `DataPublicacao`;
- escrever `Sim`, `S`, `Não` em vez de `SIM`/`NAO`;
- trocar `publica` por `pública` com acento;
- publicar evento antes de revisar fotos;
- autorizar venda sem regra pastoral.

### 7.4. Aba `Fotos`

Campos críticos:

| Campo | O que significa |
| --- | --- |
| `FotoID` | ID da foto |
| `EventoID` | Evento dono |
| `OriginalFileID` | Arquivo original privado |
| `PreviewFileID` | Prévia com marca d'água |
| `ThumbnailFileID` | Miniatura leve |
| `TipoFoto` | `foto` ou `capa` |
| `StatusProcessamento` | Estado do processamento |
| `DisponivelVenda` | `SIM`/`NAO` |
| `PrecoUnitario` | Preço salvo/operacional |

Regras:

- `OriginalFileID` não deve ser exposto em API pública.
- `TipoFoto=capa` não deve ser vendido.
- `DisponivelVenda=NAO` impede compra daquela foto.
- Preço real deve ser recalculado no backend.

### 7.5. Aba `Pedidos`

Campos importantes:

| Campo | Função |
| --- | --- |
| `PedidoID` | Identificador do pedido |
| `PreferenceID` | Preferência Mercado Pago |
| `PaymentID` | Pagamento Mercado Pago |
| `Status` | Estado operacional |
| `Nome`, `Email`, `WhatsApp` | Contato do comprador |
| `MeioPagamento` | Meio escolhido |
| `Subtotal` | Fotos antes das taxas |
| `TaxaServico` | Taxa fixa do serviço |
| `TaxaComodidade` | Taxa fixa de comodidade |
| `CustoPagamentoEstimado` | Estimativa do Mercado Pago |
| `Total` | Total cobrado |
| `TarifaReal` | Tarifa retornada pelo Mercado Pago |
| `EmailStatus` | `enviado`, `falhou`, `nao_configurado` |
| `WhatsAppLink` | Mensagem assistida |

### 7.6. Aba `RegrasPagamento`

Controla se um meio está disponível.

Campos:

| Campo | Exemplo |
| --- | --- |
| `MeioPagamento` | `pix`, `credit_card` |
| `PercentualEstimado` | `0.99`, `4.98` |
| `ValorFixo` | `0` |
| `Vigencia` | texto informativo |
| `Ativo` | `SIM`/`NAO` |

Se uma regra ativa não existir, o checkout deve bloquear aquele meio.

### 7.7. Aba `EquipePascom`

Controla quem acessa `/pascom`.

Campos:

| Campo | Função |
| --- | --- |
| `Identificador` | e-mail minúsculo ou telefone normalizado |
| `Tipo` | `email` ou `phone` |
| `Nome` | Nome exibido |
| `Role` | `admin` no MVP |
| `Ativo` | `SIM`/`NAO` |
| `UltimoAcessoEm` | Atualizado no login |

Clerk autentica; Sheets autoriza.

### 7.8. Quem pode editar o quê

| Campo/aba | Quem deveria editar |
| --- | --- |
| `Titulo`, `Categoria`, `DataEvento`, `HorarioEvento` | Coordenação Pascom |
| `Publicacao` | Coordenação Pascom autorizada |
| `VendaAutorizada` | Padre/coordenador ou financeiro conforme regra |
| `Visibilidade` | Coordenação com aprovação pastoral |
| `ProtecaoMenores` | Padre/coordenador |
| `RegrasPagamento` | Financeiro/dev |
| `EquipePascom` | Admin definido |
| `Pedidos`, `Webhooks`, `Downloads` | Sistema, não edição manual |

---

## 8. Google Apps Script

### 8.1. Função do Apps Script

O Apps Script é o worker que vive perto do Google Drive e Google Sheets.

Ele:

- detecta pastas novas;
- registra eventos;
- processa fotos;
- chama backend para thumbnails/previews;
- atualiza planilha;
- cria validações;
- oferece funções administrativas;
- invalida cache quando necessário.

### 8.2. Arquivos produtivos

No editor online do Apps Script devem existir apenas arquivos produtivos:

```text
appsscript.json
Code
Drive
EventQueue
Sheet
Security
Watermark
WhatsApp
```

Não publique:

```text
jest-setup
jest.config
__tests__
coverage
package.json
node_modules
documentação
```

### 8.3. Funções administrativas principais

| Função | Onde está | Uso |
| --- | --- | --- |
| `inicializarEstrutura()` | `Sheet.js` | Cria/migra abas e validações |
| `reiniciarDadosParaEstreia()` | `Sheet.js` | Limpa dados de teste com confirmação |
| `cadastrarRegrasMercadoPagoD0()` | `Sheet.js` | Cadastra Pix e crédito 1x com taxas base |
| `normalizarMetadadosEventos()` | `Sheet.js` | Corrige títulos/metadados legados com carimbos |
| `publicarEventoSelecionado()` | `Sheet.js` | Publica evento selecionado |
| `autorizarVendaSelecionada()` | `Sheet.js` | Marca venda autorizada |
| `sincronizarConfiguracoesAdministrativas()` | `Sheet.js` | Sincroniza mudanças e cache |
| `gerarCodigoEventoSelecionado()` | `Sheet.js` | Gera código de galeria protegida |
| `revogarCodigoEventoSelecionado()` | `Sheet.js` | Revoga código e invalida acesso |
| `arquivarEventoSelecionado()` | `Sheet.js` | Arquiva evento |
| `criarTriggers()` | `Code.js` | Instala trigger de processamento |
| `processarEventos()` | `Code.js` | Processa pastas/fotos |
| `reprocessarMiniaturasEmLote()` | `Watermark.js` | Regera miniaturas pendentes |
| `organizarMiniaturasEmPasta()` | `Watermark.js` | Move miniaturas para pasta própria |

### 8.4. Propriedades obrigatórias/recomendadas

Configure em Script Properties:

| Propriedade | Uso |
| --- | --- |
| `SOURCE_FOLDER_ID` | Pasta de entrada dos eventos |
| `ORIGINAIS_FOLDER_ID` | Pasta privada dos originais |
| `AMOSTRAS_FOLDER_ID` | Pasta de previews |
| `THUMBNAILS_FOLDER_ID` | Pasta de miniaturas |
| `SPREADSHEET_ID` | Planilha operacional |
| `BACKEND_URL` | URL pública do backend |
| `APPS_SCRIPT_HMAC_SECRET` | Segredo HMAC compartilhado com backend |
| `WATERMARK_API_SECRET` | Segredo legado/processamento, se ainda habilitado |
| `CACHE_INVALIDATION_SECRET` | Segredo de invalidação, se fallback estiver ativo |
| `ADMIN_EMAIL` | Alertas administrativos |

Nunca coloque segredo em arquivo `.js` do Apps Script.

### 8.5. Deploy seguro por `clasp`

Configuração local esperada:

```json
{
  "scriptId": "COLE_O_SCRIPT_ID_AQUI",
  "rootDir": "."
}
```

Arquivo `.clasp.json` deve ser local e ignorado pelo Git.

Publicação:

```powershell
cd google-apps-script
npm run push:production
```

Antes de publicar:

- rode testes, se necessário;
- rode `npm run validate:release`;
- confirme que arquivos Jest não serão enviados;
- confirme `.claspignore`.

### 8.6. Permissões

Ao executar funções manualmente, o Apps Script pode pedir permissões para:

- ler Drive;
- escrever Sheets;
- chamar URLs externas;
- enviar e-mail administrativo com `MailApp`;
- gerenciar triggers.

Erro comum:

```text
Required permissions: https://www.googleapis.com/auth/script.send_mail
```

Solução:

- atualizar `appsscript.json` com escopo adequado;
- executar função manualmente;
- aceitar permissões;
- testar novamente.

### 8.7. Miniaturas e pastas próprias

Recomendado:

- criar pasta privada `Miniaturas`;
- configurar `THUMBNAILS_FOLDER_ID`;
- manter previews e thumbnails separados;
- evitar bagunça na pasta de amostras.

Funções:

```text
reprocessarMiniaturasEmLote()
organizarMiniaturasEmPasta()
```

Use em lotes para não estourar tempo do Apps Script.

---

## 9. Frontend e experiência do fiel

### 9.1. Estrutura

O frontend é React/Vite. A aplicação decide entre experiência desktop e mobile/tablet.

Arquivos principais:

| Arquivo/pasta | Função |
| --- | --- |
| `frontend/src/App.jsx` | Escolhe experiência por plataforma |
| `frontend/src/desktop` | Shell desktop |
| `frontend/src/mobile` | Shell mobile |
| `frontend/src/pages/Home.jsx` | Home |
| `frontend/src/pages/Search.jsx` | Busca/eventos |
| `frontend/src/pages/Event.jsx` | Evento/galeria |
| `frontend/src/pages/Checkout.jsx` | Checkout |
| `frontend/src/pages/PaymentReturn.jsx` | Retorno |
| `frontend/src/pages/RecoverOrder.jsx` | Recuperação |
| `frontend/src/pages/Pascom.jsx` | Área Pascom |
| `frontend/src/context/CarrinhoContext.jsx` | Carrinho |
| `frontend/src/lib/api.js` | Cliente de API |

### 9.2. Rotas públicas

| Rota | Função |
| --- | --- |
| `/` | Home |
| `/buscar` | Busca e categorias |
| `/categoria` | Redirecionamento legado para busca |
| `/evento/:eventoId` | Galeria do evento |
| `/e/:slug` | Link público amigável |
| `/checkout` | Finalização da compra |
| `/pagamento/:resultado` | Retorno Mercado Pago |
| `/recuperar-pedido` | Recuperação |
| `/privacidade` | Política de privacidade |
| `/politica-de-privacidade` | Alias de política |

### 9.3. Rotas de equipe

| Rota | Função |
| --- | --- |
| `/pascom` | Login e painel da equipe |

Área Pascom exige Clerk e cadastro ativo em `EquipePascom`.

### 9.4. Jornada desktop

1. Home institucional.
2. Busca por evento, data ou sacramento.
3. Cards de eventos recentes/próximas atividades.
4. Busca com filtros por categoria.
5. Evento com capa, data, local e fotos.
6. Seleção visual das fotos.
7. Carrinho.
8. Checkout.
9. Retorno.
10. Recuperação de pedido, se necessário.

### 9.5. Jornada mobile

Mobile/tablet usa experiência própria.

Pontos importantes:

- navegação inferior;
- galeria otimizada para toque;
- carrinho inferior;
- lightbox fullscreen;
- checkout em etapas;
- recuperação acessível;
- perfil/área pública com política e entrada Pascom.

### 9.6. Seleção de fotos

Ao selecionar foto:

- card precisa mostrar visualmente que está selecionado;
- carrinho atualiza quantidade e subtotal;
- usuário consegue revisar antes de pagar;
- seleção não deve ocorrer se foto não está vendável.

### 9.7. Galeria protegida no frontend

Comportamento esperado:

- evento abre normalmente;
- fotos não aparecem sem código;
- formulário de código é exibido;
- token salvo em `sessionStorage`;
- token é enviado em `X-Gallery-Token`;
- se token expirar, usuário informa código novamente.

### 9.8. Cuidados de comunicação

Frases úteis:

- "A prévia tem marca d'água para proteção; a foto comprada é entregue sem marca visível."
- "Algumas galerias exigem código para proteger famílias e menores."
- "O pagamento é processado pelo Mercado Pago."
- "A paróquia não guarda dados de cartão."
- "O link de download é temporário."

---

## 10. Backend e APIs

### 10.1. Função do backend

O backend é a camada que:

- protege acesso aos dados;
- valida payloads;
- lê/escreve Sheets;
- baixa arquivos do Drive;
- processa imagens;
- calcula preços;
- cria pagamentos;
- valida webhooks;
- gera downloads;
- envia e-mails;
- aplica rate limits;
- invalida cache.

### 10.2. Endpoints públicos principais

| Endpoint | Uso |
| --- | --- |
| `GET /api/health` | Saúde da API |
| `GET /api/eventos` | Lista eventos publicados |
| `GET /api/eventos/:eventoId` | Detalhe de evento |
| `GET /api/e/:slug` | Resolve link amigável |
| `GET /api/eventos/:eventoId/fotos` | Lista fotos seguras |
| `POST /api/eventos/:eventoId/acesso` | Valida código de galeria |
| `GET /api/eventos/:eventoId/ofertas` | Lista cupons/pacotes |
| `POST /api/checkout/quote` | Cota carrinho |
| `POST /api/checkout/preference` | Cria pedido e preferência |
| `POST /api/pedidos/recuperar` | Recupera pedido |
| `GET /api/status-pagamento` | Consulta status |
| `GET /api/download` | Baixa foto comprada |

### 10.3. Endpoints internos/protegidos

| Endpoint | Proteção | Uso |
| --- | --- | --- |
| `POST /api/preprocess` | HMAC Apps Script | Pré-processamento |
| `POST /api/watermark` | HMAC Apps Script | Marca d'água |
| `POST /api/cover-preview` | HMAC Apps Script | Capa sem marca |
| `POST /api/admin/cache/invalidate` | HMAC/segredo | Cache |
| `POST /api/webhook/mercado-pago` | HMAC Mercado Pago | Webhook |
| `/api/pascom/*` | Clerk + `EquipePascom` | Painel equipe |

### 10.4. Endpoints Pascom protegidos

| Endpoint | Uso |
| --- | --- |
| `GET /api/pascom/me` | Identidade do membro |
| `GET /api/pascom/dashboard` | Resumo operacional |
| `GET /api/pascom/pedidos` | Lista pedidos |
| `GET /api/pascom/pedidos/:pedidoId` | Detalhe seguro |
| `POST /api/pascom/pedidos/:pedidoId/regenerar-downloads` | Regenera links de pedido aprovado |

### 10.5. Rate limits

Há limites separados para:

- geral;
- pagamento;
- cotação;
- fotos;
- mídia de galeria;
- consulta de status;
- recuperação de pedido;
- processamento;
- acesso de galeria;
- download;
- webhook;
- administração;
- área Pascom.

Motivo:

- checkout não deve ser bloqueado por carregamento de imagens;
- tentativas de código precisam ser mais restritas;
- webhook precisa ser protegido contra repetição;
- mídia precisa limitar abuso sem quebrar uso normal.

### 10.6. Cache

O backend usa Vercel Runtime Cache para reduzir:

- leituras repetidas do Sheets;
- downloads repetidos do Drive;
- latência da home e galerias.

Tags principais:

```text
catalogo-eventos
evento:{EventoID}
media:{EventoID}
```

Quando invalidar:

- evento publicado;
- evento arquivado;
- venda autorizada/revogada;
- visibilidade alterada;
- código revogado;
- fotos processadas/reprocessadas;
- capa alterada.

---

## 11. Pagamento, taxas e entrega

### 11.1. Preço base atual

No backend:

```text
Preço por foto: R$ 10,00
Taxa de serviço: R$ 2,00 por pedido
Taxa de comodidade: R$ 1,00 por pedido
Meios ativos no código: pix, credit_card
```

### 11.2. Como o total é calculado

```text
subtotal = quantidade * preço_unitário
desconto = cupom ou pacote, sem empilhar livremente
base = subtotal_com_desconto + taxa_serviço + taxa_comodidade
custo_pagamento = gross-up da taxa do meio
total = base + custo_pagamento
```

O custo de pagamento é estimado conforme `RegrasPagamento`.

### 11.3. Regras de pagamento

Para um meio aparecer/funcionar:

- precisa existir em `RegrasPagamento`;
- precisa estar `Ativo=SIM`;
- backend precisa reconhecer o meio;
- Mercado Pago precisa aceitar o método na conta/ambiente usado.

### 11.4. Pix

Pontos de atenção:

- Pix em modo teste pode não se comportar como produção;
- conta Mercado Pago precisa ter Pix habilitado;
- credenciais de produção são necessárias para teste real de Pix;
- se `default_payment_method_id` for incompatível com exclusões do Mercado Pago, ocorre erro.

Erro comum:

```text
invalid default_payment_method_id. The default payment method is excluded.
```

Interpretação:

- a preferência tentou forçar um método que o Mercado Pago também recebeu como excluído ou não disponível;
- revisar configuração do backend ao criar preferência;
- revisar métodos permitidos/excluídos;
- revisar se o ambiente suporta aquele método.

### 11.5. Cartão de crédito

Estado atual:

- `credit_card` é meio reconhecido;
- crédito em 1x pode ser configurado em `RegrasPagamento`;
- taxa estimada precisa ser cadastrada;
- total final deve ser recalculado no backend.

### 11.6. Débito

O débito virtual foi removido do checkout público, conforme decisões anteriores. Se voltar no futuro:

- precisa aparecer em `PAYMENT_METHODS`;
- precisa ter regra ativa;
- precisa ser suportado pelo Mercado Pago;
- precisa ser validado em sandbox/produção.

### 11.7. Cupons e pacotes

O projeto suporta:

- cupons percentuais;
- cupons de valor fixo;
- pacote por quantidade;
- pacote "levar todas";
- pacote família.

Regra importante:

- cupom e pacote não empilham livremente;
- backend compara e aplica a melhor condição válida.

### 11.8. Entrega por e-mail

Entrega usa SMTP via Nodemailer quando configurado.

Variáveis esperadas:

| Variável | Uso |
| --- | --- |
| `SMTP_HOST` | Host SMTP |
| `SMTP_PORT` | Porta |
| `SMTP_SECURE` | TLS |
| `SMTP_USER` | Usuário/remetente |
| `SMTP_APP_PASSWORD` | Senha de app |
| `SMTP_FROM_NAME` | Nome exibido |
| `SMTP_REPLY_TO` | Resposta |

Nunca coloque a senha no Git.

### 11.9. Status de e-mail

Possíveis estados:

| Status | Significado |
| --- | --- |
| `enviado` | E-mail enviado |
| `falhou` | Tentativa falhou |
| `nao_configurado` | SMTP ausente |

Se e-mail falhar:

- pedido continua aprovado;
- downloads continuam controlados;
- secretaria usa WhatsApp assistido;
- erro fica registrado.

### 11.10. WhatsApp assistido

O WhatsApp assistido não substitui segurança. Ele é um canal operacional para a secretaria enviar orientação ou links temporários quando o e-mail não funcionou.

---

## 12. Segurança, privacidade e LGPD

### 12.1. Princípios

- Original privado por padrão.
- Preview com marca d'água.
- Thumbnail leve.
- Download final só após pagamento aprovado.
- Galeria protegida quando houver risco.
- Código revogável.
- Tokens temporários.
- Rate limits.
- Auditoria mínima em Sheets.
- Política de privacidade pública.

### 12.2. O que não é possível prometer

Nenhum sistema impede totalmente:

- print da tela;
- foto da tela com outro celular;
- captura por ferramenta externa;
- cópia de imagem já exibida.

O projeto reduz risco com camadas:

- baixa resolução para preview;
- marca d'água;
- tokens;
- acesso por código;
- originais privados;
- downloads temporários;
- fingerprint forense no arquivo final.

### 12.3. Marca d'água

Usada em prévias vendáveis para:

- desencorajar uso indevido;
- deixar claro que é amostra;
- preservar utilidade visual para compra;
- proteger antes do pagamento.

Capas editoriais não devem receber marca visível quando usadas apenas como capa.

### 12.4. Fingerprint forense

No download final, o backend prepara uma cópia com fingerprint forense invisível/técnico vinculado ao pedido/download.

Objetivo:

- rastreabilidade se arquivo comprado for redistribuído;
- auditoria sem marca visível;
- proteção adicional além do link temporário.

### 12.5. Galeria protegida

Use para:

- eventos com crianças;
- adolescentes;
- batismo;
- primeira comunhão;
- crisma infantil;
- celebrações familiares;
- eventos com exposição sensível.

Não use código como "senha eterna". Código precisa poder ser revogado.

### 12.6. Menores

Regra conservadora:

```text
ProtecaoMenores=SIM
Visibilidade=protegida
VendaAutorizada=NAO até autorização expressa
```

Antes de vender:

- verificar autorização;
- revisar fotos;
- remover imagens sensíveis;
- aprovar pastoralmente.

### 12.7. Noindex/noimageindex

Galerias protegidas e imagens identificáveis não devem ser estimuladas para indexação pública. Quando o projeto controlar a página, usar política de privacidade, headers e orientações para reduzir indexação indevida.

### 12.8. Segredos e tokens

Nunca expor:

- token Mercado Pago;
- secret de webhook;
- private key Google;
- senha SMTP;
- JWT secret;
- salt de galeria;
- HMAC Apps Script;
- IDs de originais em APIs públicas;
- hash de token de download;
- código aberto de galeria.

### 12.9. Rotação de segredos

Rotacionar quando:

- alguém colou segredo em chat/documento;
- segredo apareceu em log;
- membro saiu da equipe;
- suspeita de acesso indevido;
- mudança para produção;
- revisão periódica.

Segredos sensíveis:

```text
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
GOOGLE_PRIVATE_KEY ou GOOGLE_PRIVATE_KEY_B64
DOWNLOAD_JWT_SECRET
GALLERY_SESSION_SECRET
GALLERY_CODE_SALT
FORENSIC_WATERMARK_SECRET
MEDIA_TOKEN_SECRET
APPS_SCRIPT_HMAC_SECRET
WATERMARK_API_SECRET
CACHE_INVALIDATION_SECRET
SMTP_APP_PASSWORD
CLERK_SECRET_KEY
```

Este dossiê lista nomes de variáveis, não valores reais.

---

## 13. Ambiente, deploy e produção

### 13.1. Pré-requisitos

- Node.js LTS.
- npm.
- Projeto Google Cloud.
- APIs Google Sheets e Drive.
- Service account.
- Planilha compartilhada com service account.
- Projeto Mercado Pago.
- Projeto Vercel.
- Projeto Clerk, se área Pascom estiver ativa.
- Conta SMTP/Gmail com senha de app, se envio por e-mail estiver ativo.
- `clasp` via `npx` para Apps Script.

### 13.2. Instalação local

```powershell
cd C:\Users\muril\OneDrive\Documentos\claude\Pessoal\Pascom\Drive

cd frontend
npm install

cd ..\backend
npm install

cd ..\google-apps-script
npm install
```

### 13.3. Rodar local

Terminal backend:

```powershell
cd backend
npm run dev
```

Terminal frontend:

```powershell
cd frontend
npm run dev
```

Validar:

```powershell
curl http://localhost:3001/api/health
```

### 13.4. Variáveis frontend

| Variável | Uso |
| --- | --- |
| `VITE_API_BASE_URL` | Base da API local |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk público |

### 13.5. Variáveis backend Vercel

Obrigatórias conforme funcionalidades ativas:

```text
PUBLIC_APP_URL
FRONTEND_URL
SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY ou GOOGLE_PRIVATE_KEY_B64
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
GALLERY_SESSION_SECRET
GALLERY_CODE_SALT
DOWNLOAD_JWT_SECRET
FORENSIC_WATERMARK_SECRET
MEDIA_TOKEN_SECRET
APPS_SCRIPT_HMAC_SECRET
WATERMARK_API_SECRET
CACHE_INVALIDATION_SECRET
CLERK_SECRET_KEY
CLERK_AUTHORIZED_PARTIES
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_APP_PASSWORD
SMTP_FROM_NAME
SMTP_REPLY_TO
```

Use placeholders em documentação. Valores reais só no painel Vercel.

### 13.6. Produção Vercel

Checklist:

- [ ] projeto linkado à Vercel;
- [ ] variáveis configuradas em Production;
- [ ] variáveis configuradas em Preview, se usar PR;
- [ ] build do frontend passa;
- [ ] backend responde `/api/health`;
- [ ] domínio correto em `PUBLIC_APP_URL`;
- [ ] CORS aceita origem correta;
- [ ] webhook Mercado Pago aponta para `/api/webhook/mercado-pago`;
- [ ] Clerk usa domínios corretos;
- [ ] SMTP testado;
- [ ] headers de segurança ativos.

### 13.7. Produção Apps Script

Checklist:

- [ ] excluir arquivos Jest do editor online;
- [ ] publicar apenas arquivos produtivos;
- [ ] configurar Script Properties;
- [ ] executar `inicializarEstrutura()`;
- [ ] executar `cadastrarRegrasMercadoPagoD0()`, se apropriado;
- [ ] executar `criarTriggers()`;
- [ ] aceitar permissões;
- [ ] testar pasta válida;
- [ ] testar pasta inválida;
- [ ] testar capa;
- [ ] testar miniaturas.

### 13.8. Mercado Pago

Checklist:

- [ ] conta correta;
- [ ] credenciais de produção obtidas;
- [ ] webhook configurado;
- [ ] assinatura webhook anotada em variável segura;
- [ ] Pix habilitado na conta;
- [ ] cartão habilitado;
- [ ] taxas reais conferidas;
- [ ] regra de pagamento cadastrada na planilha;
- [ ] compra real pequena testada;
- [ ] repasse e tarifa conferidos.

### 13.9. Google Cloud/Drive/Sheets

Checklist:

- [ ] service account criada;
- [ ] Sheets API habilitada;
- [ ] Drive API habilitada;
- [ ] planilha compartilhada com service account;
- [ ] pastas criadas;
- [ ] IDs cadastrados no Apps Script;
- [ ] pastas com acesso restrito;
- [ ] originais privados;
- [ ] backups definidos.

---

## 14. Rotina de testes e validação

### 14.1. Testes frontend

```powershell
cd frontend
npm test
npm run build
```

Validar:

- home carrega;
- busca funciona;
- card inteiro abre evento;
- página entra no topo;
- evento carrega;
- foto selecionada fica marcada;
- carrinho atualiza;
- checkout valida campos;
- retorno de pagamento orienta;
- recuperação de pedido funciona;
- mobile está legível.

### 14.2. Testes backend

```powershell
cd backend
npm test
```

Validar:

- `GET /api/health`;
- eventos publicados;
- galeria pública;
- galeria protegida;
- checkout quote;
- checkout preference;
- webhook duplicado;
- download aprovado;
- token expirado;
- SMTP ausente;
- cache invalidation;
- rate limit.

### 14.3. Testes Apps Script

```powershell
cd google-apps-script
npm test
npm run validate:release
```

Validar:

- release não envia Jest;
- parser de pasta;
- registro de evento;
- registro de foto;
- geração de código;
- revogação;
- validações `SIM`/`NAO`;
- miniaturas;
- alertas administrativos.

### 14.4. Teste de fluxo real controlado

1. Criar pasta:

```text
ordem__2026-05-01__evento-piloto
```

2. Colocar `capa.jpg`.
3. Colocar 2 ou 3 fotos.
4. Rodar processamento.
5. Ver planilha.
6. Publicar evento.
7. Autorizar venda.
8. Abrir site.
9. Selecionar foto.
10. Fazer cotação.
11. Criar preferência Mercado Pago.
12. Pagar em ambiente adequado.
13. Receber webhook.
14. Confirmar pedido.
15. Baixar foto.
16. Testar recuperação.

### 14.5. Teste de galeria protegida

- criar evento protegido;
- gerar código;
- tentar abrir sem código;
- tentar código errado;
- tentar código certo;
- selecionar foto;
- revogar código;
- confirmar que sessão antiga não deve permanecer válida após revogação conforme regra atual;
- gerar novo código.

### 14.6. Teste de menores

- marcar `ProtecaoMenores=SIM`;
- manter `Visibilidade=protegida`;
- manter `VendaAutorizada=NAO` até aprovação;
- revisar fotos;
- registrar decisão pastoral;
- só então publicar/vender.

---

## 15. Troubleshooting

### 15.1. `ReferenceError: jest is not defined`

Sintoma:

```text
ReferenceError: jest is not defined
```

Causa:

- arquivos de teste foram enviados para o Apps Script online.

Solução:

1. Excluir `jest-setup.gs`, `jest.config.gs` e testes do editor online.
2. Manter só arquivos produtivos.
3. Publicar por `npm run push:production`.
4. Verificar `.claspignore`.

### 15.2. Erro de permissão `MailApp.sendEmail`

Sintoma:

```text
Required permissions: https://www.googleapis.com/auth/script.send_mail
```

Causa:

- Apps Script não recebeu autorização para envio administrativo.

Solução:

1. Confirmar escopo em `appsscript.json`.
2. Executar função manualmente.
3. Aceitar permissões.
4. Rodar novamente.

### 15.3. Validação `SIM`/`NAO`

Sintoma:

```text
Os dados inseridos violam regras de validação. Insira um destes valores: SIM, NAO.
```

Causa:

- script ou usuário tentou gravar `Sim`, `Não`, `NÃO`, vazio ou outro texto em coluna validada.

Solução:

- usar exatamente `SIM` ou `NAO`;
- corrigir função que escreve na coluna;
- rodar `inicializarEstrutura()` se validação estiver antiga.

### 15.4. Pix `invalid default_payment_method_id`

Sintoma:

```text
invalid default_payment_method_id. The default payment method is excluded.
```

Causas possíveis:

- backend forçou Pix e também excluiu Pix;
- método não está disponível no ambiente;
- conta Mercado Pago não habilitou Pix;
- credencial sandbox não suporta Pix como produção;
- regra de pagamento não bate com preferência criada.

Solução:

1. Conferir criação da preferência.
2. Conferir métodos excluídos.
3. Conferir conta Mercado Pago.
4. Testar com credenciais de produção quando for Pix real.
5. Não prometer Pix antes de validar.

### 15.5. Imagens aparecem cortadas

Causa:

- `object-fit: cover` corta imagem para manter card bonito.

Correção adotada:

- usar `object-position: top center` nos cards, quando a ideia é começar do topo e cortar para baixo.

Validação:

- cards de busca;
- cards home;
- capa do evento;
- mobile.

### 15.6. Evento aparece com título estranho

Exemplo:

```text
Padre Paulo Na França_202605261456
```

Causa:

- carimbo de data/hora entrou no nome.

Solução:

- executar `normalizarMetadadosEventos()`;
- corrigir `Titulo` manualmente se necessário;
- manter `NomePasta` para auditoria.

### 15.7. Eventos mockados aparecem

Causa:

- fallback demonstrativo ou catálogo local ainda ativo.

Solução:

- remover fallback de mock quando eventos reais existirem;
- garantir `GET /api/eventos` retornando eventos reais;
- publicar evento real na planilha;
- limpar cache.

### 15.8. Home demora para carregar

Causas:

- Sheets lento;
- imagens vindo do Drive sem cache;
- previews pesadas;
- falta de thumbnails.

Soluções:

- Runtime Cache;
- `ThumbnailFileID`;
- thumbnails em pasta própria;
- skeletons no frontend;
- invalidação por cache;
- reprocessar miniaturas.

### 15.9. Foto não aparece no site

Verificar:

- evento está `publicado`;
- foto está `StatusProcessamento=Processada`;
- foto não é `TipoFoto=capa`;
- foto tem `ThumbnailFileID`;
- evento está público ou usuário tem código;
- cache foi invalidado;
- API não retorna erro.

### 15.10. Compra bloqueada

Verificar:

- `VendaAutorizada=SIM`;
- foto `DisponivelVenda=SIM`;
- regra de pagamento ativa;
- token de galeria protegido válido;
- evento não arquivado;
- checkout não atingiu rate limit.

### 15.11. Rate limit de pagamento

Sintoma:

```text
Limite de tentativas de pagamento atingido. Aguarde 1 minuto.
```

Interpretação:

- proteção contra abuso/falhas repetidas;
- pode ocorrer em testes muito rápidos.

Solução:

- aguardar janela;
- revisar se frontend chama quote/preference muitas vezes;
- em dev, ajustar limite com cuidado;
- em produção, não remover sem análise.

---

## 16. Treinamento da equipe

### 16.1. Objetivo do treinamento

Ensinar a equipe a operar um evento real sem depender do dev para tarefas pastorais/administrativas.

### 16.2. Treinamento recomendado de 60 minutos

| Tempo | Tema |
| --- | --- |
| 10 min | Objetivo pastoral, papéis e limites |
| 15 min | Fiel usando site no desktop e celular |
| 15 min | Pascom criando pasta, capa e revisando planilha |
| 10 min | Mercado Pago, taxas e entrega |
| 10 min | Falhas, suporte, remoção e checklist final |

### 16.3. O que ensinar ao padre/coordenador

- aprovar ou negar venda;
- definir galeria protegida;
- decidir regra de menores;
- autorizar piloto;
- validar linguagem pública.

### 16.4. O que ensinar à Pascom

- criar pasta no padrão;
- colocar capa;
- subir fotos;
- revisar processamento;
- revisar evento antes de publicar;
- avisar secretaria/financeiro.

### 16.5. O que ensinar à secretaria

- explicar galeria protegida;
- orientar compra;
- recuperar pedido;
- usar WhatsApp assistido;
- registrar remoção;
- encaminhar problema financeiro.

### 16.6. O que ensinar ao financeiro

- conferir Mercado Pago;
- validar taxas;
- conferir pedidos;
- tratar estorno;
- registrar divergência.

### 16.7. O que ensinar aos fotógrafos

- qualidade mínima;
- não misturar eventos;
- separar capa;
- evitar fotos sensíveis;
- avisar se há menores;
- subir fotos no prazo.

---

## 17. Governança e rotina de operação

### 17.1. Rotina antes do evento

- [ ] decidir se evento será fotografado;
- [ ] decidir se haverá venda;
- [ ] criar pasta no Drive, se necessário;
- [ ] definir fotógrafo;
- [ ] definir responsável por revisão;
- [ ] definir se envolve menores;
- [ ] definir se será protegido.

### 17.2. Rotina depois do evento

- [ ] subir fotos;
- [ ] separar capa;
- [ ] aguardar processamento;
- [ ] revisar planilha;
- [ ] revisar fotos;
- [ ] publicar;
- [ ] autorizar venda, se aplicável;
- [ ] divulgar link;
- [ ] monitorar pedidos.

### 17.3. Rotina semanal

- revisar eventos rascunho;
- revisar erros de processamento;
- revisar pedidos pendentes;
- conferir e-mails falhos;
- conferir webhooks divergentes;
- conferir downloads expirados;
- limpar dúvidas da secretaria.

### 17.4. Rotina mensal

- conciliar Mercado Pago;
- revisar taxas;
- revisar eventos arquivados;
- revisar permissões da equipe;
- revisar pedidos de remoção;
- avaliar desempenho/cache;
- atualizar documentação se algo mudou.

### 17.5. Política de mudanças

Qualquer mudança em:

- pagamento;
- privacidade;
- menores;
- entrega;
- preço;
- taxa;
- acesso de equipe;
- provedores externos;

deve ser documentada e comunicada antes de produção.

---

## 18. Roadmap, riscos e evolução futura

### 18.1. Riscos atuais

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Sheets como banco | Concorrência e lentidão | Cache, locks, futuro banco transacional |
| Operação manual | Campo errado quebra fluxo | Validações, treinamento, checklist |
| Pix em produção | Diferença sandbox/real | Teste real pequeno |
| SMTP Gmail | Limite/bloqueio | Domínio próprio no futuro |
| Menores | Risco pastoral/LGPD | Proteção conservadora |
| Segredos | Vazamento | Vercel env, Script Properties, rotação |
| Drive | Permissões incorretas | Pastas privadas e revisão |
| Webhook | Duplicidade/fraude | HMAC, idempotência, consulta API |

### 18.2. Melhorias futuras

Obrigatórias quando crescer:

- banco transacional para pedidos/webhooks/downloads;
- auditoria administrativa mais forte;
- painel Pascom com roles granulares;
- logs estruturados externos;
- domínio próprio e e-mail transacional;
- fila de processamento de imagem;
- reconciliação financeira automática;
- relatório de vendas;
- rotina de backup.

### 18.3. Possível migração futura

Arquitetura futura sugerida:

```text
Sheets
  -> apenas painel editorial de eventos/fotos

Postgres
  -> pedidos, webhooks, downloads, auditoria, usuários

Fila
  -> processamento de imagens

Storage dedicado
  -> derivados e originais com URLs assinadas
```

Não é obrigatório para o MVP, mas será importante se volume crescer.

---

## 19. Checklists práticos

### 19.1. Checklist de evento piloto

- [ ] Evento escolhido.
- [ ] Responsável pastoral definido.
- [ ] Responsável Pascom definido.
- [ ] Fotógrafo definido.
- [ ] Secretaria avisada.
- [ ] Financeiro avisado.
- [ ] Pasta criada no padrão.
- [ ] Capa preparada.
- [ ] Fotos subidas.
- [ ] Processamento concluído.
- [ ] Evento revisado.
- [ ] Privacidade avaliada.
- [ ] Venda autorizada ou bloqueada.
- [ ] Galeria publicada.
- [ ] Compra teste feita.
- [ ] Entrega testada.
- [ ] Dúvidas registradas.

### 19.2. Checklist de produção

- [ ] Variáveis Vercel configuradas.
- [ ] Propriedades Apps Script configuradas.
- [ ] Planilha inicializada.
- [ ] Mercado Pago produção configurado.
- [ ] Webhook validado.
- [ ] SMTP testado.
- [ ] Clerk configurado.
- [ ] Área Pascom testada.
- [ ] Política de privacidade revisada.
- [ ] Apps Script publicado sem testes.
- [ ] Cache invalidation testado.
- [ ] Download aprovado testado.
- [ ] Pedido recuperado testado.
- [ ] Evento protegido testado.
- [ ] Evento público testado.

### 19.3. Checklist de segurança

- [ ] Nenhum segredo no Git.
- [ ] Nenhum segredo em documentação.
- [ ] Originais privados.
- [ ] Galerias sensíveis protegidas.
- [ ] Menores avaliados.
- [ ] Marca d'água em previews.
- [ ] Download temporário.
- [ ] Webhook HMAC.
- [ ] Rate limits ativos.
- [ ] Logs sem dados sensíveis.
- [ ] Permissões Drive revisadas.

### 19.4. Checklist financeiro

- [ ] Preço por foto aprovado.
- [ ] Taxa de serviço aprovada.
- [ ] Taxa de comodidade aprovada.
- [ ] Taxa Pix cadastrada.
- [ ] Taxa cartão cadastrada.
- [ ] Conta Mercado Pago oficial.
- [ ] Responsável por conciliação.
- [ ] Processo de estorno definido.
- [ ] Processo de contestação definido.

### 19.5. Checklist de atendimento

- [ ] Mensagem padrão de compra.
- [ ] Mensagem padrão de código.
- [ ] Mensagem padrão de e-mail não recebido.
- [ ] Mensagem padrão de pagamento pendente.
- [ ] Mensagem padrão de remoção.
- [ ] Responsável por WhatsApp assistido.
- [ ] Horário de atendimento definido.

---

## 20. Referências internas

Documentos canônicos atuais:

- `docs/project-overview.md`
- `docs/architecture.md`
- `docs/system-flows.md`
- `docs/database.md`
- `docs/apis.md`
- `docs/setup-environment.md`
- `docs/components.md`
- `docs/mobile-experience.md`
- `docs/security-hardening-plan.md`
- `docs/security-incident-response.md`
- `docs/technical-audit.md`
- `docs/technical-roadmap.md`
- `google-apps-script/DEPLOY.md`

Entregáveis de apresentação e reunião:

- `entregaveis/producao-apresentacao/apresentacao-pascom-drive-conversa.html`
- `entregaveis/producao-apresentacao/apresentacao-pascom-drive-conversa.md`
- `entregaveis/producao-apresentacao/checklist-stakeholders-pascom-drive.html`
- `entregaveis/producao-apresentacao/checklist-stakeholders-pascom-drive.md`

Arquivos técnicos centrais:

- `frontend/src/App.jsx`
- `frontend/src/lib/api.js`
- `frontend/src/data/categories.js`
- `backend/server.js`
- `backend/lib/pricing.js`
- `backend/lib/commercial-rules.js`
- `google-apps-script/Code.js`
- `google-apps-script/Sheet.js`
- `google-apps-script/Watermark.js`

---

## Nota final

O Pascom Drive é mais que um site de fotos. Ele é um processo pastoral, operacional e financeiro que usa tecnologia para reduzir improviso. O sucesso depende menos de uma tela bonita e mais de três acordos claros:

1. quem pode publicar;
2. quem pode autorizar venda;
3. quem responde quando algo dá errado.

Com esses acordos, o sistema deixa de ser "um projeto do dev" e passa a ser uma rotina segura da Pascom.
