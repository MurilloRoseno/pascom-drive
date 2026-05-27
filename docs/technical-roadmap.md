# Roadmap Técnico

## Prioridade Alta

- Consolidar commits da limpeza atual.
- Garantir testes verdes em `frontend`, `backend` e `google-apps-script`.
- Adicionar GitHub Actions com testes por pacote.
- Criar teste de contrato para headers do Google Sheets.
- Formalizar checklist Mercado Pago sandbox antes de produção.
- Padronizar timestamps e timezone.

## Prioridade Média

- Extrair `useEventGallery` de `EventPage`.
- Extrair `useCheckoutPricing` ou serviço de checkout.
- Criar adapter local para Runtime Cache.
- Melhorar tratamento do cliente HTTP para respostas não JSON.
- Adicionar logs estruturados para webhook, entrega e download.
- Criar rotina de reconciliação de pedidos pagos sem entrega.

## Prioridade Baixa

- Remover alias `/api/criar-pagamento` após janela de depreciação.
- Reduzir `unsafe-inline` na CSP.
- Avaliar persistência de carrinho em `sessionStorage`.
- Avaliar TypeScript apenas após V1 estável.
- Criar licença formal.

## Estratégia de Escalabilidade

Fase 1 — MVP:

- Manter Sheets como banco.
- Usar cache Vercel.
- Limitar volume por evento.
- Operação manual supervisionada.

Fase 2 — Crescimento:

- Migrar pedidos, webhooks e downloads para banco transacional.
- Manter Sheets como CMS operacional de eventos/fotos.
- Adicionar fila para processamento de imagem.
- Criar painel administrativo próprio.

Fase 3 — Profissionalização:

- Observabilidade completa.
- Auditoria LGPD/privacidade.
- Roles administrativas.
- Automação de WhatsApp se justificável.

## Estratégia de Modularização

- Separar domínio de catálogo, checkout, entrega e mídia.
- Manter handlers finos em `backend/api`.
- Concentrar regras em `backend/lib`.
- Extrair hooks de página no frontend quando passarem de uma responsabilidade.
- Criar contratos compartilhados apenas se duplicação Zod crescer.

## Estratégia de Observabilidade

- Logs estruturados com `event`, `pedidoId`, `eventoId`, `paymentId`.
- Métricas de webhook recebido/processado/falho.
- Métricas de entrega por e-mail.
- Métricas de cache hit/miss.
- Alertas para falha de processamento e entrega.

## Estratégia de Testes

- Unitários para regras puras: pricing, tokens, validação.
- Integração para APIs com mocks de Sheets/Drive/MP.
- Componentes para carrinho, checkout, galeria.
- Apps Script com mocks de DriveApp/SpreadsheetApp.
- Smoke sandbox Mercado Pago para fluxo crítico.
- Teste manual mobile/desktop antes de release relevante.

## Estratégia de Monitoramento

- Vercel logs para APIs.
- Mercado Pago dashboard para webhooks.
- Aba `Webhooks` como trilha de auditoria.
- Aba `Pedidos` para status operacional.
- Alertas por e-mail para falhas definitivas do Apps Script.

## Evoluções Futuras

- Painel administrativo.
- Migração parcial para Postgres.
- Busca mais rica de eventos.
- Entrega automática via provedor WhatsApp oficial.
- Relatórios financeiros.
- Expiração configurável por tipo de evento.
- Controle de consentimento/menores.
