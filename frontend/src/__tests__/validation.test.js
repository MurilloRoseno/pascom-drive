import { checkoutSchema, whatsAppSchema } from '../lib/validation.js';

describe('whatsAppSchema', () => {
  it('aceita telefone nacional ou com codigo do pais', () => {
    expect(whatsAppSchema.safeParse('99982061089').success).toBe(true);
    expect(whatsAppSchema.safeParse('5599982061089').success).toBe(true);
  });

  it('rejeita dados incompletos ou nao numericos', () => {
    expect(whatsAppSchema.safeParse('123').success).toBe(false);
    expect(whatsAppSchema.safeParse('99a82061089').success).toBe(false);
  });
});

describe('checkoutSchema', () => {
  it('exige identificacao para a entrega segura', () => {
    expect(checkoutSchema.safeParse({
      name: 'Maria Silva',
      email: 'maria@example.com',
      whatsapp: '99982061089',
    }).success).toBe(true);
    expect(checkoutSchema.safeParse({ whatsapp: '99982061089' }).success).toBe(false);
  });
});
