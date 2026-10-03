const { obterAba, rows } = require('./google-sheets');
const { EVENTOS_EXTRA } = require('./sheet-schemas');
const { slugsAtivos, CATEGORIA_PADRAO } = require('./categorias');
const { estadoPublicacao, montarPublicacao, publicacaoSchema } = require('./publicacao');
const { invalidateCacheTags } = require('./runtime-cache');
const { ErroNegocio } = require('./erros');

// A aba Eventos é da operação (Apps Script e site). O painel lê sem alterá-la e, ao gravar,
// só garante as 3 colunas novas no fim (PublicarEm, ExpiraEm, PrazoDias).
const abaParaGravar = () => obterAba('Eventos', EVENTOS_EXTRA);

const texto = (row, coluna) => String(row.get(coluna) || '').trim();

function paraObjeto(row, agora) {
  const publicacao = texto(row, 'Publicacao').toLowerCase();
  const janela = { publicacao, publicarEm: texto(row, 'PublicarEm'), expiraEm: texto(row, 'ExpiraEm') };
  return {
    eventoId: row.get('EventoID'),
    nome: texto(row, 'Titulo') || texto(row, 'NomePasta'),
    categoria: texto(row, 'Categoria') || CATEGORIA_PADRAO,
    categoriaPreenchida: Boolean(texto(row, 'Categoria')),
    data: texto(row, 'DataEvento'),
    statusProcessamento: texto(row, 'StatusProcessamento') || texto(row, 'Status'),
    visibilidade: texto(row, 'Visibilidade') || 'protegida',
    vendaAutorizada: texto(row, 'VendaAutorizada').toUpperCase() === 'SIM',
    totalFotos: parseInt(row.get('TotalFotos') || '0', 10) || 0,
    publicacao,
    publicarEm: janela.publicarEm,
    expiraEm: janela.expiraEm,
    prazoDias: parseInt(row.get('PrazoDias') || '0', 10) || 0,
    ...estadoPublicacao(janela, agora),
  };
}

/** Eventos com o estado de publicação calculado no momento da leitura. */
async function listarEventosAdmin(agora = new Date()) {
  return (await rows('Eventos')).map((r) => paraObjeto(r, agora));
}

async function acharEvento(eventoId) {
  const aba = await abaParaGravar();
  const linhas = await aba.getRows();
  const row = linhas.find((r) => r.get('EventoID') === eventoId);
  if (!row) throw new ErroNegocio('Evento não encontrado.', 404);
  return row;
}

/** O que o site guarda em cache sobre este evento precisa ser renovado já. */
async function renovarCache(eventoId) {
  try {
    await invalidateCacheTags(['catalogo-eventos', `evento-${eventoId}`, `media-${eventoId}`]);
  } catch (err) {
    // Sem cache a mudança vale na hora: o estado é recalculado a cada leitura.
    console.error('[eventos-admin] cache não renovado', err.message);
  }
}

/**
 * Entrada vem do navegador: só modo, dia, hora e prazo. As datas finais e o
 * status são montados aqui, no servidor.
 * @param {string} eventoId
 * @param {unknown} entrada
 * @param {Date} [agora]
 */
async function atualizarPublicacao(eventoId, entrada, agora = new Date()) {
  const pedido = publicacaoSchema.parse(entrada);
  const dados = montarPublicacao(pedido, agora);
  const row = await acharEvento(eventoId);

  if (dados.publicacao === 'publicado') {
    if (!texto(row, 'Categoria') || !texto(row, 'DataEvento')) {
      throw new ErroNegocio('Informe a categoria e a data do evento antes de publicar.');
    }
    if (texto(row, 'StatusProcessamento').toLowerCase() === 'erro') {
      throw new ErroNegocio('O processamento deste evento terminou com erro. Corrija antes de publicar.');
    }
    row.set('DataPublicacao', agora.toISOString());
  }
  row.set('Publicacao', dados.publicacao);
  row.set('PublicarEm', dados.publicarEm);
  row.set('ExpiraEm', dados.expiraEm);
  row.set('PrazoDias', String(dados.prazoDias));
  await row.save();
  await renovarCache(eventoId);
  return paraObjeto(row, agora);
}

async function atualizarCategoriaEvento(eventoId, slug) {
  if (!(await slugsAtivos()).includes(slug)) throw new ErroNegocio('Categoria inválida.');
  const row = await acharEvento(eventoId);
  row.set('Categoria', slug);
  await row.save();
  await renovarCache(eventoId);
  return paraObjeto(row, new Date());
}

module.exports = { listarEventosAdmin, atualizarPublicacao, atualizarCategoriaEvento };
