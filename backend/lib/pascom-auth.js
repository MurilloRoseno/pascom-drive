const { clerkClient, clerkMiddleware, getAuth } = require('@clerk/express');
const { rows, yes } = require('./google-sheets.shared');
const { papelValido, adminDoAmbiente } = require('./equipe');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function phoneMatches(left, right) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.replace(/^55/, '') === b.replace(/^55/, '');
}

function authorizedParties() {
  return String(process.env.CLERK_AUTHORIZED_PARTIES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function configured() {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

function pascomClerkMiddleware() {
  return (req, res, next) => {
    if (!configured()) return next();
    const options = { secretKey: process.env.CLERK_SECRET_KEY };
    const parties = authorizedParties();
    if (parties.length) options.authorizedParties = parties;
    return clerkMiddleware(options)(req, res, next);
  };
}

function userIdentifiers(user) {
  const emails = (user?.emailAddresses || [])
    .map((item) => normalizeEmail(item.emailAddress))
    .filter(Boolean);
  const phones = (user?.phoneNumbers || [])
    .map((item) => normalizePhone(item.phoneNumber))
    .filter(Boolean);
  return { emails: [...new Set(emails)], phones: [...new Set(phones)] };
}

async function findPascomMember({ emails = [], phones = [] }) {
  const team = await rows('EquipePascom');
  const emailSet = new Set(emails.map(normalizeEmail).filter(Boolean));
  const phoneList = phones.map(normalizePhone).filter(Boolean);
  const member = team.find((row) => {
    if (!yes(row.get('Ativo'))) return false;
    const type = String(row.get('Tipo') || '').trim().toLowerCase();
    const identifier = row.get('Identificador');
    if (type === 'email') return emailSet.has(normalizeEmail(identifier));
    if (type === 'phone') return phoneList.some((phone) => phoneMatches(phone, identifier));
    return false;
  });
  if (!member) return null;
  try {
    member.set('UltimoAcessoEm', new Date().toISOString());
    await member.save();
  } catch (_error) {
    // A autorizacao nao deve falhar se uma planilha legada ainda nao permite escrita nesta coluna.
  }
  return {
    name: member.get('Nome') || '',
    role: papelValido(member.get('Role')), // vazio ou desconhecido: sem papel no painel
    identifier: member.get('Identificador') || '',
    type: member.get('Tipo') || '',
  };
}

async function authenticatePascom(req, res, next) {
  if (!configured()) {
    return res.status(503).json({ error: 'Autenticacao Pascom nao configurada.' });
  }
  let auth;
  try {
    auth = getAuth(req);
  } catch (_error) {
    return res.status(401).json({ error: 'Sessao Pascom ausente.' });
  }
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Sessao Pascom ausente.' });
  }
  try {
    const user = await clerkClient.users.getUser(auth.userId);
    const identifiers = userIdentifiers(user);
    const fixo = adminDoAmbiente(); // PAINEL_ADMIN_EMAIL entra sempre como admin (primeiro acesso)
    const member = fixo && identifiers.emails.includes(fixo)
      ? { name: 'Administrador', role: 'admin', identifier: fixo, type: 'email' }
      : await findPascomMember(identifiers);
    if (!member) {
      return res.status(403).json({ error: 'Usuario sem permissao na EquipePascom.' });
    }
    req.pascom = {
      userId: auth.userId,
      name: member.name || user.fullName || user.firstName || 'Equipe Pascom',
      role: member.role,
      email: identifiers.emails[0] || '',
      phone: identifiers.phones[0] || '',
      identifiers,
      sessao: auth.sessionClaims || {}, // claims do token (reautenticação: fva)
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authenticatePascom,
  findPascomMember,
  normalizeEmail,
  normalizePhone,
  pascomClerkMiddleware,
  phoneMatches,
  userIdentifiers,
};
