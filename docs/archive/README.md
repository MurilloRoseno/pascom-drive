# Arquivo de Documentação Legada

Este diretório preserva documentos antigos apenas como histórico. Eles não são fonte de verdade para desenvolvimento atual.

## Por Que Foi Arquivado

A documentação anterior estava distribuída entre a raiz, `docs/` e planos históricos. Parte dela continha:

- instruções de setup antigas;
- planos que não representam o código atual;
- contratos de API substituídos;
- componentes removidos;
- decisões arquiteturais já alteradas;
- encoding quebrado em alguns arquivos;
- duplicidade com a documentação canônica.

## Documentação Atual

Use:

- `../README.md` para o índice canônico;
- `../project-overview.md` para visão geral;
- `../architecture.md` para arquitetura;
- `../apis.md` para APIs;
- `../system-flows.md` para fluxos;
- `../database.md` para Google Sheets;
- `../setup-environment.md` para setup;
- `../technical-audit.md` para riscos e dívidas.

## Política

Não implemente features novas usando arquivos deste diretório sem antes validar contra o código atual.

Se algum conteúdo legado voltar a ser necessário, ele deve ser reescrito em um documento canônico ativo, não copiado diretamente.
