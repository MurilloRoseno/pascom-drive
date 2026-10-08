# Resposta a Incidentes de Seguranca

## Objetivo

Playbook operacional para incidentes de seguranca do Pascom Drive. O foco e preservar fotos, pedidos, dados pessoais, reputacao pastoral e continuidade da entrega.

## Severidades

| Nivel | Exemplo | Acao |
| --- | --- | --- |
| Critico | Segredo vazado, webhook falso aprovado, Drive publico indevido | Conter imediatamente, rotacionar segredos, suspender fluxo afetado |
| Alto | Muitos downloads negados, pagamento divergente, worker sob abuso | Bloquear origem/padrao, auditar Sheets, comunicar responsavel |
| Medio | Falha recorrente de email, cache inconsistente | Corrigir operacao e registrar no changelog |
| Baixo | Tentativa isolada invalida | Monitorar |

## Playbooks

### Webhook Mercado Pago falso ou divergente

1. Conferir logs `webhook_signature_invalid` e `payment_amount_mismatch`.
2. Validar o pagamento no painel Mercado Pago.
3. Se houver divergencia, manter pedido como `PagamentoDivergente`.
4. Nao liberar downloads manualmente sem conciliacao.
5. Rotacionar `MP_WEBHOOK_SECRET` se houver suspeita de vazamento.
6. Registrar incidente e impacto no changelog tecnico.

### Segredo de worker vazado

1. Definir `ALLOW_LEGACY_WORKER_SECRET=false` na Vercel.
2. Rotacionar `APPS_SCRIPT_HMAC_SECRET` na Vercel e no Apps Script.
3. Rotacionar tambem `WATERMARK_API_SECRET` e `CACHE_INVALIDATION_SECRET` se apareceram em logs/prints.
4. Reimplantar backend e publicar Apps Script.
5. Procurar `worker_signature_invalid` e chamadas incomuns a `/api/watermark`, `/api/preprocess`, `/api/cover-preview` e `/api/admin/cache/invalidate`.

### Abuso de download ou compartilhamento de link

1. Procurar `download_denied`, `download_completed` e `media_abuse_blocked`.
2. Verificar `Downloads.Usos`, `UltimoUsoEm`, `FingerprintID` e pedido relacionado.
3. Revogar token alterando limite/expiracao no Sheets se necessario.
4. Se houver vazamento de imagem comprada, comparar fingerprint forense registrado.
5. Comunicar administracao pastoral se houver dados pessoais envolvidos.

### Exposicao acidental no Drive

1. Remover compartilhamento publico do arquivo/pasta.
2. Verificar se `OriginalFileID` foi exposto em frontend, logs ou planilha compartilhada.
3. Mover arquivos afetados para pasta privada correta.
4. Revisar lixeira, permissoes e metadados `description/properties`.
5. Registrar escopo e acao corretiva.

### Falha de entrega

1. Verificar pedido, `Downloads`, `EmailStatus`, `EmailErro` e `WhatsAppLink`.
2. Confirmar se pagamento esta aprovado no Mercado Pago.
3. Reenviar por canal assistido apenas se downloads existem e pedido esta confirmado.
4. Nao gerar links novos sem registrar motivo.

## Evidencias Minimas

- Data/hora em `America/Sao_Paulo`.
- Pedido, pagamento, download, evento e foto envolvidos.
- Logs Vercel relevantes.
- Linhas Sheets afetadas.
- Acao tomada e responsavel.
- Necessidade de comunicacao ao titular ou administracao.
