const { z } = require('zod');
const { ErroNegocio, validar } = require('../lib/erros');

const schema = z.object({
  titulo: z.string().min(3, 'Dê um título ao compromisso.'),
  tipo: z.enum(['a', 'b']),
}).strict();

describe('validar', () => {
  it('devolve os dados quando estão certos', () => {
    expect(validar(schema, { titulo: 'Missa', tipo: 'a' })).toEqual({ titulo: 'Missa', tipo: 'a' });
  });

  it('repassa a mensagem em português escrita por nós', () => {
    expect(() => validar(schema, { titulo: 'x', tipo: 'a' })).toThrow('Dê um título ao compromisso.');
  });

  it('esconde a mensagem padrão (inglês) do Zod atrás de "Dados inválidos"', () => {
    for (const ruim of [{ titulo: 'Missa', tipo: 'z' }, { titulo: 'Missa' }, { titulo: 'Missa', tipo: 'a', extra: 1 }, null]) {
      expect(() => validar(schema, ruim)).toThrow('Dados inválidos');
    }
  });

  it('o erro é de negócio (400), então o handler global devolve a mensagem', () => {
    try {
      validar(schema, { titulo: 'x', tipo: 'a' });
    } catch (e) {
      expect(e).toBeInstanceOf(ErroNegocio);
      expect(e.status).toBe(400);
    }
  });
});
