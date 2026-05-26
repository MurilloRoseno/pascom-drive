jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('../lib/google-sheets', () => ({
  buscarOriginaisPedido: jest.fn(),
  criarAutorizacoesDownload: jest.fn(),
}));

const nodemailer = require('nodemailer');
const { enviarEmailEntrega } = require('../lib/delivery');

const pedido = { email: 'cliente@example.com' };
const downloads = [{ url: 'https://safe.test/download-1' }];

beforeEach(() => {
  jest.clearAllMocks();
  process.env.SMTP_HOST = 'smtp.gmail.com';
  process.env.SMTP_PORT = '465';
  process.env.SMTP_SECURE = 'true';
  process.env.SMTP_USER = 'murillo.roseno.lima@gmail.com';
  process.env.SMTP_APP_PASSWORD = 'abcd efgh ijkl mnop';
  process.env.SMTP_FROM_NAME = 'Paroquia Sao Rafael - Fotos';
  process.env.SMTP_REPLY_TO = 'murillo.roseno.lima@gmail.com';
});

afterEach(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_APP_PASSWORD;
  delete process.env.SMTP_FROM_NAME;
  delete process.env.SMTP_REPLY_TO;
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
