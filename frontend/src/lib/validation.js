import { z } from 'zod';

export const whatsAppSchema = z.string()
  .regex(/^\d{10,11}$/, 'WhatsApp inválido — use apenas números (DDD + número)');

export const checkoutSchema = z.object({
  whatsapp: whatsAppSchema,
  fotoIds: z.array(z.string()).min(1, 'Selecione ao menos 1 foto'),
});
