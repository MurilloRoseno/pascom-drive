# Política de Documentação Contínua

## Regra Central

Toda alteração relevante no Pascom Drive deve atualizar a documentação correspondente no mesmo ciclo de trabalho.

O projeto não deve depender de memória individual, contexto oculto ou decisões não registradas.

## Quando Atualizar Documentação

Atualize documentação sempre que houver:

- nova funcionalidade;
- mudança de regra de negócio;
- alteração de API;
- mudança em estrutura interna;
- dependência adicionada/removida;
- modificação arquitetural;
- alteração de fluxo;
- nova automação;
- refatoração relevante;
- novo componente importante;
- mudança de estratégia técnica.

## Processo Obrigatório

1. Identificar documentos afetados.
2. Atualizar documentos existentes.
3. Criar documentos novos quando necessário.
4. Registrar impactos arquiteturais.
5. Explicar motivo técnico.
6. Explicar riscos e impactos futuros.
7. Atualizar exemplos e fluxos.
8. Atualizar diagramas quando necessário.
9. Atualizar `README.md` se setup, uso ou arquitetura mudarem.
10. Atualizar `technical-changelog.md`.

## Documento de Feature

Toda feature relevante deve ter documentação contendo:

- contexto;
- objetivo;
- problema resolvido;
- arquitetura usada;
- fluxo completo;
- componentes envolvidos;
- APIs envolvidas;
- estados envolvidos;
- estratégia de erros;
- estratégia de loading;
- estratégia de cache;
- regras de negócio;
- melhorias futuras;
- débitos técnicos assumidos.

## Registro de Refatoração

Toda refatoração relevante deve registrar:

- motivo;
- problema anterior;
- solução aplicada;
- impacto esperado;
- ganhos técnicos;
- riscos;
- arquivos afetados.

## Changelog Técnico

Cada entrada em `technical-changelog.md` deve conter:

- data;
- alteração;
- motivo;
- impacto;
- responsável;
- tipo da mudança;
- breaking changes;
- migrações necessárias.

## Limpeza de Documentação Legada

Documentação legada não deve ficar misturada com documentação ativa.

Considere legado qualquer conteúdo que:

- descreva funcionalidade removida;
- cite API antiga;
- explique fluxo inexistente;
- mencione dependência removida;
- contradiga o código atual;
- tenha instrução inválida;
- gere confusão no onboarding.

## Arquivamento

Quando houver valor histórico:

1. mover para `docs/archive/`;
2. marcar claramente como legado;
3. explicar por que foi substituído;
4. apontar a documentação atual substituta.

Quando não houver valor histórico, remover.

## Critério de Pronto

Nenhuma feature relevante está finalizada sem:

- código implementado;
- documentação atualizada;
- fluxos documentados;
- impactos registrados;
- estrutura explicada;
- changelog técnico atualizado;
- testes aplicáveis executados.
