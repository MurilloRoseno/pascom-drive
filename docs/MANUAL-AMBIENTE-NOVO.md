# Manual: ambiente novo do Pascom Drive

**Endereço:** https://gepym7hvg7.vercel.app
**Projeto Vercel:** `gepym7hvg7` (conta `murillos-projects-b79f04ab`)
**Branch:** `deploy/gepym7hvg7`
**Criado em:** 20/09/2026

> **O endereço só é discreto enquanto este repositório for privado.** O nome aparece aqui, no
> histórico do Git, na sua conta da Vercel e nos registros públicos de certificado TLS. Serve para
> não ser achado por acaso; não serve como tranca. Se o repositório virar público, troque o nome do
> projeto na Vercel (Settings > General > Project Name) e refaça o passo 5.

O ambiente antigo (`pascom-drive.vercel.app`) continua no ar e não é tocado por nada deste manual.
São dois ambientes independentes: planilha, pastas do Drive, Apps Script e credenciais separados.

---

## O que já está pronto

| Item | Estado |
| --- | --- |
| Código das fases 1 a 5 commitado | ✅ branch `deploy/gepym7hvg7` no GitHub |
| Projeto na Vercel + primeiro deploy | ✅ https://gepym7hvg7.vercel.app responde |
| `GET /api/health` | ✅ `{"status":"ok"}` |
| Variáveis de ambiente | ⬜ **passo 5 deste manual** |
| Planilha, Drive e Apps Script do ambiente novo | ⬜ **passos 1 a 4** |

Enquanto os passos abaixo não forem feitos, o site público abre, mas a lista de eventos fica vazia
(erro 500 nas chamadas de API), o painel `/pascom` mostra "Configuração pendente" e o checkout não
abre. É o esperado.

---

## Como este deploy funciona (leitura de 2 minutos)

- **Um projeto, duas partes.** `vercel.json` na raiz manda a Vercel buildar dois pacotes: o backend
  Express (`backend/api/index.js`, função serverless com 30 s de limite) e o frontend Vite
  (`frontend/`, estático). Tudo que começa com `/api/` vai para o Express; o resto cai no
  `index.html` do React.
- **Configuração de build do painel é ignorada.** Como o `vercel.json` usa `builds`, os campos
  "Framework Preset", "Build Command" e "Root Directory" das Settings não têm efeito. Não mexa neles.
- **Variáveis `VITE_*` são de build.** Elas entram no bundle no momento do build; mudar o valor só
  vale depois de um **novo deploy**. As demais são lidas a cada requisição.
- **Deploy pelo CLI, não pelo GitHub.** O projeto não está conectado ao repositório: quem publica é
  o comando `vercel deploy --prod` rodado nesta pasta. Assim nenhum push acidental vai para o ar.

---

## Passo 1 — Planilha nova

1. Criar uma planilha em branco no Google Drive da Pascom (a mesma conta que já é dona das pastas).
2. Dar um nome que você reconheça, por exemplo `Pascom Drive — ambiente gepym7hvg7`.
3. Copiar o **ID** da URL: `https://docs.google.com/spreadsheets/d/`**`ESTE-PEDACO`**`/edit`.
4. Botão **Compartilhar** > adicionar o e-mail da conta de serviço do Google como **Editor**.
   É o valor de `GOOGLE_SERVICE_ACCOUNT_EMAIL` (termina em `.iam.gserviceaccount.com`); se não tiver
   anotado, ele está no painel da Vercel do projeto antigo ou no JSON da conta de serviço.

As abas (`Eventos`, `Fotos`, `Pedidos`, …) são criadas sozinhas no passo 4. Não crie nada à mão.

> Sem o compartilhamento com a conta de serviço, o backend abre a planilha e recebe "permission
> denied" — a aba Sistema do painel mostra isso em vermelho, com essa mesma explicação.

---

## Passo 2 — Pastas novas no Drive

Criar quatro pastas (podem ficar dentro de uma pasta-mãe, por exemplo `Pascom gepym7hvg7`):

| Pasta | Para quê |
| --- | --- |
| `Fotos_Origem` | onde as fotos enviadas pelo painel chegam e esperam o processamento |
| `originais` | o arquivo original de cada foto, que o comprador recebe ao pagar |
| `amostras` | as prévias com marca d'água que aparecem no site |
| `miniaturas` | as miniaturas da galeria |

