// Nome e cabeçalhos das abas NOVAS do painel, em um só lugar. obterAba cria a
// aba ou acrescenta as colunas que faltam; as colunas antigas nunca mudam de posição.
// As abas da operação (Eventos, Fotos, Pedidos, EquipePascom…) já existem na planilha
// e seguem o esquema documentado em docs/database.md.

const CATEGORIAS = {
  aba: 'Categorias',
  cabecalhos: ['Id', 'Nome', 'Tipo', 'Ordem', 'Ativo'],
};

// Colunas que o painel acrescenta ao FIM da aba Eventos (as 26 da operação não mudam de lugar).
const EVENTOS_EXTRA = ['PublicarEm', 'ExpiraEm', 'PrazoDias'];

const ACESSOS = {
  aba: 'Acessos',
  cabecalhos: ['Papel', 'Permissoes', 'AtualizadoEm', 'Por'],
};

const FAQ = {
  aba: 'Faq',
  cabecalhos: [
    'Id', 'Tema', 'Pergunta', 'Resposta', 'Passos', 'Imagem', 'ImagemLegenda',
    'Video', 'VideoTitulo', 'Publicada', 'Ordem', 'AtualizadoEm',
  ],
};

// Perguntas que o assistente não soube responder (só o texto, sem dado pessoal).
const SEM_RESPOSTA = {
  aba: 'PerguntasSemResposta',
  cabecalhos: ['Quando', 'Pergunta', 'Situacao'],
};

// Compromissos da paróquia (missas, reuniões, festas). Não confundir com a aba Eventos (galerias de fotos).
const AGENDA = {
  aba: 'Agenda',
  cabecalhos: [
    'Id', 'Titulo', 'Data', 'Hora', 'HoraFim', 'Local', 'Tipo', 'Recorrencia', 'Ate', 'Descricao', 'Ativo', 'AtualizadoEm',
  ],
};

module.exports = {
  ACESSOS, AGENDA, CATEGORIAS, EVENTOS_EXTRA, FAQ, SEM_RESPOSTA,
};
