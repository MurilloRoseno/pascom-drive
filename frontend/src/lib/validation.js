import { z } from 'zod';

export const whatsAppSchema = z.string().regex(/^\d{10,13}$/, 'Informe WhatsApp com DDD.');

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.'),
  email: z.string().email('Informe um e-mail valido.'),
  whatsapp: whatsAppSchema,
});