De cada uma, copiar o **ID** da URL: `https://drive.google.com/drive/folders/`**`ESTE-PEDACO`**.

**Compartilhar `originais`, `amostras` e `miniaturas` com a conta de serviço como Leitor.** O
backend lê esses arquivos por ela para entregar o download pago e servir as prévias; sem isso o
download devolve erro mesmo com o pagamento confirmado.

---

## Passo 3 — Gerar os segredos deste ambiente

Não reaproveite os segredos do ambiente antigo: se um vazar, vaza um ambiente só. Rode este comando
**oito vezes**, uma para cada linha da tabela, e guarde os valores num lugar seguro (gerenciador de
senhas). Cada execução dá um valor diferente.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Segredo | Onde vai | Precisa ser igual dos dois lados? |
| --- | --- | --- |
| `APPS_SCRIPT_HMAC_SECRET` | Vercel + Apps Script | **sim** |
| `WATERMARK_API_SECRET` | Vercel + Apps Script | **sim** |
| `CACHE_INVALIDATION_SECRET` | Vercel + Apps Script | **sim** |
| `GALLERY_CODE_SALT` | Vercel + Apps Script | **sim** |
| `DOWNLOAD_JWT_SECRET` | só Vercel | não |
| `FORENSIC_WATERMARK_SECRET` | só Vercel | não |
| `GALLERY_SESSION_SECRET` | só Vercel | não |
| `MEDIA_TOKEN_SECRET` | só Vercel | não |

> Os quatro primeiros são a senha compartilhada entre o backend e o Apps Script. Um caractere de
> diferença e o painel responde "assinatura recusada" no envio de fotos, e os códigos de acesso das
> galerias param de conferir.

---

## Passo 4 — Apps Script novo

O Apps Script é quem processa as fotos e chama o backend a cada 5 minutos. **Um projeto só consegue
falar com uma Vercel**, por isso o ambiente novo precisa do seu próprio.

### 4.1 Criar e enviar o código

Na pasta `google-apps-script/` do repositório:

```bash
mv .clasp.json .clasp.antigo.json
npx --yes @google/clasp@3.3.0 login
npx --yes @google/clasp@3.3.0 create --type standalone --title "Pascom Drive gepym7hvg7"
npm run push:production
```

O `push:production` valida e envia os 13 arquivos de produção (`Code.js`, `Upload.js`, `Sistema.js`,
`Processamento.js`, `Entregas.js` e companhia). Nenhum arquivo de teste sobe.

> Para voltar a mexer no script antigo depois: `mv .clasp.antigo.json .clasp.json`.
> Guarde os dois arquivos; eles só têm o ID do projeto, não são segredo.

### 4.2 Propriedades do script

No editor (`npx @google/clasp@3.3.0 open`): **Configurações do projeto > Propriedades do script**.

| Propriedade | Valor |
| --- | --- |
| `SOURCE_FOLDER_ID` | ID de `Fotos_Origem` (passo 2) |
| `ORIGINAIS_FOLDER_ID` | ID de `originais` |
| `AMOSTRAS_FOLDER_ID` | ID de `amostras` |
| `THUMBNAILS_FOLDER_ID` | ID de `miniaturas` |
| `SPREADSHEET_ID` | ID da planilha (passo 1) |
| `BACKEND_URL` | `https://gepym7hvg7.vercel.app` |
| `APPS_SCRIPT_HMAC_SECRET` | segredo do passo 3 |
| `WATERMARK_API_SECRET` | segredo do passo 3 |
| `CACHE_INVALIDATION_SECRET` | segredo do passo 3 |
| `GALLERY_CODE_SALT` | segredo do passo 3 |
| `ADMIN_EMAIL` | seu e-mail (avisos de espaço no Drive e de entrega que falhou) |

### 4.3 Rodar as três funções de preparo

No editor, escolher a função na barra de cima e clicar em **Executar**. Na primeira vez o Google
pede autorização — aceite com a conta dona das pastas.

