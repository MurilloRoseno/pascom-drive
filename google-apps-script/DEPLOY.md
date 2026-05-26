# Publicacao segura do Apps Script

O erro `ReferenceError: jest is not defined` ocorre quando arquivos de teste sao enviados ao editor do Google Apps Script. `jest-setup.js`, `jest.config.js`, `__tests__`, `coverage`, dependencias e documentos sao somente locais e nunca devem ser publicados.

## Recuperacao imediata do projeto online

1. No editor do Apps Script, exclua `jest-setup.gs`, `jest.config.gs` e qualquer arquivo de teste ou cobertura publicado.
2. Confirme que restam apenas `appsscript.json`, `Code`, `Drive`, `EventQueue`, `Sheet`, `Watermark` e `WhatsApp`.
3. Execute `inicializarEstrutura()` uma vez para preparar as abas seguras.
4. Execute `criarTriggers()` para reinstalar apenas o processamento de eventos.

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
