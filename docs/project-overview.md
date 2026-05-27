# Visão Geral do Projeto

## Objetivo

O Pascom Drive é um sistema de venda e entrega de fotos de eventos da Paróquia São Rafael. Ele reduz trabalho manual da Pastoral da Comunicação ao transformar uma pasta de fotos no Google Drive em uma galeria publicável, com checkout, confirmação de pagamento e entrega controlada dos arquivos originais.

## Problema Resolvido

Antes do sistema, o fluxo de fotos depende de tarefas manuais frágeis:

- copiar fotos entre pastas;
- aplicar marca d'água;
- montar galerias;
- controlar quais eventos podem ser vendidos;
- conferir pagamento;
- enviar fotos individualmente;
- manter rastreabilidade mínima de pedidos.

O projeto centraliza esse fluxo usando ferramentas de baixo custo e baixa operação: Google Drive, Google Sheets, Apps Script, Vercel e Mercado Pago.

## Público-Alvo

- **Compradores finais:** fiéis e famílias que desejam comprar fotos de celebrações.
- **Secretaria/Pascom:** equipe que organiza eventos, publica galerias e acompanha entregas.
- **Desenvolvedor mantenedor:** responsável por evoluir e operar o sistema.
- **Futuros colaboradores:** pessoas que precisam entrar no projeto sem depender de conhecimento implícito.

## Principais Funcionalidades

- Monitoramento de novas pastas no Google Drive.
- Registro de eventos e fotos no Google Sheets.
- Geração de previews, miniaturas e marca d'água.
- Publicação controlada de eventos por status administrativo.
- Busca e listagem de eventos por categoria/texto.
- Galerias públicas e protegidas por código.
- Carrinho global no frontend.
- Cotação de checkout com regras de pagamento vindas do Sheets.
- Criação de preferência no Mercado Pago.
- Webhook com validação HMAC.
- Registro idempotente de webhooks.
- Geração de links de download temporários.
- Envio por e-mail quando SMTP está configurado.
- Link/mensagem de WhatsApp para entrega assistida.
- Cache runtime na Vercel para catálogo e mídia.

## Fluxo Geral

```text
Fotógrafo/Pascom
  -> cria pasta de evento no Drive
  -> Apps Script detecta a pasta
  -> Apps Script registra Evento e Fotos no Sheets
  -> Backend processa previews/watermarks quando chamado
  -> Secretaria publica evento no Sheets
  -> Cliente acessa site e escolhe fotos
  -> Backend calcula preço e cria checkout Mercado Pago
  -> Mercado Pago chama webhook
  -> Backend confirma pedido e cria downloads seguros
  -> Cliente recebe links por e-mail/WhatsApp assistido
```

## Diferenciais Técnicos

- Usa Google Sheets como banco auditável e editável por operação não técnica.
- Mantém processamento pesado de imagem fora do Apps Script, delegando a Node.js/Sharp.
- Usa tokens assinados para galerias protegidas e downloads.
- Mantém compatibilidade local Express e deploy Vercel.
- Aplica validação Zod em entradas críticas.
- Usa rate limits diferentes para catálogo, pagamento, mídia, processamento e administração.
- Suporta cache por tags para reduzir leituras repetidas do Sheets.

## Tecnologias Utilizadas

| Área | Tecnologia | Uso |
| --- | --- | --- |
| UI | React 18 | Componentização da SPA |
| Build | Vite | Desenvolvimento e build frontend |
| Estilo | Tailwind CSS + CSS próprio | Base visual e páginas institucionais |
| Rotas | React Router 6 | Navegação SPA |
| Validação | Zod | Contratos frontend/backend |
| API | Express | Servidor local e app exportado para Vercel |
| Serverless | Vercel Functions | Publicação de endpoints |
| Imagem | Sharp | Resize, watermark e conversão |
| Dados | Google Sheets | Banco operacional |
| Arquivos | Google Drive API/DriveApp | Originais e derivados |
| Pagamento | Mercado Pago SDK | Preferência, consulta e webhook |
| E-mail | Nodemailer | Entrega automática opcional |
| Automação | Google Apps Script | Monitoramento Drive/Sheets |
| Testes | Jest, Testing Library, Supertest | Cobertura por camada |

## Estrutura Macro

```text
Pascom Drive
├─ frontend/            Interface pública de compra
├─ backend/             APIs, integrações, segurança e mídia
├─ google-apps-script/  Automação operacional Drive/Sheets
├─ docs/                Documentação técnica canônica
├─ marca-dagua/         Fontes visuais de watermark
└─ graphify-out/        Grafo local de conhecimento
```

## Escopo Atual

O sistema atual é um MVP em evolução. A arquitetura favorece simplicidade operacional, baixo custo e manutenção por uma pessoa. Isso é adequado ao contexto atual, mas traz riscos de escala documentados em `technical-audit.md` e `technical-roadmap.md`.