1. `inicializarEstrutura()` — cria todas as abas da planilha com os cabeçalhos certos.
2. `criarTriggers()` — instala o gatilho de 5 minutos que processa fotos e confere pagamentos.
3. `cadastrarRegrasMercadoPagoD0()` — preenche a aba `RegrasPagamento` (sem ela o checkout recusa
   qualquer meio de pagamento).

### 4.4 Publicar o app da Web

**Implantar > Nova implantação > Tipo: app da Web**, com:

- Executar como: **eu**
- Quem pode acessar: **qualquer pessoa**

Copiar a URL que termina em `/exec` — é o valor de `UPLOAD_WEBAPP_URL` no passo 5.

> A porta de entrada é a assinatura HMAC, não o login: "qualquer pessoa" aqui significa que o
> backend consegue chamar o Web App, e quem não tem o segredo é recusado.

### 4.5 Liberar o seu acesso ao painel

Na planilha nova, aba **`EquipePascom`** (criada no 4.3, vazia), acrescentar uma linha:

| Identificador | Tipo | Nome | Role | Ativo |
| --- | --- | --- | --- | --- |
| seu-email@exemplo.com | `email` | Seu nome | `admin` | `SIM` |

Sem essa linha, o Clerk autentica mas o painel responde 403 — ninguém entra.

---

## Passo 5 — Variáveis na Vercel

Painel da Vercel > projeto **`gepym7hvg7`** > **Settings > Environment Variables**, ambiente
**Production** (marque também *Preview* se quiser testar branches).

Pelo terminal, o equivalente é `vercel env add NOME production` dentro desta pasta (ele pergunta o
valor e não mostra na tela).

### 5.1 Do endereço novo — digite exatamente assim

| Variável | Valor |
| --- | --- |
| `PUBLIC_APP_URL` | `https://gepym7hvg7.vercel.app` |
| `FRONTEND_URL` | `https://gepym7hvg7.vercel.app` |
| `CLERK_AUTHORIZED_PARTIES` | `https://gepym7hvg7.vercel.app` |

> **Esta é a armadilha número um.** Se `PUBLIC_APP_URL` faltar, nada falha de forma visível: o
> código usa `https://pascom-drive.vercel.app` como padrão embutido. O resultado é que o Mercado
> Pago devolve o comprador para o site antigo, o webhook do pagamento chega no ambiente antigo e os
> links de download no e-mail apontam para lá.

### 5.2 Do ambiente novo

| Variável | Valor |
| --- | --- |
| `SPREADSHEET_ID` | ID da planilha (passo 1) |
| `UPLOAD_WEBAPP_URL` | URL `/exec` (passo 4.4) |
| `APPS_SCRIPT_HMAC_SECRET` | passo 3 — **idêntico** ao do Apps Script |
| `WATERMARK_API_SECRET` | passo 3 — **idêntico** ao do Apps Script |
| `CACHE_INVALIDATION_SECRET` | passo 3 — **idêntico** ao do Apps Script |
| `GALLERY_CODE_SALT` | passo 3 — **idêntico** ao do Apps Script |
| `DOWNLOAD_JWT_SECRET` | passo 3 |
| `FORENSIC_WATERMARK_SECRET` | passo 3 |
| `GALLERY_SESSION_SECRET` | passo 3 |
| `MEDIA_TOKEN_SECRET` | passo 3 |

> `UPLOAD_WEBAPP_URL` **não existia** no projeto antigo — é por isso que o envio de fotos pelo
> painel nunca funcionou lá. Aqui ela é obrigatória.

### 5.3 Reaproveitados do ambiente antigo

Esses valores são os mesmos. Para lê-los, aponte o CLI para o projeto antigo por um instante:

```bash
vercel link --yes --project pascom-drive
vercel env pull .env.antigo --environment=production
# abra .env.antigo, copie o que precisar, e depois:
rm .env.antigo
vercel link --yes --project gepym7hvg7
```

