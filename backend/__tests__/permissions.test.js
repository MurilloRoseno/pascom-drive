const { temPermissao, permissoesDoPapel, PAPEIS, AREAS } = require('../lib/permissions');

describe('permissions', () => {
  it('admin tem todas as permissões de todas as áreas', () => {
    for (const area of AREAS) {
      for (const acao of area.acoes) {
        expect(temPermissao('admin', `${area.chave}.${acao}`)).toBe(true);
      }
    }
  });

  it('coordenação não mexe em pagamentos, segurança, módulos nem acessos', () => {
    expect(temPermissao('coord', 'eventos.editar')).toBe(true);
    expect(temPermissao('coord', 'pagamentos.ver')).toBe(true);
    expect(temPermissao('coord', 'pagamentos.editar')).toBe(false);
    expect(temPermissao('coord', 'seguranca.editar')).toBe(false);
    expect(temPermissao('coord', 'modulos.gerenciar')).toBe(false);
    expect(temPermissao('coord', 'acessos.gerenciar')).toBe(false);
  });

  it('fotógrafo só vê/cria eventos e envia fotos', () => {
    expect(temPermissao('foto', 'eventos.criar')).toBe(true);
    expect(temPermissao('foto', 'envio.criar')).toBe(true);
    expect(temPermissao('foto', 'eventos.excluir')).toBe(false);
    expect(temPermissao('foto', 'pedidos.ver')).toBe(false);
    expect(temPermissao('foto', 'agenda.ver')).toBe(false);
  });

  it('atendimento cuida de pedidos, agenda e ajuda', () => {
    expect(temPermissao('atend', 'pedidos.editar')).toBe(true);
    expect(temPermissao('atend', 'agenda.criar')).toBe(true);
    expect(temPermissao('atend', 'ajuda.editar')).toBe(true);
    expect(temPermissao('atend', 'ajuda.excluir')).toBe(false);
    expect(temPermissao('atend', 'pagamentos.ver')).toBe(false);
  });

  it('papel desconhecido, nulo ou permissão inexistente nunca autoriza', () => {
    expect(temPermissao('root', 'eventos.ver')).toBe(false);
    expect(temPermissao(undefined, 'eventos.ver')).toBe(false);
    expect(temPermissao('admin', 'inexistente.ver')).toBe(false);
    expect(temPermissao('admin', undefined)).toBe(false);
  });

  it('só o admin gerencia módulos e acessos', () => {
    for (const papel of PAPEIS.filter((p) => p !== 'admin')) {
      expect(temPermissao(papel, 'modulos.gerenciar')).toBe(false);
      expect(temPermissao(papel, 'acessos.gerenciar')).toBe(false);
    }
  });

  it('permissoesDoPapel lista as chaves liberadas', () => {
    const lista = permissoesDoPapel('foto');
    expect(lista).toEqual(expect.arrayContaining(['eventos.ver', 'eventos.criar', 'eventos.editar', 'envio.ver', 'envio.criar']));
    expect(lista).not.toContain('pedidos.ver');
    expect(permissoesDoPapel('nada')).toEqual([]);
  });
});
