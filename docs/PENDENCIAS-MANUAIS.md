# O que falta fazer à mão (branch `painel`)

Tudo que o código podia resolver já está na branch `painel`. Este roteiro lista só o que depende de você: contas, chaves, cliques em painéis externos e decisões. A ordem sugerida é de cima para baixo; cada bloco diz **por que**, **como** e **como saber que deu certo**.

> **Regra de ouro:** chave, senha e segredo nunca vão para o git nem para o chat. Eles ficam em `backend/.env` (local) e nas variáveis de ambiente da Vercel (produção). Só use chaves **de teste** da Stripe e do Clerk até a hora de abrir ao público.

Legenda: ☐ a fazer · 🔴 bloqueia a venda · 🟡 importante · 🟢 pode esperar

---

## 1. Ver o painel funcionando (hoje, 10 min) 🟡

**Por quê:** as telas Agenda, Ajuda, Assistente, Conteúdo, Página inicial, Módulos e Backup só foram testadas por testes automáticos. Nunca foram vistas logadas, porque o login é seu.

☐ Com o backend (porta 3001) e o Vite (porta 3000) rodando, abra `http://localhost:3000/painel` e entre com o e-mail definido em `PAINEL_ADMIN_EMAIL`.
☐ Percorra o menu inteiro em três tamanhos: celular (~375 px), tablet (~768 px) e computador (~1280 px).
☐ Anote o que estiver feio, cortado ou confuso e me mande.

**Confirma o quê:** além do visual, esse login valida duas coisas que eu não consegui provar sozinho:
- a rota `/api/pascom/me` reconhece você como admin;
- a claim `fva` (login recente) existe no token do Clerk. Sem ela, mexer em preço/taxas não pede reautenticação (só registra no log). Para conferir: tente mudar o preço em **Pagamentos**; deve pedir para entrar de novo se o login for antigo. Se não pedir, veja no Dashboard do Clerk se a sessão inclui `fva` (Sessions → Customize session token).

---

## 2. Cadastrar a equipe real 🟡

☐ Em **Acessos → Equipe**, cadastre cada pessoa com o e-mail que ela usa no Clerk e o papel certo: `admin`, `coord` (coordenação), `foto` (fotógrafo), `atend` (atendimento).
☐ Confira a matriz de permissões na mesma tela; `modulos.gerenciar` e `acessos.gerenciar` ficam só com o admin (não dá para mudar).
☐ Peça para uma pessoa de cada papel entrar e conferir que só vê o que deve.

---

## 3. Teste de pagamento ponta a ponta (Stripe, modo teste) 🔴

**Por quê:** testei criação de sessão, valores, webhooks assinados e eventos reais da Stripe, mas **nunca um pagamento digitado**. Eu não preencho cartão; esse passo é seu.

☐ Deixe rodando: backend, Vite e o Stripe CLI recebendo webhooks:
```bash
stripe listen --forward-to localhost:3001/api/webhook/stripe
```
(o `whsec_...` que ele imprime precisa ser o `STRIPE_WEBHOOK_SECRET` do `backend/.env`).
☐ No site, escolha uma foto, vá ao checkout e pague na página da Stripe com o cartão de teste `4242 4242 4242 4242` (validade futura, CVC qualquer).
☐ **Cartão:** confira que o pedido aparece como pago na aba `Pedidos` da planilha e que a tela de status mostra "pago".
☐ **Pix:** repita escolhendo Pix. Em modo teste, a Stripe mostra um botão para simular o pagamento.
☐ Teste também um cartão que falha (`4000 0000 0000 0002`) e confira que o pedido **não** é liberado.
☐ Os pedidos de teste ficam na planilha (linhas com `TESTE`). Nada é apagado: marque como cancelado se quiser limpar.

**Importante:** só o webhook assinado confirma pagamento. A volta do navegador para o site não libera foto nenhuma.

---

## 4. Download real das fotos (credencial do Drive) 🔴

**Por quê:** a credencial do Google usada localmente dá 404 em todos os arquivos do Drive, então a entrega nunca foi vista funcionando.

☐ Compartilhe as pastas do Drive (originais, amostras e a de origem) com o e-mail da conta de serviço (`GOOGLE_SERVICE_ACCOUNT_EMAIL`), como **Leitor**.
☐ Confira que os IDs em `ORIGINAIS_FOLDER_ID`, `AMOSTRAS_FOLDER_ID` e `SOURCE_FOLDER_ID` são das pastas certas.
☐ Depois de pagar o pedido de teste (passo 3), abra o link de download recebido: deve baixar a foto original. O link vale **24 horas** e permite **2 usos**; no terceiro uso deve recusar.

---

## 5. Reimplantar o Apps Script 🟡

**Por quê:** o Apps Script agora lê a lista de categorias da aba `Categorias`. Sem reimplantar, ele segue com a lista antiga fixa.