| Variável | O que é | Onde mais achar |
| --- | --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | e-mail da conta de serviço | JSON da conta de serviço |
| `GOOGLE_PRIVATE_KEY_B64` | chave privada em base64 | JSON da conta de serviço |
| `CLERK_SECRET_KEY` | chave secreta do Clerk | painel do Clerk > API Keys |
| `VITE_CLERK_PUBLISHABLE_KEY` | chave pública do Clerk (**usada no build**) | painel do Clerk > API Keys |
| `SMTP_USER` | e-mail que envia as fotos | — |
| `SMTP_APP_PASSWORD` | senha de app do Gmail | conta Google > Segurança > Senhas de app |
| `SMTP_HOST` · `SMTP_PORT` · `SMTP_SECURE` | servidor de e-mail | opcionais (padrão: Gmail, 465, true) |
| `SMTP_FROM_NAME` · `SMTP_REPLY_TO` | nome e e-mail de resposta | opcionais |
| `ALLOW_LEGACY_WORKER_SECRET` | deixe `false` | — |

### 5.4 Mercado Pago em modo de teste

| Variável | Valor |
| --- | --- |
| `MP_ACCESS_TOKEN` | credencial **de teste** da sua aplicação (começa com `TEST-`) |
| `MP_WEBHOOK_SECRET` | segredo do webhook da mesma aplicação |
| `MP_USE_SANDBOX` | `true` |

Em **mercadopago.com.br/developers > sua aplicação**: copie as credenciais de teste e cadastre o
webhook apontando para `https://gepym7hvg7.vercel.app/api/webhook/mercado-pago`, evento
**Pagamentos**.

> **Pix não existe em sandbox.** O teste de ponta a ponta é com cartão de teste. Quando quiser
> valer de verdade, troque as duas credenciais pelas de produção e apague `MP_USE_SANDBOX`.

### 5.5 Não cadastre

| Variável | Por quê |
| --- | --- |
| `VITE_API_BASE_URL` | vazio = mesma origem, que é o certo aqui. Preenchida com o domínio antigo, o site novo passa a chamar o backend velho |
| `NODE_ENV` | a Vercel já define como `production` |
| `SOURCE_FOLDER_ID`, `ORIGINAIS_FOLDER_ID`, `AMOSTRAS_FOLDER_ID`, `ADMIN_EMAIL` | pertencem ao Apps Script (passo 4.2), não à Vercel |

---

## Passo 6 — Clerk

No painel do Clerk, na **mesma aplicação de hoje**, adicionar `https://gepym7hvg7.vercel.app` em:

- **Domains / Allowed origins** (ou *Satellite domains*, conforme a sua instância);
- a lista de URLs de redirecionamento, se a sua configuração usar uma.

As chaves não mudam e a equipe entra com o mesmo login. Quem tem acesso ao painel continua sendo
decidido pela aba `EquipePascom` da **planilha nova** (passo 4.5).

---

## Passo 7 — Publicar de novo

As variáveis `VITE_*` só entram num build novo. Nesta pasta:

```bash
vercel deploy --prod --yes
```

Leva cerca de um minuto. (Ou me peça: eu rodo e faço a verificação do passo 8.)

---

## Passo 8 — Verificação

1. **API viva:**
   ```bash
   curl https://gepym7hvg7.vercel.app/api/health
   ```
   Esperado: `{"status":"ok","timestamp":"..."}`.

2. **Site:** abrir https://gepym7hvg7.vercel.app — a home carrega e a lista de eventos aparece
   vazia, sem erro.

3. **Painel:** abrir https://gepym7hvg7.vercel.app/pascom, entrar com o Clerk e ir à aba
   **Sistema**. Ela roda o checklist inteiro e diz, item por item, o que ainda falta e como
   corrigir. Nenhum valor de segredo aparece ali.
   - "Mercado Pago em modo de teste" em amarelo é o esperado neste ambiente.
   - "Conferência dos pagamentos — ainda não rodou" desaparece sozinho depois do primeiro ciclo do
     gatilho (até 5 minutos).

4. **Ida e volta com o Apps Script:** aba **Enviar fotos** do painel. Se a tela de envio abre e
   mostra o espaço livre do Drive, o HMAC e a `UPLOAD_WEBAPP_URL` estão certos.

---

## Passo 9 — Teste de ponta a ponta

1. Enviar um evento pequeno (5 a 10 fotos, uma delas marcada como capa) pela aba **Enviar fotos**.
2. Esperar até 5 minutos e ver o evento sair de "Na fila" para "Processado" na aba **Eventos**.
   Conferir na planilha: uma linha em `Eventos` e uma linha por foto em `Fotos`.
