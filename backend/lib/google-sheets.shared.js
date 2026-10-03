const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { publicacaoEfetiva } = require('./publicacao');
const { numeroDaPlanilha } = require('./numero-planilha');

function drivePreviewUrl(fileId) {
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280` : '';
}

function applicationPreviewUrl(eventoId, fotoId, variant = 'preview') {
  const query = variant === 'thumbnail' ? '?variant=thumbnail' : '';
  return `/api/eventos/${encodeURIComponent(eventoId)}/previews/${encodeURIComponent(fotoId)}${query}`;
}

function driveUrlToThumbnail(sharingUrl) {
  const match = sharingUrl && sharingUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? drivePreviewUrl(match[1]) : sharingUrl;
}

function yes(value) {
  return String(value || '').toUpperCase() === 'SIM' || value === true;
}

function displayTitle(value) {
  const clean = String(value || '').replace(/_\d{12}$/, '').replace(/_/g, ' ').trim();
  return clean.replace(/([a-zà-ÿ])([A-ZÀ-Ý]{2,})/g, (_match, first, tail) => (
    first + tail.toLocaleLowerCase('pt-BR')
  ));
}

function dateLabel(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

let _doc = null;
let _docPromise = null;

async function getDoc() {
  if (_doc) return _doc;
  if (_docPromise) return _docPromise;
  _docPromise = (async () => {
    const encodedKey = process.env.GOOGLE_PRIVATE_KEY_B64;
    const privateKey = encodedKey
      ? Buffer.from(encodedKey, 'base64').toString('utf8')
      : String(process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
    await doc.loadInfo();
    _doc = doc;
    return doc;
  })().catch((error) => {
    _docPromise = null;
    throw error;
  });
  return _docPromise;
}

async function sheet(title) {
  const doc = await getDoc();
  return doc.sheetsByTitle[title] || null;
}

async function rows(title) {
  const target = await sheet(title);
  return target ? target.getRows() : [];
}

function eventoFromRow(row) {
  const date = row.get('DataEvento') || '';
  const publicationRaw = row.get('Publicacao') || 'rascunho';
  const publishAt = row.get('PublicarEm') || '';
  const expiresAt = row.get('ExpiraEm') || '';
  return {
    eventoId: row.get('EventoID'),
    title: displayTitle(row.get('Titulo') || row.get('NomePasta')),
    nomePasta: row.get('NomePasta'),
    category: row.get('Categoria') || '',
    date,
    dateLabel: dateLabel(date),
    time: row.get('HorarioEvento') || '',
    visibility: row.get('Visibilidade') || 'protegida',
    salesAuthorized: yes(row.get('VendaAutorizada')),
    // Estado efetivo: só é 'publicado' com o evento no ar agora (janela PublicarEm/ExpiraEm).
    publication: publicacaoEfetiva({ publicationRaw, publishAt, expiresAt }),
    publicationRaw,
    publishAt,
    expiresAt,
    retentionDays: Number(row.get('PrazoDias') || 0),
    minorProtection: yes(row.get('ProtecaoMenores')),
    codeHash: row.get('CodigoHash') || '',
    codeVersion: Number(row.get('CodigoVersao') || 0),
    status: row.get('StatusProcessamento') || row.get('Status') || '',
    totalFotos: Number(row.get('TotalFotos') || 0),
    fotosProcessadas: Number(row.get('FotosProcessadas') || 0),
    dataCriacao: row.get('DataCriacao') || '',
    slug: row.get('SlugPublico') || '',
  };
}

function fotoFromRow(row) {
  const id = row.get('FotoID') || row.get('ID');
  const previewId = row.get('PreviewFileID');
  const thumbnailId = row.get('ThumbnailFileID');
  const type = row.get('TipoFoto') === 'capa' ? 'capa' : 'foto';
  return {
    id,
    eventoId: row.get('EventoID') || '',
    previewFileId: previewId || '',
    thumbnailFileId: thumbnailId || '',
    previewUrl: previewId ? drivePreviewUrl(previewId) : driveUrlToThumbnail(row.get('Link_Amostra')),
    price: numeroDaPlanilha(row.get('PrecoUnitario') || row.get('Preco')) || 10,
    type,
    availableForSale: type !== 'capa' && yes(row.get('DisponivelVenda')),
    status: row.get('StatusProcessamento') || row.get('Status'),
    thumbnailStatus: row.get('ThumbnailStatus') || '',
    originalFileId: row.get('OriginalFileID') || '',
  };
}

module.exports = {
  drivePreviewUrl,
  applicationPreviewUrl,
  driveUrlToThumbnail,
  yes,
  displayTitle,
  dateLabel,
  getDoc,
  sheet,
  rows,
  eventoFromRow,
  fotoFromRow,
};
