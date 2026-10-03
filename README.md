# Pascom Drive

Sistema web para venda e entrega segura de fotos pastorais da Paróquia São Rafael.

O Pascom Drive automatiza o ciclo completo de fotos de eventos: entrada no Google Drive, processamento com miniaturas e marca d'água, publicação de galerias, checkout via Mercado Pago, confirmação por webhook e entrega por links seguros.

## Stack

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Frontend | React 18, Vite, Tailwind CSS, React Router | Galeria pública, busca, carrinho e checkout |
| Backend | Node.js, Express, Vercel Functions | APIs, pagamentos, webhooks, download seguro com fingerprint forense, processamento de imagem |
| Automação | Google Apps Script | Monitoramento do Drive, registro em Sheets, processamento assíncrono |
| Banco | Google Sheets | Catálogo, pedidos, itens, webhooks, downloads e regras de pagamento |
| Pagamento | Mercado Pago | Pix/cartão, checkout externo e webhook HMAC |
| Entrega | E-mail SMTP e WhatsApp assistido | Links temporários para fotos originais compradas |

## Instalação Rápida

```bash
cd frontend
npm install
npm run dev

cd ../backend
npm install
npm run dev

cd ../google-apps-script
npm install
npm test
```

Frontend local: `http://localhost:3000`  
Backend local: `http://localhost:3001/api/health`

## Variáveis de Ambiente

Consulte `docs/setup-environment.md` para a lista completa. As variáveis críticas são:

- Frontend: `VITE_API_BASE_URL`
- Backend: `SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` ou `GOOGLE_PRIVATE_KEY_B64`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `DOWNLOAD_JWT_SECRET`, `FORENSIC_WATERMARK_SECRET`, `WATERMARK_API_SECRET`
- Apps Script: `SOURCE_FOLDER_ID`, `ORIGINAIS_FOLDER_ID`, `AMOSTRAS_FOLDER_ID`, `SPREADSHEET_ID`, `BACKEND_URL`

Nunca commite `.env`, `.env.local`, credenciais ou chaves privadas.

## Scripts

| Diretório | Comando | Uso |
| --- | --- | --- |
| `frontend` | `npm run dev` | Inicia Vite na porta 3000 |
| `frontend` | `npm run build` | Gera build estático |
| `frontend` | `npm test` | Executa testes Jest/Testing Library |
| `backend` | `npm run dev` | Inicia API Express local |
| `backend` | `npm test` | Executa testes Jest/Supertest |
| `google-apps-script` | `npm test` | Executa mocks Jest de Apps Script |
| `google-apps-script` | `npm run push:production` | Valida release e publica via clasp |

## Estrutura

```text
frontend/            React/Vite, páginas públicas e carrinho
backend/             Express + handlers usados como Vercel Functions
google-apps-script/  Automações do Drive/Sheets
docs/                Documentação técnica canônica
marca-dagua/         Arquivos originais de marca d'água
graphify-out/        Índice local do grafo de conhecimento
```

## Deploy

O deploy principal usa Vercel. O arquivo `vercel.json` da raiz publica:

- `/api/*` para `backend/api/index.js`
- assets e SPA fallback para o build do `frontend`
- cabeçalhos de segurança numa rota `/(.*)` com `continue: true` (a Vercel ignora `headers` de topo quando há `builds` + `routes`): `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` e a CSP em modo **Report-Only** (violações em `/api/csp-report`). O HSTS vem da própria Vercel. Detalhes em [docs/painel.md](./docs/painel.md).

O Apps Script é implantado separadamente com clasp após configurar propriedades do script.

## Documentação

A documentação canônica começa em `docs/README.md`.

Documentos principais:

- `docs/project-overview.md`
- `docs/architecture.md`
- `docs/apis.md`
- `docs/system-flows.md`
- `docs/database.md`
- `docs/setup-environment.md`
- `docs/technical-audit.md`
- `docs/documentation-policy.md`
- `docs/technical-changelog.md`

Documentação antiga fica em `docs/archive/` e não deve ser usada como fonte de verdade.

## Troubleshooting

- API não responde: valide `backend/.env`, `PORT`, `FRONTEND_URL` e `GET /api/health`.
- Galeria vazia: confira abas `Eventos` e `Fotos`, `Publicacao=publicado`, `VendaAutorizada=SIM` e fotos `StatusProcessamento=Processada`.
- Pagamento não confirma: verifique `MP_WEBHOOK_SECRET`, logs de `/api/webhook/mercado-pago` e aba `Webhooks`.
- Download expira ou falha: confira `DOWNLOAD_JWT_SECRET`, `FORENSIC_WATERMARK_SECRET`, aba `Downloads`, `ExpiraEm`, `Usos`, `UsosMaximos` e campos `Fingerprint*`.
- Imagem não processa: confira `WATERMARK_API_SECRET`, permissões do Drive e logs de `/api/watermark` ou `/api/preprocess`.

## FAQ

**O projeto usa banco relacional?**  
Não. O MVP usa Google Sheets como banco operacional.

**O WhatsApp é automático?**  
Não no MVP. O sistema gera link/mensagem assistida; a automação principal de entrega é por e-mail com links seguros.

**Existe autenticação de usuários finais?**  
Não há login. Galerias protegidas usam código de acesso e token temporário.

**Docker é obrigatório?**  
Não. O projeto não possui Docker como caminho oficial do MVP.

## Contribuição

Antes de alterar código relevante:

1. Leia `docs/documentation-policy.md`.
2. Atualize a documentação afetada junto com o código.
3. Atualize `docs/technical-changelog.md`.
4. Rode testes do pacote alterado.

## Licença

Licença não definida no repositório atual. Antes de distribuição externa, adicionar um arquivo `LICENSE`.
