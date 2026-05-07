// google-drive.test.js
jest.mock('googleapis');
jest.mock('google-auth-library');

const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const { downloadFile, uploadFile } = require('../lib/google-drive');

describe('google-drive', () => {
  let mockDriveGet, mockDriveCreate, mockDriveFiles;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDriveGet = jest.fn().mockResolvedValue({
      data: Buffer.from('fake-image-bytes'),
      headers: { 'content-type': 'image/jpeg' },
    });
    mockDriveCreate = jest.fn().mockResolvedValue({
      data: { id: 'new-file-id-123' },
    });
    mockDriveFiles = { get: mockDriveGet, create: mockDriveCreate };

    google.drive = jest.fn().mockReturnValue({ files: mockDriveFiles });
    JWT.mockImplementation(() => ({}));
  });

  describe('downloadFile', () => {
    it('calls Drive files.get with alt=media and returns buffer + mimeType', async () => {
      const result = await downloadFile('file-id-abc');
      expect(mockDriveGet).toHaveBeenCalledWith(
        { fileId: 'file-id-abc', alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.mimeType).toBe('image/jpeg');
    });
  });

  describe('uploadFile', () => {
    it('calls Drive files.create with correct name and parent folder', async () => {
      const buf = Buffer.from('watermarked');
      const link = await uploadFile(buf, 'image/jpeg', '[AMOSTRA]foto.jpg', 'folder-id-xyz');

      expect(mockDriveCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            name: '[AMOSTRA]foto.jpg',
            parents: ['folder-id-xyz'],
          }),
        })
      );
      expect(link).toBe('https://drive.google.com/file/d/new-file-id-123/view?usp=sharing');
    });
  });
});
