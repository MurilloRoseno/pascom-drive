const { z } = require('zod');

const whatsappSchema = z.string().regex(/^\d{10,13}$/, 'WhatsApp invalido');
const methodSchema = z.enum(['pix', 'credit_card']);

const criarPagamentoSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatorio').max(120),
  email: z.string().email('E-mail invalido').max(160),
  whatsapp: whatsappSchema,
  fotoIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos 1 foto').max(100),
  paymentMethod: methodSchema,
  galleryTokens: z.record(z.string()).default({}),
  couponCode: z.string().trim().max(40).optional().default(''),
  packageId: z.string().trim().max(80).optional().default(''),
});

const cotacaoSchema = z.object({
  fotoIds: z.array(z.string().min(1)).min(1).max(100),
  paymentMethod: methodSchema,
  galleryTokens: z.record(z.string()).default({}),
  couponCode: z.string().trim().max(40).optional().default(''),
  packageId: z.string().trim().max(80).optional().default(''),
});

const acessoGaleriaSchema = z.object({ code: z.string().trim().min(4).max(40) });
const statusPagamentoSchema = z.object({ pedidoId: z.string().min(10) });
const recuperarPedidoSchema = z.object({
  email: z.string().email('E-mail invalido.').max(160),
  pedidoId: z.string().trim().min(6, 'Codigo do pedido obrigatorio.').max(80),
});

module.exports = {
  whatsappSchema, methodSchema, criarPagamentoSchema,
  cotacaoSchema, acessoGaleriaSchema, statusPagamentoSchema, recuperarPedidoSchema,
};
