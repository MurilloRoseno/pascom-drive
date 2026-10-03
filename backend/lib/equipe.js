const { z } = require('zod');
const { obterAba } = require('./google-sheets');
const { PAPEIS } = require('./permissions');
const { neutralizarCelula } = require('./sheet-safe');
const { ErroNegocio, validar } = require('./erros');

// Aba que já existe na planilha (docs/database.md): a pessoa é identificada por
// e-mail ou telefone, na coluna Identificador, e o painel só acrescenta os campos que faltam.
const ABA = 'EquipePascom';
const CABECALHOS = ['Identificador', 'Tipo', 'Nome', 'Role', 'Ativo', 'CriadoEm', 'UltimoAcessoEm'];

const normalizar = (valor) => String(valor || '').trim().toLowerCase();
const adminDoAmbiente = () => normalizar(process.env.PAINEL_ADMIN_EMAIL);
const ativoNaLinha = (row) => String(row.get('Ativo') || '').trim().toUpperCase() === 'SIM';
const tipoDaLinha = (row) => (normalizar(row.get('Tipo')) === 'phone' ? 'phone' : 'email');
const chaveDaLinha = (row) => (tipoDaLinha(row) === 'phone'
  ? String(row.get('Identificador') || '').replace(/\D/g, '')
  : normalizar(row.get('Identificador')));

/** Papel do painel a partir do que está na planilha; vazio ou desconhecido não vale nada. */
const papelValido = (role) => {
  const papel = normalizar(role);
  return PAPEIS.includes(papel) ? papel : '';
};

const abaEquipe = () => obterAba(ABA, CABECALHOS);

const paraObjeto = (row) => ({
  email: tipoDaLinha(row) === 'phone' ? String(row.get('Identificador') || '').trim() : normalizar(row.get('Identificador')),
  tipo: tipoDaLinha(row),
  nome: row.get('Nome') || '',
  role: papelValido(row.get('Role')),
  papelNaPlanilha: normalizar(row.get('Role')),
  ativo: ativoNaLinha(row),
  fixo: false,
});

/** Equipe da planilha; o admin do ambiente vem primeiro, marcado como fixo. */
async function listarEquipe() {
  const rows = await (await abaEquipe()).getRows();
  const lista = rows.map(paraObjeto);
  const fixo = adminDoAmbiente();
  if (!fixo) return lista;
  return [
    { email: fixo, tipo: 'email', nome: 'Administrador', role: 'admin', papelNaPlanilha: 'admin', ativo: true, fixo: true },
    ...lista.filter((m) => m.email !== fixo),
  ];
}

const novoSchema = z.object({
  email: z.string().transform(normalizar).pipe(z.string().email('Informe um e-mail válido.').max(120)),
  nome: z.string().transform((v) => v.replace(/\s+/g, ' ').trim()).pipe(z.string().min(2, 'Informe o nome.').max(80)),
  role: z.string().refine((r) => PAPEIS.includes(r), 'Papel desconhecido.'),
}).strict();

const patchSchema = z.object({
  nome: novoSchema.shape.nome.optional(),
  role: novoSchema.shape.role.optional(),
  ativo: z.boolean().optional(),
}).strict();

/** @param {unknown} entrada */
async function adicionarMembro(entrada) {
  const dados = validar(novoSchema, entrada);
  const aba = await abaEquipe();
  const rows = await aba.getRows();
  if (dados.email === adminDoAmbiente() || rows.some((r) => tipoDaLinha(r) === 'email' && chaveDaLinha(r) === dados.email)) {
    throw new ErroNegocio('Este e-mail já está na equipe.');
  }
  const criada = await aba.addRow({
    Identificador: dados.email,
    Tipo: 'email',
    Nome: neutralizarCelula(dados.nome),
    Role: dados.role,
    Ativo: 'SIM',
    CriadoEm: new Date().toISOString(),
  });
  return paraObjeto(criada);
}

/**
 * Muda papel, nome ou situação. Nunca deixa o painel sem administrador ativo, e o
 * admin definido no ambiente não é editável aqui.
 * @param {string} identificador e-mail ou telefone da pessoa
 * @param {unknown} entrada
 */
async function atualizarMembro(identificador, entrada) {
  const alvo = /@/.test(String(identificador)) ? normalizar(identificador) : String(identificador || '').replace(/\D/g, '');
  if (alvo === adminDoAmbiente()) {
    throw new ErroNegocio('Este administrador é definido no ambiente e não pode ser alterado aqui.');
  }
  const patch = validar(patchSchema, entrada);
  const rows = await (await abaEquipe()).getRows();
  const row = rows.find((r) => chaveDaLinha(r) === alvo);
  if (!row) throw new ErroNegocio('Pessoa não encontrada na equipe.', 404);

  const antes = paraObjeto(row);
  const depois = { ...antes, ...patch };
  const eraAdminAtivo = antes.ativo && antes.role === 'admin';
  const seraAdminAtivo = depois.ativo && depois.role === 'admin';
  if (eraAdminAtivo && !seraAdminAtivo) {
    const outros = rows.filter((r) => r !== row).map(paraObjeto).filter((m) => m.ativo && m.role === 'admin').length;
    if (outros + (adminDoAmbiente() ? 1 : 0) === 0) throw new ErroNegocio('Precisa existir ao menos um administrador ativo.');
  }

  if (patch.nome !== undefined) row.set('Nome', neutralizarCelula(patch.nome));
  if (patch.role !== undefined) row.set('Role', patch.role);
  if (patch.ativo !== undefined) row.set('Ativo', patch.ativo ? 'SIM' : 'NAO');
  await row.save();
  return paraObjeto(row);
}

module.exports = {
  papelValido, listarEquipe, adicionarMembro, atualizarMembro, adminDoAmbiente,
};
