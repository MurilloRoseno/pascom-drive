const { z } = require('zod');

const whatsappSchema = z.string().regex(/^\d{10,11}$/, 'WhatsApp inválido');

const criarPagamentoSchema = z.object({
  whatsapp: whatsappSchema,
  fotoIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos 1 foto'),
});

const statusPagamentoSchema = z.object({
  transactionId: z.string().min(1, 'transactionId obrigatório'),
});

module.exports = { criarPagamentoSchema, statusPagamentoSchema };
