// Textos e formatação da tela de publicação. Só exibição: quem decide as datas
// e o estado é o servidor.

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** '2026-10-17T08:00' -> 'sáb 17/10 às 08:00' */
export function formatarDataHora(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/.exec(iso || '');
  if (!m) return '';
  const dia = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `${DIAS_SEMANA[dia.getUTCDay()]} ${m[3]}/${m[2]} às ${m[4]}`;
}

const ESTADOS = {
  rascunho: { rotulo: 'Rascunho', tom: 'cinza' },
  agendado: { rotulo: 'Agendado', tom: 'amarelo' },
  no_ar: { rotulo: 'No ar', tom: 'verde' },
  arquivado: { rotulo: 'Arquivado', tom: 'arquivado' },
};

/** @param {{estado: string, saiEmDias: number|null}} evento */
export function rotuloEstado(evento) {
  if (evento.estado === 'no_ar' && evento.saiEmDias !== null && evento.saiEmDias <= 3) {
    return { rotulo: evento.saiEmDias <= 1 ? 'Sai hoje' : `Sai em ${evento.saiEmDias}d`, tom: 'laranja' };
  }
  return ESTADOS[evento.estado] || ESTADOS.rascunho;
}

/** Texto curto da coluna "Entra no ar" e da saída. */
export function textoEntrada(evento) {
  if (evento.estado === 'rascunho') return 'Ainda não publicado';
  return evento.publicarEm ? formatarDataHora(evento.publicarEm) : 'No ar desde antes do painel';
}

export function textoSaida(evento) {
  if (evento.expiraEm) return `${evento.estado === 'arquivado' ? 'saiu' : 'sai'} ${formatarDataHora(evento.expiraEm)}`;
  return 'sem prazo';
}

export const PRAZOS = [
  { valor: 3, rotulo: '3 dias' },
  { valor: 7, rotulo: '1 semana' },
  { valor: 'custom', rotulo: 'Personalizado' },
  { valor: 0, rotulo: 'Sem prazo' },
];

/** Qual opção do segmentado corresponde a um prazo em dias. */
export function opcaoDoPrazo(dias) {
  return [3, 7, 0].includes(dias) ? dias : 'custom';
}

/**
 * Prévia (só exibição) do que vai acontecer ao salvar.
 * @param {{modo: 'agora'|'agendar', data: string, hora: string, prazoDias: number}} f
 */
export function resumoPublicacao({ modo, data, hora, prazoDias }) {
  const entra = modo === 'agora' ? 'Hoje, ao salvar' : (data && hora ? formatarDataHora(`${data}T${hora}`) : 'Escolha o dia');
  if (prazoDias <= 0) return { entra, sai: 'Não sai sozinho: arquive à mão' };
  const depoisDe = modo === 'agora' ? 'salvar' : 'entrar no ar';
  return { entra, sai: `${prazoDias} ${prazoDias === 1 ? 'dia' : 'dias'} depois de ${depoisDe}` };
}
