jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('../lib/google-sheets', () => ({
  buscarOriginaisPedido: jest.fn(),
  listarDownloadsPedido: jest.fn(),
  gravarAutorizacoesDownload: jest.fn(),
}));

const nodemailer = require('nodemailer');
const { criarDownloadsDoPedido, enviarEmailEntrega } = require('../lib/delivery');
const sheets = require('../lib/google-sheets');

const pedido = { email: 'cliente@example.com' };
const downloads = [{ url: 'https://safe.test/download-1' }];

beforeEach(() => {
  jest.clearAllMocks();
  sheets.listarDownloadsPedido.mockResolvedValue([]);
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USER = 'murillo.roseno.lima@gmail.com';
  process.env.SMTP_APP_PASSWORD = 'abcd efgh ijkl mnop';
  process.env.SMTP_FROM_NAME = 'Paroquia Sao Rafael - Fotos';
  process.env.SMTP_REPLY_TO = 'murillo.roseno.lima@gmail.com';
  process.env.DOWNLOAD_JWT_SECRET = 'download-secret';
  process.env.FORENSIC_WATERMARK_SECRET = 'forensic-secret';
  process.env.PUBLIC_APP_URL = 'https://pascom-drive.test';
});

afterEach(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_APP_PASSWORD;
  delete process.env.SMTP_FROM_NAME;
  delete process.env.SMTP_REPLY_TO;
  delete process.env.DOWNLOAD_JWT_SECRET;
  delete process.env.FORENSIC_WATERMARK_SECRET;
  delete process.env.PUBLIC_APP_URL;
});

it('gera downloads com fingerprint forense por pedido e foto', async () => {
  sheets.buscarOriginaisPedido.mockResolvedValue([{ fotoId: 'F1', originalFileId: 'ORIGINAL_1' }]);

  const result = await criarDownloadsDoPedido({ id: 'PED_1' });

  expect(result[0]).toEqual(expect.objectContaining({
    fotoId: 'F1',
    originalFileId: 'ORIGINAL_1',
    fingerprintId: expect.any(String),
    fingerprintHash: expect.any(String),
    fingerprintVersion: 'pascom-v1',
    url: expect.stringContaining('https://pascom-drive.test/api/download?token='),
  }));
  expect(sheets.gravarAutorizacoesDownload).toHaveBeenCalledWith('PED_1', [expect.objectContaining({
    fingerprintId: result[0].fingerprintId,
    fingerprintHash: result[0].fingerprintHash,
  })]);
});

it('emite link de 7 dias e 5 usos e reaproveita o DownloadID que ja existe para a foto', async () => {
  sheets.buscarOriginaisPedido.mockResolvedValue([{ fotoId: 'F1', originalFileId: 'ORIGINAL_1' }]);
  sheets.listarDownloadsPedido.mockResolvedValue([{ fotoId: 'F1', downloadId: 'DL_ANTIGO', uses: 2, maxUses: 2 }]);

  const [record] = await criarDownloadsDoPedido({ id: 'PED_1' });

  expect(record.id).toBe('DL_ANTIGO');
  expect(record.maxUses).toBe(5);
  const dias = (record.exp - Date.now()) / (24 * 60 * 60 * 1000);
  expect(dias).toBeGreaterThan(6.9);
  expect(dias).toBeLessThan(7.1);
  expect(record.expiresAt).toBe(new Date(record.exp).toISOString());
});

it('explica no e-mail a validade e como recuperar os links', async () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'mail-1' });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  await enviarEmailEntrega({ id: 'PED_9', email: 'cliente@example.com' }, downloads);

  const { html } = sendMail.mock.calls[0][0];
  expect(html).toContain('7 dias');
  expect(html).toContain('/pedidos/recuperar');
  expect(html).toContain('PED_9');
});

it('envia links temporarios por Gmail SMTP com senha de app sanitizada', async () => {
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'mail-1' });
  nodemailer.createTransport.mockReturnValue({ sendMail });

  const result = await enviarEmailEntrega(pedido, downloads);

  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: 'murillo.roseno.lima@gmail.com',
      pass: 'abcdefghijklmnop',
    },
  }));
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
    from: '"Paroquia Sao Rafael - Fotos" <murillo.roseno.lima@gmail.com>',
    replyTo: 'murillo.roseno.lima@gmail.com',
    to: 'cliente@example.com',
    html: expect.stringContaining('https://safe.test/download-1'),
  }));
  expect(result).toEqual(expect.objectContaining({ status: 'enviado', error: '' }));
});

it('informa quando SMTP ainda nao foi configurado', async () => {
  delete process.env.SMTP_APP_PASSWORD;

  const result = await enviarEmailEntrega(pedido, downloads);

  expect(nodemailer.createTransport).not.toHaveBeenCalled();
  expect(result).toEqual(expect.objectContaining({ status: 'nao_configurado' }));
});

it('registra falha SMTP sem propagar erro para o webhook', async () => {
  nodemailer.createTransport.mockReturnValue({
    sendMail: jest.fn().mockRejectedValue(new Error('Gmail bloqueou o login')),
  });

  const result = await enviarEmailEntrega(pedido, downloads);

  expect(result).toEqual(expect.objectContaining({
    status: 'falhou',
    error: 'Gmail bloqueou o login',
  }));
});
