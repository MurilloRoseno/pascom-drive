# Auditoria Técnica

## Sumário Executivo

O projeto está funcionalmente estruturado, mas carrega dívida documental, mudanças não commitadas extensas e alguns riscos técnicos típicos de MVP: Google Sheets como banco, componentes de página acumulando responsabilidades, dependência de segredos compartilhados e documentação antiga contraditória.

## Achados

| Achado | Gravidade | Impacto | Complexidade | Solução |
| --- | --- | --- | --- | --- |
| Working tree muito alterada | Alta | Dificulta saber o que é estável | Média | Criar commit de estabilização após validar testes |
| Documentação legada conflitante | Alta | Onboarding incorreto | Baixa | Arquivar legado e manter docs canônicos |
| Encoding quebrado em docs antigas | Média | Leitura ruim e baixa confiança | Baixa | Arquivar/substituir |
| Sheets como banco transacional | Alta futura | Gargalo e corrida em pedidos | Alta | Migrar pedidos/webhooks/downloads para Postgres quando volume crescer |
| Busca linear em Sheets | Média | Latência com crescimento | Média | Cache, índices auxiliares ou banco dedicado |
| `EventPage` concentra responsabilidades | Média | Risco de regressão | Média | Extrair hook de galeria/acesso |
| `CheckoutPage` concentra cotação e pagamento | Média | Risco em fluxo financeiro | Média | Extrair hook/service e ampliar testes |
| Alias legado `/api/criar-pagamento` | Baixa | Confusão de contrato | Baixa | Documentar depreciação antes de remover |
| Duas UIs para o mesmo domínio | Média | Regras podem divergir entre desktop e mobile | Média | Manter lógica compartilhada em `lib/`, `context/` e `shared/`; testar fluxos críticos nas duas experiências |
| CSP permite `unsafe-inline` | Média | Superfície XSS maior | Média | Remover após ajustar estilos/scripts |
| Timestamps ISO sem conversão clara | Média | Diverge da política `America/Sao_Paulo` | Média | Padronizar util de data |
| SMTP opcional | Baixa | Entrega automática pode não ocorrer | Baixa | Alertas operacionais e fallback assistido |
| Cache Vercel em ambiente local | Média | Testes locais podem divergir | Média | Adapter/mock local para cache |
| Falta CI formal | Média | Regressões chegam ao deploy | Média | GitHub Actions por pacote |
| Sem licença | Baixa | Risco jurídico para distribuição | Baixa | Adicionar `LICENSE` |

## Código Morto e Arquivos Órfãos

O status atual mostra muitos arquivos deletados no working tree, incluindo componentes e hooks antigos (`Gallery`, `PixDisplay`, `useFotos`, `usePollingStatus`, `DevToolsBlock`) e um diretório `time-dilation`. Isso indica limpeza em andamento, mas ainda não consolidada em commit.

Recomendação:

1. Validar testes.
2. Confirmar que nenhuma rota/import ainda referencia arquivos deletados.
3. Criar commit específico de remoção/limpeza.
4. Atualizar changelog.

## Débito Técnico

- Falta de CI automatizado.
- Ausência de migração/versão formal do schema Sheets.
- Pouca observabilidade estruturada.
- Componentes de página grandes.
- Mobile dedicado aumenta necessidade de testes de paridade.
- Fluxos financeiros dependem de integração externa e precisam smoke test sandbox recorrente.
- Documentação anterior estava espalhada entre raiz e `docs/`.

## Problemas Arquiteturais

### Google Sheets como banco único

Adequado para MVP, mas não ideal para alto volume. Pedidos e webhooks precisam de consistência maior que catálogo.

### Apps Script como worker

Excelente para Drive/Sheets, mas limitado em logs, retries, controle de concorrência e observabilidade.

### Express dentro de Vercel

Simplifica local e deploy, mas pode dificultar otimização por função isolada.

## Más Práticas Encontradas

- Documentos ativos com informação obsoleta.
- Planos antigos misturados com docs atuais.
- Instruções antigas mencionando arquivos removidos.
- Alguns docs antigos citam decisões que já divergiram do código, como uso/ausência de `PropTypes`.

## Segurança

Pontos fortes:

- HMAC no webhook.
- Zod em endpoints críticos.
- Rate limiting por classe.
- Download com token assinado e hash salvo.
- Segredos para processamento/admin.

Pontos frágeis:

- CSP com `unsafe-inline`.
- Segredos compartilhados exigem rotação manual.
- Dados pessoais em Sheets precisam política clara de retenção.
- Conferir se WhatsApp deve ser criptografado conforme regra operacional original.

## Performance

Gargalos prováveis:

- Leitura de Sheets em catálogo grande.
- Processamento Sharp em serverless com imagens grandes.
- Download proxyado pelo backend.
- Busca por pedido/webhook/download em linhas sem índice.

## Prioridade de Correção

1. Consolidar documentação e remover legado ativo.
2. Rodar testes e estabilizar working tree.
3. Adicionar CI.
4. Criar testes de contrato das abas Sheets.
5. Extrair hooks de `EventPage` e `CheckoutPage`.
6. Melhorar observabilidade de webhook e entrega.
7. Planejar migração de dados transacionais.
