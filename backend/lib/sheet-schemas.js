// Nome e cabeçalhos das abas NOVAS do painel, em um só lugar. obterAba cria a
// aba ou acrescenta as colunas que faltam; as colunas antigas nunca mudam de posição.
// As abas da operação (Eventos, Fotos, Pedidos, EquipePascom…) já existem na planilha
// e seguem o esquema documentado em docs/database.md.

const ACESSOS = {
  aba: 'Acessos',
  cabecalhos: ['Papel', 'Permissoes', 'AtualizadoEm', 'Por'],
};

module.exports = { ACESSOS };
