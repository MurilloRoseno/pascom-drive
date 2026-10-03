// Aba de planilha em memória para os testes: mesma interface que o código usa
// de google-spreadsheet (getRows, addRow, row.get/set/save).

function criarLinha(dados) {
  return {
    dados,
    get: (k) => dados[k],
    set: (k, v) => { dados[k] = v; },
    save: async () => {},
    delete: async () => { dados.__apagada = true; },
  };
}

/**
 * @param {Record<string, unknown>[]} [iniciais]
 */
function criarAba(iniciais = []) {
  const linhas = iniciais.map((d) => criarLinha({ ...d }));
  return {
    linhas,
    getRows: async () => linhas.filter((l) => !l.dados.__apagada),
    addRow: async (dados) => {
      const l = criarLinha({ ...dados });
      linhas.push(l);
      return l;
    },
    /** Conteúdo atual como objetos simples, para asserções. */
    valores: () => linhas.filter((l) => !l.dados.__apagada).map((l) => ({ ...l.dados })),
  };
}

module.exports = { criarAba };
