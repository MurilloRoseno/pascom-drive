const meHandler = require('../api/pascom-me');

function res() {
  const r = {};
  r.json = jest.fn(() => r);
  return r;
}

describe('GET /api/pascom/me', () => {
  it('devolve quem é o membro e o que o papel dele pode fazer (só para montar o menu)', async () => {
    const r = res();
    await meHandler({ pascom: { userId: 'u1', name: 'Ana', role: 'foto', email: 'ana@pascom.org', phone: '' } }, r);
    const { user } = r.json.mock.calls[0][0];
    expect(user).toMatchObject({ id: 'u1', name: 'Ana', role: 'foto', email: 'ana@pascom.org' });
    expect(user.permissoes).toEqual(expect.arrayContaining(['eventos.criar', 'envio.criar']));
    expect(user.permissoes).not.toContain('pagamentos.editar');
  });

  it('papel em branco ou desconhecido: nenhuma permissão', async () => {
    const r = res();
    await meHandler({ pascom: { userId: 'u1', name: 'Zé', role: '', email: 'ze@pascom.org', phone: '' } }, r);
    expect(r.json.mock.calls[0][0].user.permissoes).toEqual([]);
  });
});
