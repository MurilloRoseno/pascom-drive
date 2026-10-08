// Gera as imagens derivadas do site (favicon.ico, previas de compartilhamento
// e logo leve do cabecalho). Rodar uma vez quando a arte de origem mudar:
//   node scripts/generate-site-images.js
const fs = require('fs');
const path = require('path');
const sharp = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sharp'));

const PUBLIC = path.join(__dirname, '..', 'frontend', 'public');
const ASSETS = path.join(PUBLIC, 'assets');

// ICO com um unico PNG de 48px (formato aceito por todos os navegadores atuais).
function icoFromPng(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(size, 6);
  header.writeUInt8(size, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, png]);
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function shareImage(file, title, subtitle) {
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.25" stop-color="rgb(46,12,58)" stop-opacity="0.15"/><stop offset="1" stop-color="rgb(46,12,58)" stop-opacity="0.94"/></linearGradient></defs>
<rect width="1200" height="630" fill="url(#g)"/>
<text x="72" y="470" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#FFFDF9">${escapeXml(title)}</text>
<text x="72" y="540" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#F7C848">${escapeXml(subtitle)}</text>
</svg>`);
  await sharp(path.join(ASSETS, 'hero-igreja-sao-rafael.png'))
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .composite([{ input: overlay }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(ASSETS, file));
}

async function main() {
  const iconPng = await sharp(path.join(ASSETS, 'favicon.svg'), { density: 300 })
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC, 'favicon.ico'), icoFromPng(iconPng, 48));

  await shareImage('og-site.jpg', 'Paróquia São Rafael', 'Açailândia · Celebrações e galeria de fotos');
  await shareImage('og-doar.jpg', 'Faça sua oferta', 'Paróquia São Rafael · Açailândia');

  const logo = sharp(path.join(ASSETS, 'logo-paroquia-sao-rafael.png')).resize({ height: 144, withoutEnlargement: true });
  await logo.clone().webp({ quality: 88 }).toFile(path.join(ASSETS, 'logo-header-2x.webp'));
  await logo.clone().png({ compressionLevel: 9, palette: true }).toFile(path.join(ASSETS, 'logo-header-2x.png'));
}

main().catch((error) => { console.error(error); process.exit(1); });
