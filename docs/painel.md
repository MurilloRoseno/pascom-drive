# Painel administrativo (`/painel`)

Painel da equipe Pascom para operar o site sem mexer no código: publicação de galerias, categorias, pagamentos, agenda, ajuda, conteúdo do site, módulos e acessos. Nasceu da branch `painel` (base `codex/integracao-comercial-segura`). Regra de arquitetura: **dinheiro, permissões e publicação são decididos no servidor**; o navegador só mostra.

## Quem entra e o que pode

- Login pelo Clerk (`@clerk/react`, `@clerk/express`). O backend confere a pessoa na aba `EquipePascom` (`lib/pascom-auth.js`).
- Administrador fixo: e-mail em `PAINEL_ADMIN_EMAIL` (não depende da planilha).
- Papéis: `admin`, `coord` (coordenação), `foto` (fotógrafo), `atend` (atendimento). Cada rota usa `exigirPermissao('area.acao')` (`lib/pascom-permissoes.js`). A matriz padrão está em `lib/permissions.js` e pode ser editada na tela Acessos (aba `Acessos`); `modulos.gerenciar` e `acessos.gerenciar` são protegidas e ficam só com o admin. Se a matriz não puder ser lida, o servidor recusa (falha fechada, 503).
- Mudar preço, taxas ou tarifas exige login recente (reautenticação do Clerk, claim `fva`). Toda mudança grava `AuditoriaPascom` com valor antigo e novo.

## Telas

| Tela | Rota | Permissão | O que faz |
| --- | --- | --- | --- |
| Visão geral | `/painel` | login | Resumo e pendências |
| Eventos | `/painel/eventos` | `eventos.*` | Publicar agora, agendar, arquivar; prazo 3/7/N dias ou sem prazo |
| Categorias | `/painel/categorias` | `categorias.*` | Sacramentos e celebrações do catálogo |
| Agenda | `/painel/agenda` | `agenda.*` | Compromissos da paróquia (missas, reuniões, festas) |
| Ajuda (FAQ) | `/painel/ajuda` | `ajuda.*` | Perguntas e respostas; fila do que o assistente não soube responder |
| Assistente | `/painel/assistente` | `ajuda.editar` | Liga/desliga, fontes e resposta fora do escopo |
| Pagamentos | `/painel/pagamentos` | `pagamentos.*` | Preço, taxas, tarifas, simulador e estado da integração |
| Conteúdo do site | `/painel/conteudo` | `conteudo.*` | Nome, contato, redes, versículo, missão, números, depoimentos |
| Página inicial | `/painel/pagina-inicial` | `conteudo.editar` | Ordem, título, liga/desliga dos blocos e evento em destaque |
| Módulos | `/painel/modulos` | `modulos.gerenciar` | Tira do ar galerias, compra, agenda ou ajuda, com recado |
| Acessos | `/painel/acessos` | `acessos.gerenciar` | Papéis, equipe e backup das configurações |
| Segurança | `/painel/seguranca` | `seguranca.ver` | Tarja sempre ativa e caminho do pagamento |

A tarja nas prévias é regra do processo e **não** pode ser desligada pelo painel.

## Onde ficam os dados (Google Sheets)

Abas criadas pelo painel (colunas em `backend/lib/sheet-schemas.js`; `obterAba` cria a aba ou acrescenta colunas que faltam): `Configuracoes`, `AuditoriaPascom`, `Acessos`, `Categorias`, `Faq`, `PerguntasSemResposta`, `Agenda`, `Modulos`. Em `Eventos` o painel acrescentou ao fim `PublicarEm`, `ExpiraEm` e `PrazoDias`. Nada é apagado: remoção é marcar como inativo ou excluído.

`Configuracoes` (`Chave | Valor | AtualizadoEm | Por`) guarda as chaves de `lib/config-store.js`: preço e taxas (`precoFoto`, `taxaServico`, `taxaComodidade`, tarifas), `prazoPadraoDias`, `whatsapp`, `assistente*`, `site*` (identidade, contato, redes, versículo), `homeBlocos`, `homeDestaque`, `homeMissao`, `homeNumeros`, `homeDepoimentos`. Sem configuração, o site mostra o que sempre mostrou (os padrões do código são os textos antigos). Campo opcional apagado no painel fica em branco e o item some do site.

