// jest-setup.js — Google Apps Script global mocks for Jest.
// Loaded before every test via setupFiles in jest.config.js.

// ─── File mock ───────────────────────────────────────────────────────────────
const mockFile = {
  getId: jest.fn().mockReturnValue('file-id-123'),
  getName: jest.fn().mockReturnValue('foto_001.jpg'),
  getMimeType: jest.fn().mockReturnValue('image/jpeg'),
  getUrl: jest.fn().mockReturnValue('https://drive.google.com/file/d/file-id-123/view'),
  makeCopy: jest.fn(),
  getParents: jest.fn().mockReturnValue({
    hasNext: jest.fn().mockReturnValue(true),
    next: jest.fn().mockReturnValue({ getName: jest.fn().mockReturnValue('EventoBatizado') }),
  }),
  setSharing: jest.fn(),
};

// ─── Folder mock ──────────────────────────────────────────────────────────────
const mockFolder = {
  getId: jest.fn().mockReturnValue('folder-id-456'),
  getName: jest.fn().mockReturnValue('mock-folder'),
  getFiles: jest.fn().mockReturnValue({
    hasNext: jest.fn().mockReturnValueOnce(true).mockReturnValue(false),
    next: jest.fn().mockReturnValue(mockFile),
  }),
};

mockFile.makeCopy.mockReturnValue(mockFile);

global.DriveApp = {
  getFolderById: jest.fn().mockReturnValue(mockFolder),
  getFoldersByName: jest.fn().mockReturnValue({
    hasNext: jest.fn().mockReturnValue(true),
    next: jest.fn().mockReturnValue(mockFolder),
  }),
  getFileById: jest.fn().mockReturnValue(mockFile),
  Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
  Permission: { VIEW: 'VIEW' },
};

// Export mock refs for per-test overrides
global.__mocks__ = { mockFile, mockFolder };

// ─── Sheet mocks ──────────────────────────────────────────────────────────────
const mockRange = {
  getValue: jest.fn().mockReturnValue(''),
  setValue: jest.fn(),
};

const mockSheet = {
  appendRow: jest.fn(),
  getRange: jest.fn().mockReturnValue(mockRange),
  getDataRange: jest.fn().mockReturnValue({
    getValues: jest.fn().mockReturnValue([[
      'ID','Evento','Link_Original','Link_Amostra','Status','WhatsApp',
      'Total_Pago','ID_Mercado_Pago','Data_Processamento','Data_Pagamento',
      'Link_Entrega','Tentativas_Entrega',
    ]]),
  }),
};

const mockSpreadsheet = {
  getSheetByName: jest.fn().mockReturnValue(mockSheet),
};

global.SpreadsheetApp = {
  openById: jest.fn().mockReturnValue(mockSpreadsheet),
};

global.__mockSheet__ = mockSheet;
global.__mockRange__ = mockRange;
global.__mockSpreadsheet__ = mockSpreadsheet;

// ─── Mail / Gmail ──────────────────────────────────────────────────────────────
global.MailApp = { sendEmail: jest.fn() };
global.GmailApp = { sendEmail: jest.fn() };

// ─── ScriptApp ────────────────────────────────────────────────────────────────
const mockTriggerBuilder = {
  timeBased: jest.fn().mockReturnThis(),
  everyMinutes: jest.fn().mockReturnThis(),
  create: jest.fn().mockReturnValue({}),
};

global.ScriptApp = {
  newTrigger: jest.fn().mockReturnValue(mockTriggerBuilder),
  getProjectTriggers: jest.fn().mockReturnValue([]),
  deleteTrigger: jest.fn(),
};

// ─── Utilities / Session / Logger / PropertiesService ──────────────────────────
global.Utilities = {
  formatDate: jest.fn().mockReturnValue('05/05/2026 10:00:00'),
};

global.Session = {
  getEffectiveUser: jest.fn().mockReturnValue({
    getEmail: jest.fn().mockReturnValue('admin@test.com'),
  }),
};

global.Logger = { log: jest.fn() };

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn().mockImplementation((key) => ({
      SPREADSHEET_ID: 'spreadsheet-id-test',
      SOURCE_FOLDER_ID: 'source-folder-id-test',
      ORIGINAIS_FOLDER_ID: 'originais-folder-id-test',
      AMOSTRAS_FOLDER_ID: 'amostras-folder-id-test',
      ADMIN_EMAIL: 'admin@paroquia.com',
    }[key] || null)),
  }),
};
