// google-drive.js — Drive API v3 wrapper using service-account credentials.
const { google } = require('googleapis');
const { Readable } = require('stream');

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

/**
 * Download a Drive file as a Buffer.
 * @param {string} fileId
 * @returns {Promise<{buffer: Buffer, mimeType: string}>}
 */
async function downloadFile(fileId) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );
  return {
    buffer: Buffer.from(response.data),
    mimeType: response.headers['content-type'] || 'image/jpeg',
  };
}

/**
 * Upload a Buffer as a new file inside a Drive folder.
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} filename
 * @param {string} folderId
 * @returns {Promise<string>} Shareable link
 */
async function uploadFile(buffer, mimeType, filename, folderId) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const stream = Readable.from(buffer);
  const response = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: stream },
    fields: 'id',
  });
  const fileId = response.data.id;
  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

module.exports = { downloadFile, uploadFile };