☐ Em `google-apps-script/`, confirme que existe `.clasp.json` com o `scriptId` (arquivo local, ignorado pelo git; modelo em `google-apps-script/DEPLOY.md`).
☐ Publique **somente** assim (valida a lista de arquivos permitidos e impede subir testes):
```bash
cd google-apps-script && npm run push:production
```
☐ No editor do Apps Script, abra uma execução manual qualquer e aceite novas permissões se pedir.
☐ Confira que `APPS_SCRIPT_HMAC_SECRET` e `CACHE_INVALIDATION_SECRET` nas propriedades do script são iguais aos da Vercel.
**Confirma o quê:** crie uma categoria nova em **Categorias** e veja se ela é aceita ao processar uma pasta de evento.

---

## 6. Variáveis de ambiente na Vercel (produção) 🔴

**Por quê:** localmente tudo vem de `backend/.env`; em produção a Vercel não lê esse arquivo.

☐ No projeto da Vercel → Settings → Environment Variables, cadastre (Production e Preview):

| Variável | Valor |
| --- | --- |
| `PAYMENT_GATEWAY` | `stripe` (vazio = Mercado Pago, que está desligado no código) |
| `STRIPE_SECRET_KEY` | chave secreta da Stripe (teste até o lançamento) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` do **endpoint cadastrado no Dashboard** (passo 7), não o do `stripe listen` |
| `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` | chaves do Clerk |
| `CLERK_AUTHORIZED_PARTIES` | origens do site, separadas por vírgula (ex.: `https://seu-site.vercel.app`) |
| `PAINEL_ADMIN_EMAIL` | seu e-mail (entra sempre como admin) |
| `PUBLIC_APP_URL` | URL pública do site (usada nos retornos do pagamento e nos links de download) |
| `FRONTEND_URL` | mesma origem, para o CORS |
| `DOWNLOAD_JWT_SECRET` | segredo novo (gere abaixo) |
| `FORENSIC_WATERMARK_SECRET` | segredo novo (gere abaixo) |
| `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (ou `_B64`) | os mesmos do `.env` |
| `SOURCE_FOLDER_ID`, `ORIGINAIS_FOLDER_ID`, `AMOSTRAS_FOLDER_ID` | pastas do Drive |
| `ADMIN_EMAIL`, `SMTP_*` | avisos por e-mail |
| `APPS_SCRIPT_HMAC_SECRET`, `CACHE_INVALIDATION_SECRET`, `GALLERY_SESSION_SECRET`, `GALLERY_CODE_SALT` | como já estão hoje |

Para gerar cada segredo novo:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
☐ Use um valor **diferente** em produção e em teste para cada segredo.
☐ Depois de salvar, faça um novo deploy (variável nova só vale no próximo deploy).
☐ O frontend lê duas variáveis no build, e a Vercel também precisa delas: `VITE_CLERK_PUBLISHABLE_KEY` (a mesma chave publicável do Clerk) e, se o frontend e a API ficarem em endereços diferentes, `VITE_API_BASE_URL`. Sem a chave do Clerk, o login do painel não aparece.

---

## 7. Webhook da Stripe apontando para a produção 🔴

☐ Dashboard da Stripe (modo teste) → Developers → Webhooks → **Add endpoint**.
☐ URL: `https://SEU-DOMINIO/api/webhook/stripe`
☐ Eventos a assinar (exatamente estes, o código só trata eles):
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
☐ Copie o `Signing secret` (`whsec_...`) do endpoint para `STRIPE_WEBHOOK_SECRET` na Vercel (passo 6) e faça novo deploy.
☐ Use "Send test webhook" no Dashboard e veja se chega com resposta 200 (os logs da Vercel mostram).

---

## 8. Conferir as tarifas da Stripe 🟡

**Por quê:** o painel repassa as taxas de forma transparente usando números que **eu digitei como padrão**: cartão 3,99% + R$ 0,39 e Pix 1,19%, mais taxa de serviço R$ 2,00 e de comodidade R$ 1,00 sobre foto de R$ 5,00. Se a sua conta tiver outra tarifa, o cálculo fica errado.

☐ No Dashboard da Stripe, veja a tarifa real da sua conta para cartão e Pix.
☐ Em **Painel → Pagamentos**, ajuste as tarifas e use o **simulador** para ver o total que o cliente paga e quanto sobra para a paróquia.
☐ (Mudar preço e tarifas pede login recente; é proposital.)
☐ Confirme com a coordenação se R$ 5,00 por foto e as duas taxas são o que querem cobrar.

---

## 9. Publicar uma prévia na Vercel e conferir os cabeçalhos de segurança 🔴

**Por quê:** o `vercel.json` ignorava os cabeçalhos de segurança, então o site respondia sem nenhum. Eu corrigi, mas **não dá para provar localmente** que a Vercel entrega.

☐ Faça o push da branch `painel` e abra o deploy de prévia.
☐ Rode (troque pela URL da prévia):
```bash
curl -I https://SUA-PREVIA.vercel.app/
```
☐ Deve aparecer: `Content-Security-Policy-Report-Only`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `Permissions-Policy`.
☐ Se faltar algum, me avise (a causa quase certa é a ordem das rotas no `vercel.json`).
☐ Navegue pela Home, um evento, o checkout, `/painel` e `/pascom` com o console do navegador aberto e veja se o login do Clerk e as imagens funcionam.
☐ **Atenção:** a prévia pode vir protegida por login da Vercel (Deployment Protection); se o `curl` voltar 401, é isso, não é bug.

