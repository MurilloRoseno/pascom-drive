# Roadmap Técnico

## Prioridade Alta

- Consolidar commits da limpeza atual.
- Garantir testes verdes em `frontend`, `backend` e `google-apps-script`.
- Manter GitHub Actions com testes por pacote e auditoria npm informativa.
- Configurar `APPS_SCRIPT_HMAC_SECRET` em Vercel e Apps Script; depois desligar `ALLOW_LEGACY_WORKER_SECRET`.
- Criar teste de contrato para headers do Google Sheets.
- Validar `Cupons`, `Pacotes`, `SlugPublico` e colunas comerciais de `Pedidos` em ambiente real apos executar `inicializarEstrutura()`.
- Configurar `FORENSIC_WATERMARK_SECRET` em producao e validar download fingerprinted em smoke real.
- Formalizar checklist Mercado Pago sandbox antes de produção.
- Padronizar timestamps e timezone.

## Prioridade Média

- Extrair `useEventGallery` de `EventPage`.
- Extrair `useCheckoutPricing` ou serviço de checkout.
- Criar adapter local para Runtime Cache.
- Melhorar tratamento do cliente HTTP para respostas não JSON.
- Adicionar logs estruturados para webhook, entrega, download e bloqueios de midia.
- Criar rotina de reconciliação de pedidos pagos sem entrega.
- Executar auditoria comercial periodica para detectar pedidos pagos sem downloads, downloads sem item comprado e webhooks duplicados.
- Criar rotina de auditoria comercial para cupom acima do limite, pacote aplicado sem quantidade minima e divergencia entre quote/preference.
- Extrair regras de ofertas para banco transacional quando volume ou concorrencia aumentarem.

## Prioridade Baixa

- Remover alias `/api/criar-pagamento` após janela de depreciação.
- CSP: ja entregue em Report-Only (ver `docs/painel.md`). Proximos passos: observar o log por alguns dias, ativar o bloqueio e depois reduzir `unsafe-inline`.
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
- Alertas para `worker_signature_invalid`, `webhook_signature_invalid`, `payment_amount_mismatch` e `forensic_download_failed`.

## Estratégia de Testes

- Unitarios para regras puras: pricing, tokens, fingerprint e validacao.
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
