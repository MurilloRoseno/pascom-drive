const {
  getSourceFolder,
  getOriginaisFolder,
  getAmostrasFolder,
  getThumbnailsFolder,
  listNewFiles,
  copyFileToFolder,
  moveFileToFolderIfNeeded,
  getShareableLink,
} = require('../Drive');

beforeEach(() => jest.clearAllMocks());

describe('getSourceFolder', () => {
  it('fetches folder by SOURCE_FOLDER_ID', () => {
    getSourceFolder();
    expect(DriveApp.getFolderById).toHaveBeenCalledWith('source-folder-id-test');
  });
});

describe('getOriginaisFolder', () => {
  it('fetches folder by ORIGINAIS_FOLDER_ID', () => {
    getOriginaisFolder();
    expect(DriveApp.getFolderById).toHaveBeenCalledWith('originais-folder-id-test');
  });
});

describe('getAmostrasFolder', () => {
  it('fetches folder by AMOSTRAS_FOLDER_ID', () => {
    getAmostrasFolder();
    expect(DriveApp.getFolderById).toHaveBeenCalledWith('amostras-folder-id-test');
  });
});

describe('getThumbnailsFolder', () => {
  it('uses THUMBNAILS_FOLDER_ID when configured', () => {
    PropertiesService.getScriptProperties().getProperty.mockImplementationOnce((key) => (
      key === 'THUMBNAILS_FOLDER_ID' ? 'thumbnails-folder-id-test' : null
    ));
    getThumbnailsFolder();
    expect(DriveApp.getFolderById).toHaveBeenCalledWith('thumbnails-folder-id-test');
  });
});

describe('listNewFiles', () => {
  it('returns image files from source folder', () => {
    const files = listNewFiles();
    expect(files.length).toBeGreaterThan(0);
  });

  it('filters out non-image files', () => {
    const { mockFile } = global.__mocks__;
    mockFile.getMimeType.mockReturnValueOnce('application/pdf');
    global.DriveApp.getFolderById.mockReturnValueOnce({
      getFiles: jest.fn().mockReturnValue({
        hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
        next: jest.fn().mockReturnValue(mockFile),
      }),
    });
    const files = listNewFiles();
    expect(files.length).toBe(0);
  });
});

describe('copyFileToFolder', () => {
  it('calls makeCopy with name and destination folder', () => {
    const { mockFile, mockFolder } = global.__mocks__;
    copyFileToFolder(mockFile, mockFolder, 'copy.jpg');
    expect(mockFile.makeCopy).toHaveBeenCalledWith('copy.jpg', mockFolder);
  });
});

describe('moveFileToFolderIfNeeded', () => {
  it('moves an existing thumbnail instead of creating a duplicated file', () => {
    const destination = { getId: jest.fn().mockReturnValue('thumbnails-folder') };
    const existingFile = {
      getParents: jest.fn().mockReturnValue({ hasNext: jest.fn().mockReturnValue(false) }),
      moveTo: jest.fn(),
    };
    DriveApp.getFileById.mockReturnValueOnce(existingFile);
    expect(moveFileToFolderIfNeeded('thumb-id', destination)).toBe(true);
    expect(existingFile.moveTo).toHaveBeenCalledWith(destination);
  });
});

describe('getShareableLink', () => {
  it('returns a drive link with the file id', () => {
    const { mockFile } = global.__mocks__;
    mockFile.getId.mockReturnValue('abc123');
    const link = getShareableLink(mockFile);
    expect(link).toBe('https://drive.google.com/file/d/abc123/view?usp=sharing');
  });
});
