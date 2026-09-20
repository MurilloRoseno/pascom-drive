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

// Mesma lista de google-apps-script/EventQueue.js (CATEGORIAS_EVENTO) e frontend/src/data/categories.js.
const CATEGORIAS_EVENTO = [
  'celebracoes', 'batismo', 'eucaristia', 'crisma', 'casamento', 'uncao-dos-enfermos', 'ordem',
];
const UPLOAD_TAMANHO_MAXIMO = 40 * 1024 * 1024;
const UPLOAD_MAX_FOTOS = 1000;

const uploadIdSchema = z.string().regex(/^[A-Za-z0-9_-]{10,120}$/, 'Envio invalido.');
const nomeArquivoUploadSchema = z.string().trim().min(1).max(180).regex(/\.(jpe?g|png)$/i, 'Use fotos JPG ou PNG.');

const uploadEventoSchema = z.object({
  categoria: z.enum(CATEGORIAS_EVENTO, { errorMap: () => ({ message: 'Categoria invalida.' }) }),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida.')
    .refine((value) => !Number.isNaN(new Date(`${value}T12:00:00`).getTime()), 'Data invalida.'),
  titulo: z.string().trim().min(3, 'Titulo muito curto.').max(80, 'Titulo muito longo.')
    .refine((value) => /[a-z0-9À-ɏ]/i.test(value), 'Titulo precisa ter letras ou numeros.'),
  totalArquivos: z.number().int().min(1, 'Selecione ao menos 1 foto.').max(UPLOAD_MAX_FOTOS),
  bytesTotais: z.number().int().min(0),
});

const uploadSessoesSchema = z.object({
  uploadId: uploadIdSchema,
  arquivos: z.array(z.object({
    nome: nomeArquivoUploadSchema,
    mimeType: z.enum(['image/jpeg', 'image/png'], { errorMap: () => ({ message: 'Use fotos JPG ou PNG.' }) }),
    tamanho: z.number().int().positive().max(UPLOAD_TAMANHO_MAXIMO, 'Cada foto pode ter no maximo 40 MB.'),
  })).min(1).max(20),
});

const uploadFinalizarSchema = z.object({
  esperados: z.number().int().min(1).max(UPLOAD_MAX_FOTOS),
  capa: nomeArquivoUploadSchema.optional(),
});

const eventoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,120}$/, 'Evento invalido.');
const acaoSimples = (acao) => z.object({ acao: z.literal(acao) });

// Mesmos limites de google-apps-script/Sheet.js (validarCampoEvento); o Apps Script revalida.
const camposEventoSchema = z.object({
  Titulo: z.string().trim().min(3, 'Titulo muito curto.').max(120, 'Titulo muito longo.').optional(),
  DataEvento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida.').optional(),
  HorarioEvento: z.string().regex(/^(|([01]\d|2[0-3]):[0-5]\d)$/, 'Horario invalido. Use HH:mm.').optional(),
  Categoria: z.enum(CATEGORIAS_EVENTO, { errorMap: () => ({ message: 'Categoria invalida.' }) }).optional(),
  SlugPublico: z.string().trim().max(80)
    .regex(/^(|[a-z0-9]+(-[a-z0-9]+)*)$/, 'Link publico: use letras minusculas, numeros e hifens.').optional(),
  ProtecaoMenores: z.enum(['SIM', 'NAO']).optional(),
}).strict().refine((campos) => Object.keys(campos).length > 0, 'Nada para alterar.');

const pastaQuarentenaSchema = z.string().regex(/^[A-Za-z0-9_-]{10,120}$/, 'Pasta invalida.');
const corrigirNomePastaSchema = uploadEventoSchema.pick({ categoria: true, data: true, titulo: true }).strict();

const eventoAcaoSchema = z.discriminatedUnion('acao', [
  acaoSimples('publicar'),
  acaoSimples('despublicar'),
  acaoSimples('autorizarVenda'),
  acaoSimples('revogarVenda'),
  acaoSimples('gerarCodigo'),
  acaoSimples('revogarCodigo'),
  acaoSimples('arquivar'),
  acaoSimples('liberarEspaco'),
  acaoSimples('reprocessar'),
  acaoSimples('descartarFalhas'),
  z.object({ acao: z.literal('trocarCapa'), fotoId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/, 'Foto invalida.') }),
  z.object({ acao: z.literal('definirVisibilidade'), visibilidade: z.enum(['publica', 'protegida']) }),
  z.object({ acao: z.literal('editar'), campos: camposEventoSchema }),
], { errorMap: () => ({ message: 'Acao invalida.' }) });

module.exports = {
  whatsappSchema, methodSchema, criarPagamentoSchema,
  cotacaoSchema, acessoGaleriaSchema, statusPagamentoSchema, recuperarPedidoSchema,
  CATEGORIAS_EVENTO, uploadIdSchema, uploadEventoSchema, uploadSessoesSchema, uploadFinalizarSchema,
  eventoIdSchema, eventoAcaoSchema, pastaQuarentenaSchema, corrigirNomePastaSchema,
};
