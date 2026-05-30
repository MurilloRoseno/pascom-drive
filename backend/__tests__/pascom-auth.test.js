jest.mock('@clerk/express', () => ({
  clerkMiddleware: jest.fn(() => (req, _res, next) => {
    req.auth = () => ({ userId: global.__clerkUserId || null });
    next();
  }),
  getAuth: jest.fn((req) => req.auth()),
  clerkClient: { users: { getUser: jest.fn() } },
}));

jest.mock('../lib/google-sheets.shared', () => ({
  rows: jest.fn(),
  yes: jest.requireActual('../lib/google-sheets.shared').yes,
}));

const { clerkClient } = require('@clerk/express');
const { rows } = require('../lib/google-sheets.shared');
const { findPascomMember, normalizePhone, phoneMatches } = require('../lib/pascom-auth');

function teamRow(data) {
  return {
    get: (key) => data[key],
    set: jest.fn((key, value) => { data[key] = value; }),
    save: jest.fn().mockResolvedValue(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.__clerkUserId = 'user_123';
});

it('normaliza telefone e compara com ou sem DDI brasileiro', () => {
  expect(normalizePhone('+55 (99) 99164-6063')).toBe('5599991646063');
  expect(phoneMatches('5599991646063', '99991646063')).toBe(true);
});

it('autoriza membro ativo por e-mail e atualiza ultimo acesso', async () => {
  const row = teamRow({ Identificador: 'pascom@paroquia.test', Tipo: 'email', Nome: 'Pascom', Role: 'admin', Ativo: 'SIM' });
  rows.mockResolvedValue([row]);

  const member = await findPascomMember({ emails: ['PASCOM@PAROQUIA.TEST'], phones: [] });

  expect(member).toEqual(expect.objectContaining({ name: 'Pascom', role: 'admin' }));
  expect(row.set).toHaveBeenCalledWith('UltimoAcessoEm', expect.any(String));
});

it('ignora membro inativo', async () => {
  rows.mockResolvedValue([teamRow({ Identificador: 'pascom@paroquia.test', Tipo: 'email', Ativo: 'NAO' })]);
  await expect(findPascomMember({ emails: ['pascom@paroquia.test'], phones: [] })).resolves.toBeNull();
});

it('extrai identificadores do usuario Clerk', async () => {
  clerkClient.users.getUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: 'pascom@paroquia.test' }],
    phoneNumbers: [{ phoneNumber: '+55 99 99164-6063' }],
  });
  const user = await clerkClient.users.getUser('user_123');
  expect(user.emailAddresses[0].emailAddress).toBe('pascom@paroquia.test');
});
