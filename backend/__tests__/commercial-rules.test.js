jest.mock('../lib/google-sheets.shared', () => ({
  yes: (value) => String(value || '').toUpperCase() === 'SIM' || value === true,
  rows: jest.fn(),
  fotoFromRow: (row) => ({
    id: row.get('FotoID'),
    eventoId: row.get('EventoID'),
    type: row.get('TipoFoto') === 'capa' ? 'capa' : 'foto',
    status: row.get('StatusProcessamento'),
    availableForSale: String(row.get('DisponivelVenda')).toUpperCase() === 'SIM',
  }),
}));

const shared = require('../lib/google-sheets.shared');
const { calcularComercial, listarOfertasEvento } = require('../lib/commercial-rules');

function row(data) {
  return {
    get: (key) => data[key],
    set: jest.fn(),
    save: jest.fn(),
  };
}

const items = [
  { foto: { id: 'F1', eventoId: 'EV1' }, evento: { eventoId: 'EV1' } },
  { foto: { id: 'F2', eventoId: 'EV1' }, evento: { eventoId: 'EV1' } },
  { foto: { id: 'F3', eventoId: 'EV1' }, evento: { eventoId: 'EV1' } },
];
const paymentRules = [{ method: 'pix', percentage: 0, fixed: 0 }];

beforeEach(() => {
  shared.rows.mockImplementation(async (sheet) => {
    if (sheet === 'Cupons') return [
      row({ Codigo: 'PASTORAL10', EventoID: 'EV1', TipoDesconto: 'percentual', Valor: 10, Ativo: 'SIM', UsoMaximo: 0, Usos: 0, Descricao: 'Cupom pastoral' }),
    ];
    if (sheet === 'Pacotes') return [
      row({ PacoteID: 'COMBO3', EventoID: 'EV1', Tipo: 'quantity_bundle', QuantidadeMinima: 3, PercentualDesconto: 20, Ativo: 'SIM', Descricao: '3 fotos com desconto' }),
    ];
    return [];
  });
});

it('aplica o maior desconto valido sem empilhar cupom e pacote', async () => {
  const pricing = await calcularComercial({
    items,
    paymentMethod: 'pix',
    paymentRules,
    couponCode: 'PASTORAL10',
    packageId: 'COMBO3',
  });
  expect(pricing.discountTotal).toBe(6);
  expect(pricing.packageApplied.id).toBe('COMBO3');
  expect(pricing.couponApplied).toBeNull();
  expect(pricing.total).toBe(27);
});

it('retorna ofertas publicas aplicaveis ao evento', async () => {
  await expect(listarOfertasEvento('EV1')).resolves.toMatchObject({
    coupons: [{ code: 'PASTORAL10' }],
    packages: [{ id: 'COMBO3' }],
  });
});
