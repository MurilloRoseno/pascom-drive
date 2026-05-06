import { whatsAppSchema, checkoutSchema } from '../lib/validation.js';

describe('whatsAppSchema', () => {
  it('aceita número válido com 11 dígitos', () => {
    expect(whatsAppSchema.safeParse('11999999999').success).toBe(true);
  });
  it('aceita número válido com 10 dígitos', () => {
    expect(whatsAppSchema.safeParse('1199999999').success).toBe(true);
  });
  it('rejeita número com menos de 10 dígitos', () => {
    expect(whatsAppSchema.safeParse('999999').success).toBe(false);
  });
  it('rejeita número com mais de 11 dígitos', () => {
    expect(whatsAppSchema.safeParse('119999999999').success).toBe(false);
  });
  it('rejeita letras', () => {
    expect(whatsAppSchema.safeParse('1199999999a').success).toBe(false);
  });
  it('rejeita string vazia', () => {
    expect(whatsAppSchema.safeParse('').success).toBe(false);
  });
});

describe('checkoutSchema', () => {
  it('aceita dados válidos', () => {
    const r = checkoutSchema.safeParse({ whatsapp: '11999999999', fotoIds: ['1', '2'] });
    expect(r.success).toBe(true);
  });
  it('rejeita array vazio de fotoIds', () => {
    const r = checkoutSchema.safeParse({ whatsapp: '11999999999', fotoIds: [] });
    expect(r.success).toBe(false);
  });
  it('rejeita whatsapp inválido', () => {
    const r = checkoutSchema.safeParse({ whatsapp: '123', fotoIds: ['1'] });
    expect(r.success).toBe(false);
  });
});
