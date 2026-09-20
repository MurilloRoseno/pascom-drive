const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignoreFile = path.join(root, '.claspignore');
const runtimeFiles = [
  'appsscript.json',
  'Code.js',
  'Drive.js',
  'EventQueue.js',
  'Sheet.js',
  'Security.js',
  'Watermark.js',
  'WhatsApp.js',
  'Upload.js',
  'EventAdmin.js',
  'Sistema.js',
  'Processamento.js', 'Entregas.js',
];
const forbiddenPatterns = [/jest/i, /__tests__/i, /coverage/i, /node_modules/i, /package(-lock)?\.json/i, /\.md$/i];

if (!fs.existsSync(ignoreFile)) {
  throw new Error('Arquivo .claspignore ausente; push interrompido para proteger o Apps Script.');
}

const ignoreContents = fs.readFileSync(ignoreFile, 'utf8');
if (!ignoreContents.includes('**/*')) {
  throw new Error('.claspignore deve negar tudo antes da allowlist produtiva.');
}

runtimeFiles.forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Arquivo produtivo ausente: ${file}`);
  if (!ignoreContents.includes(`!${file}`)) throw new Error(`Arquivo produtivo fora da allowlist: ${file}`);
});

const allowedEntries = ignoreContents
  .split(/\r?\n/)
  .filter((line) => line.startsWith('!'))
  .map((line) => line.slice(1));

const unexpected = allowedEntries.filter((entry) => (
  !runtimeFiles.includes(entry) || forbiddenPatterns.some((pattern) => pattern.test(entry))
));
if (unexpected.length) {
  throw new Error(`Allowlist contem arquivos nao produtivos: ${unexpected.join(', ')}`);
}

console.log(`Release Apps Script validada: ${runtimeFiles.join(', ')}.`);
