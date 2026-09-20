const { AppsScriptError, chamarAppsScript, VERSAO_WEBAPP_ESPERADA } = require('../lib/apps-script-client');
const { dateLabel, displayTitle, rows, sheet } = require('../lib/google-sheets.shared');
const { corrigirNomePastaSchema, eventoIdSchema, pastaQuarentenaSchema } = require('../lib/validation');
const {
  ABAS_OBRIGATORIAS, GRUPOS, consolidar, falhaAppsScript, interpretarDiagnostico, resumir, verificarAmbiente,
  verificarPlanilha,
} = require('../lib/system-check');

const ABAS_VERIFICADAS = [...ABAS_OBRIGATORIAS, 'Cupons', 'Pacotes'];
const STATUS_PROCESSADO = new Set(['Processado', 'Concluido']);

async function lerPlanilha() {
  const encontradas = await Promise.all(ABAS_VERIFICADAS.map(async (titulo) => [titulo, await sheet(titulo)]));
  const abas = new Set(encontradas.filter(([, aba]) => aba).map(([titulo]) => titulo));
  const eventos = abas.has('Eventos') ? await rows('Eventos') : [];
  return { abas, eventos };
}

function eventosArquivados(eventos) {
  return eventos
    .filter((row) => row.get('EventoID') && row.get('Publicacao') === 'arquivado')
    .map((row) => ({
      eventoId: row.get('EventoID'),
      title: displayTitle(row.get('Titulo') || row.get('NomePasta')),
      dateLabel: dateLabel(row.get('DataEvento')),
      totalFotos: Number(row.get('TotalFotos') || 0),
      espacoLiberacao: String(row.get('EspacoLiberacao') || ''),
      espacoLiberadoBytes: Number(row.get('EspacoLiberadoBytes') || 0),
    }))
    .sort((a, b) => Number(a.espacoLiberacao === 'concluida') - Number(b.espacoLiberacao === 'concluida'));
}

/** Uso do Drive + projecao de quantos eventos do tamanho medio ainda cabem. */
function resumoArmazenamento(armazenamento, eventos) {
  if (!armazenamento) return null;
  const pastas = armazenamento.pastas?.pastas || {};
  const bytesEventos = Object.values(pastas).reduce((total, pasta) => total + (Number(pasta.bytes) || 0), 0);
  const ativos = eventos.filter((row) => (
    STATUS_PROCESSADO.has(row.get('StatusProcessamento') || row.get('Status')) && !row.get('EspacoLiberacao')
  )).length;
  const mediaPorEvento = ativos > 0 && bytesEventos > 0 ? Math.round(bytesEventos / ativos) : null;
  return {
    usado: armazenamento.usado,
    limite: armazenamento.limite,
    livre: armazenamento.livre,
    pastas: armazenamento.pastas || null,
    eventosAtivos: ativos,
    mediaPorEvento,
    cabemEventos: mediaPorEvento && armazenamento.livre !== null ? Math.floor(armazenamento.livre / mediaPorEvento) : null,
  };
}

async function diagnostico(_req, res, next) {
  try {
    const [planilha, appsScript] = await Promise.allSettled([lerPlanilha(), chamarAppsScript('diagnostico')]);
    const eventos = planilha.status === 'fulfilled' ? planilha.value.eventos : [];
    const eventosComErro = eventos.filter((row) => (row.get('StatusProcessamento') || row.get('Status')) === 'Erro').length;
    const diag = appsScript.status === 'fulfilled' ? appsScript.value : null;

    const itens = consolidar(
      verificarAmbiente(process.env),
      verificarPlanilha(planilha.status === 'fulfilled' ? planilha.value.abas : null, eventosComErro),
      diag ? interpretarDiagnostico(diag, VERSAO_WEBAPP_ESPERADA) : [falhaAppsScript(appsScript.reason)],
    );

    res.setHeader('Cache-Control', 'private, no-store');
    return res.json({
      verificadoEm: new Date().toISOString(),
      resumo: resumir(itens),
      grupos: GRUPOS.map(([id, titulo]) => ({ id, titulo })),
      itens,
      appsScriptDisponivel: Boolean(diag),
      armazenamento: resumoArmazenamento(diag?.armazenamento, eventos),
      quarentena: diag?.quarentena || [],
      ultimaExecucao: diag?.ultimaExecucao || null,
      arquivados: eventosArquivados(eventos),
    });
  } catch (error) {
    return next(error);
  }
}

async function estimarLiberacao(req, res, next) {
  const parsed = eventoIdSchema.safeParse(req.params.eventoId);
  if (!parsed.success) return res.status(400).json({ error: 'Evento invalido.' });
  try {
    const estimativa = await chamarAppsScript('estimarLiberacao', { eventoId: parsed.data });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(estimativa);
  } catch (error) {
    if (error instanceof AppsScriptError) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    return next(error);
  }
}

function quem(req) {
  return req.pascom?.email || req.pascom?.phone || req.pascom?.userId || '';
}

async function acaoQuarentena(req, res, next, acao, dados) {
  const folderId = pastaQuarentenaSchema.safeParse(req.params.folderId);
  if (!folderId.success) return res.status(400).json({ error: 'Pasta invalida.' });
  try {
    const resultado = await chamarAppsScript(acao, { ...dados, folderId: folderId.data, quem: quem(req) });
    res.setHeader('Cache-Control', 'private, no-store');
    return res.json(resultado);
  } catch (error) {
    if (error instanceof AppsScriptError) {
      return res.status(error.status).json({ error: error.message, codigo: error.codigo });
    }
    return next(error);
  }
}

/** Devolve as fotos com falha e tira o prefixo _ERRO_: o proximo ciclo processa de novo. */
function reprocessarPasta(req, res, next) {
  return acaoQuarentena(req, res, next, 'reprocessarPasta', {});
}

/** Pasta com nome fora do padrao: renomeia para categoria__data__titulo e devolve para a fila. */
function corrigirNomePasta(req, res, next) {
  const dados = corrigirNomePastaSchema.safeParse(req.body || {});
  if (!dados.success) return res.status(400).json({ error: dados.error.issues[0]?.message || 'Dados invalidos.' });
  return acaoQuarentena(req, res, next, 'corrigirNomePasta', dados.data);
}

module.exports = { corrigirNomePasta, diagnostico, estimarLiberacao, reprocessarPasta };
