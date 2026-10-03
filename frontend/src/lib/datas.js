// Datas como texto 'AAAA-MM-DD' (e meses 'AAAA-MM'), sem fuso: o dia 15 nunca vira 14
// por causa do horário. Date só é usado em UTC, para somar dias.

const DIA_MS = 24 * 60 * 60 * 1000;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const paraUTC = (d) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const paraTexto = (ms) => new Date(ms).toISOString().slice(0, 10);

export const somarDias = (data, dias) => paraTexto(paraUTC(data) + dias * DIA_MS);

/** 'AAAA-MM' deslocado `n` meses. */
export function somarMeses(mes, n) {
  const total = Number(mes.slice(0, 4)) * 12 + (Number(mes.slice(5, 7)) - 1) + n;
  return `${String(Math.floor(total / 12)).padStart(4, '0')}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** 0 = domingo ... 6 = sábado */
export const diaDaSemana = (data) => new Date(paraUTC(data)).getUTCDay();

/**
 * As 42 células (6 semanas, domingo primeiro) do mês; dias de outros meses vêm
 * com doMes = false para o calendário esmaecê-los sem a altura da grade pular.
 * @param {string} mes 'AAAA-MM'
 * @returns {{data: string, doMes: boolean}[]}
 */
export function gradeDoMes(mes) {
  const primeiro = `${mes}-01`;
  const inicio = somarDias(primeiro, -diaDaSemana(primeiro));
  return Array.from({ length: 42 }, (_, i) => {
    const data = somarDias(inicio, i);
    return { data, doMes: data.slice(0, 7) === mes };
  });
}

/** 'outubro de 2026' */
export const tituloDoMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;

/** 'sábado, 3 de outubro' */
export const diaPorExtenso = (data) => `${DIAS[diaDaSemana(data)]}, ${Number(data.slice(8, 10))} de ${MESES[Number(data.slice(5, 7)) - 1]}`;

/** '03/10' */
export const dataCurta = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

/** Agrupa por dia: Map('AAAA-MM-DD' -> ocorrências), mantendo a ordem recebida. */
export function agruparPorDia(ocorrencias) {
  const mapa = new Map();
  for (const o of ocorrencias) {
    if (!mapa.has(o.data)) mapa.set(o.data, []);
    mapa.get(o.data).push(o);
  }
  return mapa;
}

/** 'Dia inteiro' ou '08:00' / '08:00 às 09:30'. */
export function horario({ hora, horaFim }) {
  if (!hora) return 'Dia inteiro';
  return horaFim ? `${hora} às ${horaFim}` : hora;
}
