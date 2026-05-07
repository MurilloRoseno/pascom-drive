// google-drive.test.js
// Mocks: global fetch (Node.js 18+) and crypto module.

const crypto = require('crypto');
jest.spyOn(crypto, 'createPrivateKey').mockReturnValue({});
jest.spyOn(crypto, 'sign').mockReturnValue(Buffer.from('fake-sig'));

// Helper: mock a successful token exchange response
function tokenResponse() {
  return {
    ok: true,
    status: 200,
    text: jest.fn().mockResolvedValue(''),
    json: jest.fn().mockResolvedValue({ access_token: 'test-token', expires_in: 3600 }),
  };
}

// Helper: mock a Drive download response (binary body)
function downloadResponse(contentType = 'image/jpeg') {
  return {
    ok: true,
    status: 200,
    headers: { get: (h) => (h === 'content-type' ? contentType : null) },
    text: jest.fn().mockResolvedValue(''),
    arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('image-bytes').buffer),
  };
}

// Helper: mock a Drive upload response (JSON body)
function uploadResponse(id) {
  return {
    ok: true,
    status: 200,
    headers: { get: jest.fn().mockReturnValue(null) },
    text: jest.fn().mockResolvedValue(''),
    json: jest.fn().mockResolvedValue({ id }),
  };
}

// Helper: mock an error response
function errorResponse(status, message) {
  return {
    ok: false,
    status,
    headers: { get: jest.fn().mockReturnValue(null) },
    text: jest.fn().mockResolvedValue(message),
    json: jest.fn().mockResolvedValue({ error: message }),
  };
}

describe('google-drive', () => {
  describe('downloadFile', () => {
    it('calls Drive files endpoint with correct fileId and returns buffer + mimeType', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(downloadResponse('image/jpeg'));
      global.fetch = fetchMock;

      // Use isolateModules so each test gets a fresh module (no cached token)
      let result;
      jest.isolateModules(() => {
        const { downloadFile } = require('../lib/google-drive');
        result = downloadFile('file-id-abc');
      });
      result = await result;

      const driveCall = fetchMock.mock.calls[1];
      expect(driveCall[0]).toContain('file-id-abc');
      expect(driveCall[0]).toContain('alt=media');
      expect(driveCall[1].headers.Authorization).toContain('Bearer test-token');
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('throws on Drive API error', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(errorResponse(403, 'Forbidden'));

      let fn;
      jest.isolateModules(() => {
        const { downloadFile } = require('../lib/google-drive');
        fn = downloadFile('bad-id');
      });
      await expect(fn).rejects.toThrow('Drive download failed (403)');
    });
  });

  describe('uploadFile', () => {
    it('calls Drive upload endpoint with correct filename and folderId in metadata', async () => {
      const fetchMock = jest.fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(uploadResponse('new-file-id-123'));
      global.fetch = fetchMock;

      let result;
      jest.isolateModules(() => {
        const { uploadFile } = require('../lib/google-drive');
        result = uploadFile(Buffer.from('img'), 'image/jpeg', '[AMOSTRA]foto.jpg', 'folder-xyz');
      });
      result = await result;

      const uploadCall = fetchMock.mock.calls[1];
      expect(uploadCall[0]).toContain('uploadType=multipart');
      const bodyStr = uploadCall[1].body.toString();
      expect(bodyStr).toContain('[AMOSTRA]foto.jpg');
      expect(bodyStr).toContain('folder-xyz');
      expect(result).toBe('https://drive.google.com/file/d/new-file-id-123/view?usp=sharing');
    });

    it('throws on Drive API error', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(errorResponse(500, 'Server Error'));

      let fn;
      jest.isolateModules(() => {
        const { uploadFile } = require('../lib/google-drive');
        fn = uploadFile(Buffer.from('img'), 'image/jpeg', 'f.jpg', 'folder');
      });
      await expect(fn).rejects.toThrow('Drive upload failed (500)');
    });
  });
});