Segurança dos textos editáveis: nada começa com `= + - @` (viraria fórmula na planilha); redes só aceitam `https` no domínio da própria rede; todas as gravações validam no servidor.

## APIs

Públicas (limitador `fotos`, exceto onde dito):

- `GET /api/site`: identidade, contato, redes, página inicial pública (blocos já filtrados), módulos no ar com recado, `assistenteAtivo` e `precos` (`foto`, `taxaServico`, `taxaComodidade`). Nunca expõe tarifas do gateway, segredos ou o resto da configuração. Cache de 60 s.
- `GET /api/faq`, `GET /api/agenda?mes=AAAA-MM` ou `?proximas=N`, `POST /api/assistente` (20 mensagens/hora por IP), `GET /api/categorias`.
- `POST /api/csp-report`: coletor das violações da CSP (só registra no log; 60/min).

Painel (`/api/pascom/*`, cada rota confere a permissão): `configuracoes`, `eventos`, `categorias`, `agenda`, `faq`, `pagamentos` (`/simulador`, `/estado`), `conteudo` (GET/PUT, tudo ou nada), `home` (GET/PUT), `modulos` (GET, PUT `/:chave`), `acessos`, `auditoria`, `backup` (GET, só `acessos.gerenciar`).

## Módulos

`busca` (galerias, categorias, fotos, prévias), `checkout` (cotação e pagamento; depende de `busca`), `agenda`, `ajuda` (FAQ e assistente). O servidor responde 503 com o recado (`middleware/modulo.js`); o site mostra "Em manutenção". Linha ausente na aba `Modulos` = ligado; planilha fora do ar = tudo ligado (a venda não para). **Nunca saem do ar**: página inicial, status do pedido, recuperar pedido, download, webhooks, painel e login. A política de privacidade e a área Pascom não são desligáveis.

## Assistente (sem IA)

Responde só com FAQ publicada, próximos compromissos da agenda e eventos publicados e dentro da janela de publicação. Não consulta pedidos nem dados pessoais, não guarda histórico, bloqueia pedidos de senha/chave e tentativas de mudar suas regras, recusa número de cartão ou CPF, e anota perguntas sem resposta (mascaradas) para a equipe. Agenda ou galerias fora do ar não vazam por ele.

## Backup

`GET /api/pascom/backup` (botão em Acessos): JSON com configurações, categorias, FAQ, agenda, módulos, acessos e equipe. **Não** leva pedidos, fotos nem chaves. Contém e-mails e telefones da equipe: só o administrador baixa.

## CSP (Content-Security-Policy)

O `vercel.json` usa `builds` + `routes` (modo legado), em que `headers` de topo são **ignorados**: até a Fase E o site respondia sem nenhum cabeçalho de segurança. Agora os cabeçalhos vão numa rota `/(.*)` com `continue: true`, antes das outras (travado por `backend/__tests__/vercel-headers.test.js`). A CSP está em **Report-Only** (`Content-Security-Policy-Report-Only`) e as violações chegam em `POST /api/csp-report` (log do servidor).

Liberado: `'self'`, Google Fonts, Clerk (`*.clerk.accounts.dev`, `challenges.cloudflare.com`, `*.protect.clerk.com`, `img.clerk.com`, telemetria), `data:`/`blob:` para imagens e workers, Drive só como imagem. Nada de Stripe/Mercado Pago: o checkout é redirecionamento. **Ao trocar para chaves `pk_live` do Clerk com domínio próprio (`clerk.seudominio`), acrescente esse domínio a `script-src` e `connect-src`.**

Para ativar o bloqueio: publique, navegue por Home, Evento, Checkout, `/painel` e `/pascom`, observe o log por alguns dias sem violações inesperadas e então troque a chave do cabeçalho para `Content-Security-Policy` (e atualize o teste).

## Operação local

Backend `node server.js` (porta 3001) e frontend `vite` (porta 3000). Variáveis em `backend/.env.example`. Testes: `node node_modules/jest/bin/jest.js --no-watchman` em `backend` e `frontend` (`npx jest` pode travar). Mudanças feitas no painel levam até ~30 s (cache do servidor) mais 60 s (cache do navegador) para aparecer no site.
