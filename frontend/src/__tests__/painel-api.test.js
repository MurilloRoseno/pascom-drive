import { chamarPainel } from '../painel/api.js';

const resposta = (status, corpo) =>
  Promise.resolve({ ok: status < 400, status, json: () => (corpo === undefined ? Promise.reject(new Error('sem corpo')) : Promise.resolve(corpo)) });

const DICA = { clerk_error: { type: 'forbidden', reason: 'reverification-error', metadata: { reverification: 'strict' } } };
const token = async () => 'tok';

beforeEach(() => { globalThis.fetch = jest.fn(); });

describe('chamarPainel', () => {
  it('manda o token como Bearer e o corpo como JSON', async () => {
    fetch.mockReturnValue(resposta(200, { ok: 1 }));
    const r = await chamarPainel('/api/pascom/x', token, { method: 'PUT', body: { a: 1 } });
    const [, opcoes] = fetch.mock.calls[0];
    expect(opcoes.method).toBe('PUT');
    expect(opcoes.headers.Authorization).toBe('Bearer tok');
    expect(opcoes.headers['Content-Type']).toBe('application/json');
    expect(opcoes.body).toBe('{"a":1}');
    expect(r).toEqual({ ok: 1 });
  });

  it('erro HTTP vira exceção com mensagem e status', async () => {
    fetch.mockReturnValue(resposta(400, { error: 'Dados inválidos' }));
    await expect(chamarPainel('/x', token)).rejects.toMatchObject({ message: 'Dados inválidos', status: 400 });
  });

  it('resposta sem JSON cai na mensagem genérica', async () => {
    fetch.mockReturnValue(resposta(502, undefined));
    await expect(chamarPainel('/x', token)).rejects.toMatchObject({ message: 'Erro HTTP 502', status: 502 });
  });

  it('a dica de reverificação é um ERRO por padrão (páginas comuns não a confundem com sucesso)', async () => {
    fetch.mockReturnValue(resposta(403, DICA));
    await expect(chamarPainel('/x', token)).rejects.toMatchObject({ status: 403 });
  });

  it('com aceitarDica devolve a dica, para o useReverification abrir o desafio', async () => {
    fetch.mockReturnValue(resposta(403, DICA));
    await expect(chamarPainel('/x', token, { aceitarDica: true })).resolves.toEqual(DICA);
  });

  it('com aceitarDica, um 403 comum (sem permissão) continua sendo erro', async () => {
    fetch.mockReturnValue(resposta(403, { error: 'Sem permissão para esta ação' }));
    await expect(chamarPainel('/x', token, { aceitarDica: true })).rejects.toMatchObject({ message: 'Sem permissão para esta ação' });
  });
});