---

## 10. Ativar (ou não) o bloqueio da CSP 🟢

**Hoje:** a CSP só observa (Report-Only). Nada é bloqueado; violações vão para o log da Vercel com o prefixo `[csp-report]`.

☐ Depois de **alguns dias** de uso real, procure `[csp-report]` nos logs de runtime da Vercel.
☐ Se não houver violação inesperada, me peça para trocar para o modo bloqueio (troca o nome do cabeçalho no `vercel.json` e ajusta `backend/__tests__/vercel-headers.test.js`).
☐ Se houver violações legítimas (um domínio que o site usa e eu não liberei), me mande a linha do log para liberar antes.

---

## 11. Ao lançar com Clerk e Stripe de produção 🟡

☐ Troque as chaves de teste (`sk_test_`/`pk_test_`) pelas de produção (`sk_live_`/`pk_live_`) na Vercel.
☐ **Clerk com domínio próprio** (ex.: `clerk.seudominio.com.br`): esse domínio precisa entrar em `script-src` e `connect-src` da CSP no `vercel.json`. Me avise antes de virar a chave, senão o login do painel pode quebrar quando o bloqueio for ativado.
☐ Crie o webhook da Stripe **no modo produção** (outro `whsec_`) e atualize `STRIPE_WEBHOOK_SECRET`.
☐ Cadastre o domínio de produção em `CLERK_AUTHORIZED_PARTIES` e `PUBLIC_APP_URL`.
☐ Ative os métodos de pagamento (cartão, Pix) na conta de produção da Stripe; Pix exige habilitação na conta.
☐ Faça um pagamento real de valor baixo e confira todo o caminho (pedido, e-mail, download).

---

## 12. Textos e decisões que só você pode tomar 🟡

☐ **FAQ de privacidade (rascunho):** em **Painel → Ajuda**, a pergunta sobre privacidade está como **rascunho**, não aparece no site. Leia, ajuste com o jurídico/coordenação e publique.
☐ **Política de privacidade** (`/privacidade`): revise nome, endereço e e-mail do controlador de dados (vêm de **Conteúdo do site**) e o texto sobre pagamentos pela Stripe.
☐ **Conteúdo do site:** hoje mostra os textos antigos. Em **Conteúdo**, confira nome, contato, redes, endereço, horário e o versículo.
☐ **Depoimentos e números** começam **vazios** de propósito; a seção só aparece quando você cadastrar algo real (ex.: "famílias atendidas"). Só publique dados verdadeiros.
☐ **Página inicial:** em **Página inicial**, defina a ordem dos blocos e escolha o evento em destaque.
☐ **FAQ e agenda:** leia as 13 perguntas semeadas (feitas só com fatos do código) e cadastre os compromissos reais da paróquia na **Agenda**.
☐ **Tarja nas prévias:** é padrão do processo e **não pode ser desligada**. Nada a fazer.

---

## 13. Rotina e cuidados contínuos 🟢

☐ **Backup:** em **Acessos → Backup**, baixe o JSON de vez em quando (ele leva e-mails e telefones da equipe: guarde em lugar privado). Ele **não** inclui pedidos, fotos nem chaves; para isso, use o histórico de versões da própria planilha.
☐ **Atraso de publicação:** o que você muda no painel leva até ~30 s no servidor mais ~60 s no navegador para aparecer no site. Não é defeito.
☐ **Módulo em manutenção:** em **Módulos** você pode tirar galerias, compra, agenda ou ajuda do ar com um recado. Status do pedido, recuperação de pedido, download e webhooks **nunca** saem do ar (pode haver dinheiro em trânsito).
☐ **Segredos:** troque `DOWNLOAD_JWT_SECRET`, `FORENSIC_WATERMARK_SECRET`, `APPS_SCRIPT_HMAC_SECRET` e `CACHE_INVALIDATION_SECRET` a cada trimestre (trocar `DOWNLOAD_JWT_SECRET` invalida links de download já enviados).
☐ **Planilha:** nunca apague linhas (nem das abas novas). Para tirar algo do ar, marque como inativo/excluído pelo painel.
☐ **Limpeza das linhas de teste** em `Pedidos`, `ItensPedido`, `Downloads`, `Webhooks`, `Agenda` e `PerguntasSemResposta` antes do lançamento: marque como cancelado/inativo, sem apagar.

---

## Resumo: o que bloqueia o lançamento

1. 🔴 Pagamento de teste ponta a ponta (passo 3)
2. 🔴 Download real com credencial do Drive (passo 4)
3. 🔴 Variáveis de produção na Vercel (passo 6)
4. 🔴 Webhook da Stripe na produção (passo 7)
5. 🔴 Prévia publicada com os cabeçalhos conferidos (passo 9)

O resto (passos 1, 2, 5, 8, 11, 12) é importante antes de abrir ao público; os 🟢 podem esperar.
