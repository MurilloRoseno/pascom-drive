// Regras de gestao de eventos para o Painel Pascom (funcoes puras).
// Espelham google-apps-script/Sheet.js so para a interface explicar por que uma acao
// esta indisponivel; quem aplica a regra de verdade e o Apps Script.

const EM_PROCESSAMENTO = new Set(['Pendente', 'Processando']);

function emProcessamento(evento) {
  return EM_PROCESSAMENTO.has(String(evento.status || ''));
}

/** Etapa do ciclo: fila -> processando -> revisar -> publicado -> avenda (ou erro/arquivado). */
function etapaEvento(evento) {
  if (evento.fila) return 'fila';
  if (evento.publication === 'arquivado') return 'arquivado';
  if (emProcessamento(evento)) return 'processando';
  if (String(evento.status || '') === 'Erro' && evento.publication !== 'publicado') return 'erro';
  if (evento.publication === 'publicado') return evento.salesAuthorized ? 'avenda' : 'publicado';
  return 'revisar';
}

function acao(ok, motivo = '') {
  return ok ? { ok: true } : { ok: false, motivo };
}

function acoesDisponiveis(evento) {
  if (evento.fila) return {};
  const arquivado = evento.publication === 'arquivado';
  const publicado = evento.publication === 'publicado';
  const processando = emProcessamento(evento);
  const menoresAbertos = evento.minorProtection && evento.visibility !== 'protegida';
  const semFotos = !(evento.fotosProcessadas > 0);
  const arquivosRemovidos = Boolean(evento.espacoLiberacao);
  const REMOVIDOS = 'Os arquivos deste evento foram removidos para liberar espaço.';
  const pedido = evento.pedidoPendente;
  const NA_FILA = pedido ? `Aguarde: ${pedido.tipo === 'trocarCapa' ? 'a troca de capa' : 'um pedido'} está na fila do processamento.` : '';
  const comErro = String(evento.status || '') === 'Erro';
  const faltam = evento.restantes > 0 ? `Processando: faltam ${evento.restantes} ${evento.restantes === 1 ? 'foto' : 'fotos'}.` : 'Aguarde o processamento das fotos terminar.';

  let publicarMotivo = '';
  if (arquivosRemovidos) publicarMotivo = REMOVIDOS;
  else if (publicado) publicarMotivo = 'O evento já está publicado.';
  else if (processando) publicarMotivo = faltam;
  else if (!evento.category || !evento.date) publicarMotivo = 'Informe categoria e data antes de publicar.';

  let vendaMotivo = '';
  if (arquivosRemovidos) vendaMotivo = REMOVIDOS;
  else if (evento.salesAuthorized) vendaMotivo = 'A venda já está liberada.';
  else if (arquivado) vendaMotivo = 'Evento arquivado não pode vender.';
  else if (menoresAbertos) vendaMotivo = 'Evento com menores precisa ficar protegido por código.';
  else if (semFotos) vendaMotivo = 'Nenhuma foto processada para vender.';

  return {
    publicar: acao(!publicarMotivo, publicarMotivo),
    despublicar: acao(publicado, 'O evento não está publicado.'),
    autorizarVenda: acao(!vendaMotivo, vendaMotivo),
    revogarVenda: acao(evento.salesAuthorized, 'A venda não está liberada.'),
    tornarPublica: acao(
      evento.visibility !== 'publica' && !evento.minorProtection,
      evento.minorProtection ? 'Evento com menores não pode ser público.' : 'A galeria já é pública.',
    ),
    tornarProtegida: acao(evento.visibility !== 'protegida', 'A galeria já é protegida.'),
    gerarCodigo: acao(!arquivado, 'Evento arquivado.'),
    revogarCodigo: acao(evento.hasCode, 'Não há código ativo.'),
    arquivar: acao(!arquivado, 'O evento já está arquivado.'),
    editar: acao(true),
    reprocessar: acao(comErro && !pedido, comErro ? NA_FILA : 'Só eventos com fotos que falharam podem ser reprocessados.'),
    descartarFalhas: acao(comErro && !pedido, comErro ? NA_FILA : 'Não há fotos com falha.'),
    trocarCapa: acao(
      !processando && !arquivosRemovidos && !pedido && !arquivado,
      processando ? faltam : arquivosRemovidos ? REMOVIDOS : arquivado ? 'Evento arquivado.' : NA_FILA,
    ),
    liberarEspaco: acao(
      arquivado && evento.espacoLiberacao !== 'concluida',
      arquivado ? 'O espaço deste evento já foi liberado.' : 'Arquive o evento antes de liberar espaço.',
    ),
  };
}

/** Avisos que nao bloqueiam, mas evitam surpresas para quem publica. */
function avisosEvento(evento) {
  if (evento.fila) return [];
  const avisos = [];
  if (evento.visibility === 'protegida' && !evento.hasCode && evento.publication !== 'arquivado') {
    avisos.push('Galeria protegida sem código ativo: ninguém consegue abri-la. Gere um código antes de divulgar.');
  }
  if (!evento.hasCover && evento.visibility === 'protegida') {
    avisos.push('Sem capa: o card do evento aparece sem imagem no site.');
  }
  if (evento.pedidoErro) {
    avisos.push(`A última troca de capa falhou: ${evento.pedidoErro}`);
  }
  if (evento.espacoLiberacao === 'parcial') {
    avisos.push('A liberação de espaço parou no meio. Use "Liberar espaço" de novo para terminar.');
  }
  if (String(evento.status || '') === 'Erro') {
    const n = (evento.falhas || []).length;
    avisos.push(n
      ? `${n === 1 ? '1 foto falhou' : `${n} fotos falharam`} no processamento. As demais já estão prontas; veja "Fotos com falha".`
      : `Algumas fotos falharam no processamento${evento.erro ? `: ${evento.erro}` : '.'}`);
  }
  return avisos;
}

module.exports = { acoesDisponiveis, avisosEvento, emProcessamento, etapaEvento };