3. Revisar as miniaturas, **publicar** e **liberar a venda**.
4. Abrir o evento numa janela anônima, escolher uma foto e pagar com
   [cartão de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards).
5. Conferir: o e-mail com os links chega, o link baixa a foto sem marca d'água, e na aba **Pedidos**
   o pedido aparece como pago, sem nada em "Precisam de atenção".
6. **Teste do conserto automático:** troque `MP_WEBHOOK_SECRET` na Vercel por um valor errado, faça
   outra compra de teste e confira que, em até 5 minutos, a conciliação confirma o pedido e entrega
   as fotos mesmo assim. Depois volte o valor certo.

---

## Se algo der errado

| Sintoma | Causa provável |
| --- | --- |
| Site abre, eventos não carregam (500) | `SPREADSHEET_ID` ou credenciais do Google ausentes; planilha não compartilhada com a conta de serviço |
| Painel diz "Configuração pendente" | `VITE_CLERK_PUBLISHABLE_KEY` ausente **no build** — cadastre e rode o passo 7 |
| Login funciona mas o painel dá 403 | seu e-mail não está em `EquipePascom` com `Ativo=SIM` (passo 4.5) |
| Envio de fotos: "assinatura recusada" | `APPS_SCRIPT_HMAC_SECRET` diferente entre a Vercel e o Apps Script |
| Envio de fotos: "não configurado" | falta `UPLOAD_WEBAPP_URL`, ou a implantação do Web App não é "qualquer pessoa" |
| Fotos enviadas nunca processam | o gatilho não foi criado — rode `criarTriggers()` (passo 4.3) |
| Código de acesso da galeria nunca confere | `GALLERY_CODE_SALT` diferente entre a Vercel e o Apps Script |
| Comprador paga e não recebe | veja a aba **Pedidos** > "Precisam de atenção"; os botões "Reenviar entrega" e "Conferir no Mercado Pago" resolvem a maioria |
| Marca d'água falha só no deploy (local funciona) | o `package-lock.json` não é versionado, então a Vercel pode ter instalado outra versão do `sharp` |
| Download pago dá erro | pasta `originais` não compartilhada com a conta de serviço (passo 2) |

Logs do backend: painel da Vercel > projeto > **Logs** (filtre por `/api/`). Logs do Apps Script:
editor > **Execuções**.

---

## Como voltar atrás

- **Apontar o CLI de volta para o projeto antigo:**
  ```bash
  vercel link --yes --project pascom-drive
  ```
  (a ligação anterior está guardada em `.vercel/project.pascom-drive.json.bak`)
- **Tirar o ambiente novo do ar:** Vercel > projeto `gepym7hvg7` > Settings > **Pause Project**.
  Para apagar de vez, *Delete Project* — o endereço fica livre para outra pessoa registrar.
- **Desligar o gatilho do ambiente novo:** no editor do Apps Script novo, **Gatilhos** > excluir o
  de `processarEventos`.
- **O ambiente antigo não é afetado por nada disso**: outro Apps Script, outra planilha, outras
  pastas, outro projeto na Vercel.

---

## Dívidas conhecidas deste deploy

1. **Os cabeçalhos de segurança do `vercel.json` não estão sendo aplicados.** O arquivo declara
   `Content-Security-Policy`, `X-Frame-Options` e outros, mas usa `routes` e `headers` juntos, e a
   Vercel trata os dois como excludentes — conferido com `curl -I`, nenhum deles sai na resposta.
   O mesmo vale para o ambiente antigo; não é regressão. Corrigir exige trocar `routes` por
   `rewrites` e revisar o CSP (que hoje bloquearia o JS do Clerk e as fontes do Google se
   estivesse ativo). Fica para uma tarefa própria, com teste.
2. **`package-lock.json` não é versionado**, então dois deploys podem instalar versões diferentes
   das dependências.
3. **Sem `UPLOAD_WEBAPP_URL`, o ambiente antigo nunca conseguiu enviar fotos pelo painel** — se um
   dia ele voltar a ser o ambiente principal, cadastre a variável lá também.
