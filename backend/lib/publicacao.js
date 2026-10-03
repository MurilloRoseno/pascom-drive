const { z } = require('zod');
const { ErroNegocio } = require('./erros');

const DIA_MS = 24 * 60 * 60 * 1000;
const FORMATO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// A coluna `Publicacao` da planilha continua dizendo a intenção (rascunho, publicado,
// arquivado). `PublicarEm` e `ExpiraEm` dizem quando: datas 'YYYY-MM-DDTHH:mm' no horário
// de São Paulo, sem fuso, comparadas como texto. O estado de verdade (agendado, no ar,
// arquivado por prazo) é calculado na leitura: não precisa de gatilho e não atrasa.

/** @param {Date} [agora] @returns {string} 'YYYY-MM-DDTHH:mm' em São Paulo */
function agoraSP(agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(agora).map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

const emMs = (iso) => Date.parse(`${iso}:00Z`);

/** Soma dias (calendário) a um 'YYYY-MM-DDTHH:mm', mantendo a hora. */
function somarDias(iso, dias) {
  return new Date(emMs(iso) + dias * DIA_MS).toISOString().slice(0, 16);
}

/**
 * @param {{publicacao?: string, publicarEm?: string, expiraEm?: string}} ev `publicacao` é o valor bruto da coluna
 * @param {Date} [agora]
 * @returns {{estado: 'rascunho'|'agendado'|'no_ar'|'arquivado', saiEmDias: number|null}}
 */
function estadoPublicacao(ev, agora = new Date()) {
  const bruto = String(ev.publicacao || '').trim().toLowerCase();
  if (bruto === 'arquivado') return { estado: 'arquivado', saiEmDias: null };
  if (bruto !== 'publicado') return { estado: 'rascunho', saiEmDias: null };

  const agoraIso = agoraSP(agora);
  if (FORMATO.test(ev.publicarEm || '') && agoraIso < ev.publicarEm) {
    return { estado: 'agendado', saiEmDias: null };
  }
  if (FORMATO.test(ev.expiraEm || '')) {
    if (agoraIso >= ev.expiraEm) return { estado: 'arquivado', saiEmDias: null };
    return { estado: 'no_ar', saiEmDias: Math.ceil((emMs(ev.expiraEm) - emMs(agoraIso)) / DIA_MS) };
  }
  // Evento antigo (sem as colunas novas) ou sem prazo: continua no ar.
  return { estado: 'no_ar', saiEmDias: null };
}

/**
 * Valor de `evento.publication` que o resto do sistema compara com 'publicado':
 * só vira 'publicado' quando o evento está no ar agora.
 * @param {{publicationRaw?: string, publishAt?: string, expiresAt?: string}} evento objeto montado por eventoFromRow
 * @param {Date} [agora]
 * @returns {'rascunho'|'agendado'|'publicado'|'arquivado'}
 */
function publicacaoEfetiva(evento, agora = new Date()) {
  const { estado } = estadoPublicacao({
    publicacao: evento.publicationRaw, publicarEm: evento.publishAt, expiraEm: evento.expiresAt,
  }, agora);
  return estado === 'no_ar' ? 'publicado' : estado;
}

const publicacaoSchema = z.object({
  modo: z.enum(['agora', 'agendar', 'rascunho', 'arquivar']),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  prazoDias: z.number().int().min(0).max(365),
}).strict();

function dataExiste(data) {
  const d = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === data;
}

/**
 * Converte o pedido do painel nos campos da planilha. Quem decide as datas é o
 * servidor: o navegador só escolhe modo, dia, hora e prazo.
 * @param {z.infer<typeof publicacaoSchema>} entrada já validada pelo schema
 * @param {Date} [agora]
 * @returns {{publicacao: string, publicarEm: string, prazoDias: number, expiraEm: string}}
 */
function montarPublicacao(entrada, agora = new Date()) {
  const { modo, prazoDias } = entrada;
  if (modo === 'rascunho') return { publicacao: 'rascunho', publicarEm: '', prazoDias, expiraEm: '' };
  if (modo === 'arquivar') return { publicacao: 'arquivado', publicarEm: '', prazoDias, expiraEm: '' };

  let publicarEm = agoraSP(agora);
  if (modo === 'agendar') {
    if (!entrada.data || !entrada.hora || !dataExiste(entrada.data)) {
      throw new ErroNegocio('Escolha o dia e o horário da publicação.');
    }
    publicarEm = `${entrada.data}T${entrada.hora}`;
    if (publicarEm < agoraSP(agora)) throw new ErroNegocio('Escolha um dia a partir de hoje.');
  }

  return {
    publicacao: 'publicado',
    publicarEm,
    prazoDias,
    expiraEm: prazoDias > 0 ? somarDias(publicarEm, prazoDias) : '',
  };
}

module.exports = {
  agoraSP, somarDias, estadoPublicacao, publicacaoEfetiva, montarPublicacao, publicacaoSchema,
};
