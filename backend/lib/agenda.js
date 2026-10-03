const crypto = require('crypto');
const { z } = require('zod');
const { obterAba } = require('./google-sheets');
const { AGENDA } = require('./sheet-schemas');
const { neutralizarCelula } = require('./sheet-safe');
const { ErroNegocio, validar } = require('./erros');
const {
  dataValida, somarDias, diaDaSemana, diasNoMes, faixaDaGrade, hojeSP,
} = require('./datas');

const TIPOS = [
  { id: 'missa', nome: 'Missa' },
  { id: 'sacramento', nome: 'Sacramento' },
  { id: 'reuniao', nome: 'Reunião' },
  { id: 'formacao', nome: 'Formação' },
  { id: 'festa', nome: 'Festa' },
];
const RECORRENCIAS = ['nenhuma', 'semanal', 'mensal'];

const hora = z.string().refine((v) => v === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'Horário inválido.');

const entradaSchema = z.object({
  titulo: z.string().transform((v) => v.replace(/\s+/g, ' ').trim()).pipe(z.string().min(3, 'Dê um título ao compromisso.').max(120)),
  data: z.string().refine(dataValida, 'Escolha uma data válida.'),
  hora: hora.default(''),
  horaFim: hora.default(''),
  local: z.string().max(120).default(''),
  tipo: z.enum(TIPOS.map((t) => t.id)),
  recorrencia: z.enum(RECORRENCIAS).default('nenhuma'),
  ate: z.string().refine((v) => v === '' || dataValida(v), 'Escolha uma data válida.').default(''),
  descricao: z.string().max(500).default(''),
}).strict();

const abaAgenda = () => obterAba(AGENDA.aba, AGENDA.cabecalhos);
const agora = () => new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const texto = (v) => neutralizarCelula(String(v ?? '').replace(/\s+/g, ' ').trim());

/** Regras que dependem de mais de um campo. */
function conferir(d) {
  if (d.horaFim && (!d.hora || d.horaFim <= d.hora)) throw new ErroNegocio('O horário de término precisa ser depois do início.');
  if (d.recorrencia !== 'nenhuma' && d.ate && d.ate < d.data) throw new ErroNegocio('O fim da repetição precisa ser depois da data.');
  return { ...d, ate: d.recorrencia === 'nenhuma' ? '' : d.ate };
}

function paraObjeto(row) {
  return {
    id: row.get('Id'),
    titulo: row.get('Titulo'),
    data: row.get('Data'),
    hora: row.get('Hora') || '',
    horaFim: row.get('HoraFim') || '',
    local: row.get('Local') || '',
    tipo: row.get('Tipo'),
    recorrencia: row.get('Recorrencia') || 'nenhuma',
    ate: row.get('Ate') || '',
    descricao: row.get('Descricao') || '',
    ativo: String(row.get('Ativo')).toUpperCase() === 'SIM',
  };
}

function paraLinha(d) {
  return {
    Titulo: texto(d.titulo), Data: d.data, Hora: d.hora, HoraFim: d.horaFim, Local: texto(d.local),
    Tipo: d.tipo, Recorrencia: d.recorrencia, Ate: d.ate, Descricao: texto(d.descricao), AtualizadoEm: agora(),
  };
}

/** @param {{incluirInativos?: boolean}} [opcoes] */
async function listarCompromissos({ incluirInativos = false } = {}) {
  const rows = await (await abaAgenda()).getRows();
  return rows.map(paraObjeto).filter((c) => incluirInativos || c.ativo);
}

async function criarCompromisso(entrada) {
  const dados = conferir(validar(entradaSchema, entrada));
  const criada = await (await abaAgenda()).addRow({ Id: `ag_${crypto.randomUUID().slice(0, 8)}`, ...paraLinha(dados), Ativo: 'SIM' });
  return paraObjeto(criada);
}

async function acharLinha(id) {
  const rows = await (await abaAgenda()).getRows();
  const row = rows.find((r) => r.get('Id') === id && String(r.get('Ativo')).toUpperCase() === 'SIM');
  if (!row) throw new ErroNegocio('Compromisso não encontrado.', 404);
  return row;
}

/** Mescla o que veio com o que já existe e valida o conjunto final. */
async function atualizarCompromisso(id, patch) {
  const row = await acharLinha(id);
  const { id: _id, ativo, ...atual } = paraObjeto(row);
  const dados = conferir(validar(entradaSchema, { ...atual, ...patch }));
  for (const [k, v] of Object.entries(paraLinha(dados))) row.set(k, v);
  await row.save();
  return paraObjeto(row);
}

/** Inativa: a linha fica na planilha como histórico. */
async function removerCompromisso(id) {
  const row = await acharLinha(id);
  row.set('Ativo', 'NAO');
  row.set('AtualizadoEm', agora());
  await row.save();
}

const publico = (c, data) => ({
  id: c.id, titulo: c.titulo, data, hora: c.hora, horaFim: c.horaFim, local: c.local, tipo: c.tipo, descricao: c.descricao, recorrencia: c.recorrencia,
});

/** Datas em que o compromisso acontece dentro de [de, ate] (inclusive). */
function datasDe(c, de, ate) {
  const limite = c.ate && c.ate < ate ? c.ate : ate;
  if (c.recorrencia === 'nenhuma') return c.data >= de && c.data <= limite ? [c.data] : [];

  const datas = [];
  if (c.recorrencia === 'semanal') {
    const inicio = c.data > de ? c.data : de;
    for (let d = inicio; d <= limite; d = somarDias(d, 1)) if (diaDaSemana(d) === diaDaSemana(c.data)) datas.push(d);
    return datas;
  }

  // mensal: mesmo dia do mês; meses menores caem no último dia
  const dia = Number(c.data.slice(8, 10));
  for (let mes = de.slice(0, 7); mes <= limite.slice(0, 7); mes = somarDias(`${mes}-28`, 4).slice(0, 7)) {
    const doMes = `${mes}-${String(Math.min(dia, diasNoMes(`${mes}-01`))).padStart(2, '0')}`;
    if (doMes >= c.data && doMes >= de && doMes <= limite) datas.push(doMes);
  }
  return datas;
}

/** Ordena por dia; dentro do dia, "dia inteiro" primeiro e depois por hora. */
const porDiaEHora = (a, b) => (a.data === b.data ? a.hora.localeCompare(b.hora) : a.data.localeCompare(b.data));

/**
 * @param {ReturnType<typeof paraObjeto>[]} compromissos
 * @param {string} de AAAA-MM-DD
 * @param {string} ate AAAA-MM-DD
 */
function expandir(compromissos, de, ate) {
  return compromissos
    .flatMap((c) => datasDe(c, de, ate).map((data) => publico(c, data)))
    .sort(porDiaEHora);
}

/** Ocorrências das 6 semanas que a grade do mês mostra. @param {string} mes AAAA-MM */
async function ocorrenciasDoMes(mes) {
  const { de, ate } = faixaDaGrade(mes);
  return expandir(await listarCompromissos(), de, ate);
}

/** Próximas ocorrências a partir de hoje (até 120 dias à frente). */
async function proximas(limite = 5, hoje = hojeSP()) {
  return expandir(await listarCompromissos(), hoje, somarDias(hoje, 120)).slice(0, limite);
}

module.exports = {
  TIPOS, RECORRENCIAS, listarCompromissos, criarCompromisso, atualizarCompromisso, removerCompromisso,
  expandir, ocorrenciasDoMes, proximas,
};
