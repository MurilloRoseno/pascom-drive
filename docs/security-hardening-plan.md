# Plano de Hardening de Seguranca

## Objetivo

Este documento registra o hardening ativo do Pascom Drive. A arquitetura real atual e Vercel/Express, Mercado Pago, Google Sheets/Drive, Google Apps Script e Clerk apenas para equipe Pascom. Compradores continuam sem login.

## Superficies de Ataque

| Camada | Riscos principais | Controles atuais/planejados |
| --- | --- | --- |
| Frontend | Exposicao de segredos, XSS, captura casual de preview, uso indevido da area Pascom | Sem segredos no bundle, Clerk publishable key apenas, tokens temporarios, anti-DevTools leve, CSP a endurecer |
| Backend | Rotas internas expostas, spoofing de webhook, IDOR de download | HMAC worker, HMAC Mercado Pago, JWT de download, verificacao pedido/item, rate limit |
| Apps Script | URL/trigger abusado, segredo estatico vazado, quota abuse | Assinatura HMAC com timestamp, fallback legado temporario, lotes pequenos |
| Mercado Pago | Webhook falso, valor divergente, status atrasado | Assinatura MP, consulta sincronica, idempotencia, validacao de valor/moeda |
| Google Drive | FileId exposto, metadados sensiveis, permissao ampla | Proxy de download, originais privados, checklist de menor privilegio |
| Google Sheets | Corrida, busca linear, edicao manual incorreta | Contratos de headers, auditoria comercial, roadmap para banco transacional |
| E-mail/WhatsApp | Entrega indevida, link compartilhado | Token com exp, limite de uso, logs e fallback assistido |
| Vercel | Env ausente, origem indevida, logs insuficientes | CORS por origem permitida, smoke de env, logs estruturados |

## Matriz STRIDE Simplificada

| Ameaça | Exemplo | Mitigacao |
| --- | --- | --- |
| Spoofing | POST falso no worker ou webhook | `x-pascom-signature`, `x-pascom-timestamp`, `MP_WEBHOOK_SECRET` |
| Tampering | Body alterado depois de assinado | HMAC sobre timestamp, metodo, path e raw body |
| Repudiation | Pagamento/download sem trilha | Aba `Webhooks`, `Downloads`, logs `download_completed` e `payment_amount_mismatch` |
| Information disclosure | FileId/link do Drive no cliente | Backend proxy, nenhuma resposta publica com `webViewLink`/`webContentLink` |
| Denial of service | Abuso de galeria, worker ou webhook | Rate limits por rota, janela curta de HMAC, lotes controlados no Apps Script |
| Elevation of privilege | Download de foto nao comprada ou login Pascom sem allowlist | `prepararDownload` exige pedido pago e item comprado; `/api/pascom/*` exige Clerk + `EquipePascom` ativa |

## Matriz LINDDUN Simplificada

| Risco de privacidade | Impacto | Controle |
| --- | --- | --- |
| Linkability | Relacionar pedido, foto e download | Fingerprint usa ID nao sensivel; dados pessoais ficam em Sheets |
| Identifiability | Expor nome/WhatsApp/e-mail | Nunca embutir PII em imagem; Politica de Privacidade documenta tratamento |
| Non-repudiation excessiva | Auditoria virar vigilancia | Logs devem ser proporcionais e antifraude, sem perfilamento comercial |
| Detectability | Descobrir galerias protegidas | Tokens de galeria, no-store, rate limit de acesso |
| Disclosure | Vazamento de dados em Drive/Sheets | Menor privilegio, sem metadados sensiveis, revisao de lixeira/permissoes |
| Unawareness | Usuario nao saber do tratamento | Politica publica e changelog tecnico |
| Non-compliance | LGPD/documentacao divergente | Politica de documentacao continua e checklist de mudanca |

## Politicas Tecnicas

- Toda chamada Apps Script -> backend sensivel deve usar HMAC SHA-256 com `APPS_SCRIPT_HMAC_SECRET`.
- Headers obrigatorios: `x-pascom-timestamp` e `x-pascom-signature`.
- Payload assinado: `${timestamp}.${METHOD}.${PATH}.${rawBody}`.
- Janela maxima aceita: 5 minutos.
- Fallback legado por `WATERMARK_API_SECRET` e `CACHE_INVALIDATION_SECRET` so pode ficar ativo com `ALLOW_LEGACY_WORKER_SECRET=true`.
- Webhook Mercado Pago so libera entrega se assinatura, consulta sincronica, status, moeda e valor baterem com o pedido.
- Downloads nunca podem entregar original bruto nem URL do Drive; sempre passam pelo backend.
- Clerk protege somente `/api/pascom/*`; toda permissao operacional exige allowlist ativa na aba `EquipePascom`, evitando que qualquer conta Clerk autenticada vire admin automaticamente.

## Operacao Segura

- Rotacionar `APPS_SCRIPT_HMAC_SECRET`, `MP_WEBHOOK_SECRET`, `DOWNLOAD_JWT_SECRET`, `FORENSIC_WATERMARK_SECRET`, `MEDIA_TOKEN_SECRET`, `WATERMARK_API_SECRET` e `CACHE_INVALIDATION_SECRET` trimestralmente ou em incidente.
- Revisar permissoes das pastas Drive mensalmente.
- Verificar logs para `worker_signature_invalid`, `webhook_signature_invalid`, `payment_amount_mismatch`, `download_denied`, `download_completed`, `media_abuse_blocked` e `forensic_download_failed`.
- Executar auditoria comercial periodica via `auditarConsistenciaComercial()` enquanto Sheets for o banco transacional.
