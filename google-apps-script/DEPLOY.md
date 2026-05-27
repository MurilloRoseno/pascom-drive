# Publicacao segura do Apps Script

O erro `ReferenceError: jest is not defined` ocorre quando arquivos de teste sao enviados ao editor do Google Apps Script. `jest-setup.js`, `jest.config.js`, `__tests__`, `coverage`, dependencias e documentos sao somente locais e nunca devem ser publicados.

## Recuperacao imediata do projeto online

1. No editor do Apps Script, exclua `jest-setup.gs`, `jest.config.gs` e qualquer arquivo de teste ou cobertura publicado.
2. Confirme que restam apenas `appsscript.json`, `Code`, `Drive`, `EventQueue`, `Sheet`, `Watermark` e `WhatsApp`.
3. Execute `inicializarEstrutura()` uma vez para preparar as abas seguras. Em projeto independente, a conclusao sera informada no `Registro de execucao`, sem alerta visual.
4. Se ja existirem nomes com carimbo de erro como `_202605261456`, execute `normalizarMetadadosEventos()`.
5. Execute `cadastrarRegrasMercadoPagoD0()` para habilitar Pix (`0,99%`) e credito em 1x (`4,98%`) nas taxas publicadas de Checkout online D0. O debito virtual e marcado como `NAO`, pois foi removido do checkout publico.
6. Execute `criarTriggers()` para reinstalar apenas o processamento de eventos.
7. Ao executar uma funcao manualmente depois de atualizar `appsscript.json`, aceite a nova permissao de envio de e-mail (`script.send_mail`). Sem ela, o processamento continua registrando o erro real, mas os avisos por e-mail para a administracao nao serao enviados.
8. Configure `CACHE_INVALIDATION_SECRET` nas propriedades do script com o mesmo segredo privado cadastrado na Vercel; ele atualiza imediatamente o cache apos publicacao, protecao ou reprocessamento.
9. Para fotos processadas antes das miniaturas leves, execute `reprocessarMiniaturasEmLote()` repetidamente ate o registro informar `0` fotos pendentes. Opcionalmente defina `THUMBNAIL_BATCH_SIZE`; o padrao seguro inicial e `5`.
10. Crie uma pasta privada `Miniaturas` no Drive e configure seu ID em `THUMBNAILS_FOLDER_ID`. Sem essa propriedade, o script continua funcional, mas grava miniaturas junto das previews em `AMOSTRAS`.
11. Se miniaturas ja foram processadas antes de configurar a nova pasta, execute `organizarMiniaturasEmPasta()`; a funcao move os arquivos existentes em lotes de ate `100`, sem gerar copias. Repita se o registro informar novas movimentacoes.

Se a base ainda contem somente dados de desenvolvimento e deve iniciar limpa, defina temporariamente a propriedade de script `CONFIRMAR_RESET_INICIAL=APAGAR_DADOS_DE_TESTE` e execute `reiniciarDadosParaEstreia()` antes de criar novos eventos. O reset nao remove arquivos antigos do Drive.

Eventos usam `DataEvento=AAAA-MM-DD` e `HorarioEvento=HH:mm`; nao preencha `DataPublicacao` com horario da missa, pois ela registra apenas o momento em que a galeria foi publicada. Para uma capa publica sem marca d'agua e fora da venda, coloque `capa.jpg` dentro da pasta antes do primeiro processamento.

Uma pasta futura que ainda esteja vazia permanece em `Fotos_Origem` e nao e registrada nem removida; adicione as fotos quando o evento acontecer e o trigger passara a processa-la normalmente. Para Pix real, habilite Pix/chave Pix na conta e use credenciais de producao: o Mercado Pago nao disponibiliza Pix em modo de teste.

## Proximas publicacoes

Crie localmente `google-apps-script/.clasp.json` com o `scriptId` correto do projeto Pascom. Esse arquivo permanece ignorado pelo Git.

```json
{
  "scriptId": "COLE_O_SCRIPT_ID_AQUI",
  "rootDir": "."
}
```

Depois, publique somente pelo comando:

```powershell
npm run push:production
```

O comando valida a allowlist em `.claspignore` antes do `clasp push`, impedindo que testes Jest sejam reenviados. Antes de promover a aplicacao para producao, rotacione credenciais expostas em testes/configuracoes antigas e cadastre as taxas reais do Mercado Pago.
