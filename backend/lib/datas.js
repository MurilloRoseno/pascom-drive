// Datas como texto 'AAAA-MM-DD', sem fuso: "15 de agosto" nunca vira dia 14 por causa
// do horário de verão ou do UTC. Date só é usado em UTC, para somar dias.

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 24 * 60 * 60 * 1000;

const paraUTC = (data) => Date.UTC(Number(data.slice(0, 4)), Number(data.slice(5, 7)) - 1, Number(data.slice(8, 10)));
const paraTexto = (ms) => new Date(ms).toISOString().slice(0, 10);

/** @param {unknown} data */
function dataValida(data) {
  if (typeof data !== 'string' || !FORMATO.test(data)) return false;
  return paraTexto(paraUTC(data)) === data;
}

const somarDias = (data, dias) => paraTexto(paraUTC(data) + dias * DIA_MS);

/** Primeiro dia do mês, `meses` à frente (ou atrás). */
function somarMeses(data, meses) {
  const total = Number(data.slice(0, 4)) * 12 + (Number(data.slice(5, 7)) - 1) + meses;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

/** 0 = domingo ... 6 = sábado */
const diaDaSemana = (data) => new Date(paraUTC(data)).getUTCDay();

function diasNoMes(data) {
  return new Date(Date.UTC(Number(data.slice(0, 4)), Number(data.slice(5, 7)), 0)).getUTCDate();
}

/** Hoje em São Paulo ('AAAA-MM-DD'). */
function hojeSP(agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(agora).map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
}

/**
 * Faixa de 42 dias (6 semanas, domingo primeiro) que o calendário mostra para o mês.
 * @param {string} mes 'AAAA-MM'
 */
function faixaDaGrade(mes) {
  const primeiro = `${mes}-01`;
  const de = somarDias(primeiro, -diaDaSemana(primeiro));
  return { de, ate: somarDias(de, 41) };
}

module.exports = { dataValida, somarDias, somarMeses, diaDaSemana, diasNoMes, hojeSP, faixaDaGrade };
