import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagamentos from '../painel/pages/Pagamentos.jsx';
import {
  renderPainel, resposta, chamadas, TODAS,
} from '../test-utils/painel.jsx';

const CONFIG = {
  precoFoto: 5, taxaServico: 2, taxaComodidade: 1,
  tarifaCartaoPct: 3.99, tarifaCartaoFixo: 0.39, tarifaPixPct: 1.19, tarifaPixFixo: 0,
};
const INTEGRACAO = {
  gateway: 'stripe',
  gatewayDefinido: true,
  stripe: { chaveSecreta: true, segredoWebhook: false, modo: 'teste' },
  segredos: { download: true, marcaForense: false },
};

const cota = (q, total) => ({
  quantidade: q, precoUnitario: 5, subtotal: 5 * q, taxaServico: 2, taxaComodidade: 1, custoPagamento: 0.74, total, gatewayRetem: 0.74, liquido: total - 0.74,
});
const SIMULACAO = (q) => ({
  atual: { cartao: cota(q, 8.74 + 5 * (q - 1)), pix: cota(q, 8.16 + 5 * (q - 1)) },
  tabela: [1, 3, 5, 10].map((n) => ({
    quantidade: n, cartao: cota(n, 8.74 + 5 * (n - 1)), pix: cota(n, 8.16 + 5 * (n - 1)), acrescimoCartaoPercentual: 74.8,
  })),
});

function rotas(extra = {}, integracao = INTEGRACAO) {
  return (url, opcoes) => {
    const caminho = url.replace(/^.*(?=\/api)/, '');
    const chave = `${opcoes.method || 'GET'} ${caminho.split('?')[0]}`;
    if (extra[chave]) return extra[chave](opcoes, caminho);
    if (chave === 'GET /api/pascom/configuracoes') return resposta(200, CONFIG);
    if (chave === 'GET /api/pascom/pagamentos/estado') return resposta(200, integracao);
    if (chave === 'GET /api/pascom/pagamentos/simulador') return resposta(200, SIMULACAO(Number(new URLSearchParams(caminho.split('?')[1]).get('quantidade'))));
    return resposta(404, { error: `sem rota: ${chave}` });
  };
}

const corpo = (o) => JSON.parse(o.body);
const aberta = () => screen.findByRole('heading', { name: 'Preço e taxas' });

describe('tela Pagamentos: gateways e estado', () => {
  it('mostra Stripe ativo em modo de teste, o que falta e o Mercado Pago em reserva', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByText('Modo de teste')).toBeInTheDocument();
    expect(screen.getByText(/Chave secreta configurada/)).toBeInTheDocument();
    expect(screen.getByText(/Segredo do webhook FALTANDO/)).toBeInTheDocument();
    expect(screen.getByText(/Segredo da marca forense FALTANDO/)).toBeInTheDocument();
    expect(screen.getByText('Em reserva')).toBeInTheDocument();
    expect(screen.getByText(/PAYMENT_GATEWAY=stripe/)).toBeInTheDocument();
  });

  it('sem PAYMENT_GATEWAY definido, avisa que o Mercado Pago é quem está valendo', async () => {
    renderPainel(<Pagamentos />, {
      rotas: rotas({}, { ...INTEGRACAO, gateway: 'mercadopago', gatewayDefinido: false, stripe: { chaveSecreta: false, segredoWebhook: false, modo: null } }),
    });
    await aberta();
    expect(screen.getByText('Não é o gateway ativo')).toBeInTheDocument();
    expect(screen.getByText(/Está valendo porque PAYMENT_GATEWAY não está definido como stripe/)).toBeInTheDocument();
    expect(screen.getByText(/PAYMENT_GATEWAY=\(não definido\)/)).toBeInTheDocument();
  });

  it('mostra os valores atuais nos campos, com centavos', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByLabelText('Preço de cada foto (R$)')).toHaveValue('5,00');
    expect(screen.getByLabelText('Taxa de serviço (R$)')).toHaveValue('2,00');
    expect(screen.getByLabelText('Taxa de comodidade (R$)')).toHaveValue('1,00');
    expect(document.getElementById('cartao-pct')).toHaveValue('3,99');
    expect(document.getElementById('cartao-fixo')).toHaveValue('0,39');
    expect(document.getElementById('pix-fixo')).toHaveValue('0,00');
  });
});

describe('tela Pagamentos: salvar', () => {
  it('sem mudança, o botão diz "Nada para salvar" e fica desabilitado', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByRole('button', { name: 'Nada para salvar' })).toBeDisabled();
  });

  it('muda o preço: envia só a chave alterada, em número, pela chamada sensível', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<Pagamentos />, { rotas: rotas({ 'PUT /api/pascom/configuracoes': put }) });
    await aberta();
    const campo = screen.getByLabelText('Preço de cada foto (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '6,50');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    expect(await screen.findByText('Preço e taxas atualizados.')).toBeInTheDocument();
    expect(put).toHaveBeenCalledTimes(1);
    expect(corpo(put.mock.calls[0][0])).toEqual({ chave: 'precoFoto', valor: 6.5 });
  });

  it('várias mudanças viram várias chamadas, uma por chave', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<Pagamentos />, { rotas: rotas({ 'PUT /api/pascom/configuracoes': put }) });
    await aberta();
    const servico = screen.getByLabelText('Taxa de serviço (R$)');
    await userEvent.clear(servico);
    await userEvent.type(servico, '2,50');
    const pix = document.getElementById('pix-pct');
    await userEvent.clear(pix);
    await userEvent.type(pix, '1,5');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 2 alterações' }));
    await screen.findByText('Preço e taxas atualizados.');
    const enviados = put.mock.calls.map(([o]) => corpo(o));
    expect(enviados).toContainEqual({ chave: 'tarifaPixPct', valor: 1.5 });
    expect(enviados).toContainEqual({ chave: 'taxaServico', valor: 2.5 });
  });

  it('taxa zerada é aceita (desligar a taxa de comodidade)', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<Pagamentos />, { rotas: rotas({ 'PUT /api/pascom/configuracoes': put }) });
    await aberta();
    const campo = screen.getByLabelText('Taxa de comodidade (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    await screen.findByText('Preço e taxas atualizados.');
    expect(corpo(put.mock.calls[0][0])).toEqual({ chave: 'taxaComodidade', valor: 0 });
  });

  it('valor fora do limite: mostra o erro e não chama a API', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    const campo = screen.getByLabelText('Preço de cada foto (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    expect(await screen.findByText(/Preço da foto: informe um valor entre 0,5 e 1000/)).toBeInTheDocument();
    expect(chamadas('/api/pascom/configuracoes', 'PUT')).toHaveLength(0);
  });

  it('taxa acima do limite e texto que não é número também são recusados', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    const servico = screen.getByLabelText('Taxa de serviço (R$)');
    await userEvent.clear(servico);
    await userEvent.type(servico, '51');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    expect(await screen.findByText(/Taxa de serviço: informe um valor entre 0 e 50/)).toBeInTheDocument();
    await userEvent.clear(servico);
    await userEvent.type(servico, 'abc');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    expect(await screen.findByText(/Taxa de serviço: informe um valor/)).toBeInTheDocument();
    expect(chamadas('/api/pascom/configuracoes', 'PUT')).toHaveLength(0);
  });

  it('usa a chamada com reautenticação e, se a pessoa cancelar o desafio, avisa e para', async () => {
    const chamarSensivel = jest.fn().mockResolvedValue(undefined);
    renderPainel(<Pagamentos />, { rotas: rotas(), chamarSensivel });
    await aberta();
    const campo = screen.getByLabelText('Preço de cada foto (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '7');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    expect(await screen.findByText(/Alteração cancelada/)).toBeInTheDocument();
    expect(chamarSensivel).toHaveBeenCalledWith('/api/pascom/configuracoes', { method: 'PUT', body: { chave: 'precoFoto', valor: 7 } });
  });

  it('erro do servidor aparece no aviso', async () => {
    const put = jest.fn(() => resposta(403, { error: 'Sem permissão para esta ação' }));
    renderPainel(<Pagamentos />, { rotas: rotas({ 'PUT /api/pascom/configuracoes': put }) });
    await aberta();
    const campo = screen.getByLabelText('Taxa de comodidade (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar 1 alteração' }));
    expect(await screen.findByText('Sem permissão para esta ação')).toBeInTheDocument();
  });

  it('descartar volta aos valores salvos', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    const campo = screen.getByLabelText('Preço de cada foto (R$)');
    await userEvent.clear(campo);
    await userEvent.type(campo, '9');
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByLabelText('Preço de cada foto (R$)')).toHaveValue('5,00');
  });

  it('quem só pode ver não edita nem vê o botão de salvar', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas(), permissoes: TODAS.filter((p) => p !== 'pagamentos.editar') });
    await aberta();
    expect(screen.getByLabelText('Preço de cada foto (R$)')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Salvar|Nada para salvar/ })).not.toBeInTheDocument();
  });

  it('falha ao carregar mostra o erro e permite tentar de novo', async () => {
    renderPainel(<Pagamentos />, { rotas: () => resposta(500, { error: 'Erro interno. Tente de novo em instantes.' }) });
    expect(await screen.findByText('Não foi possível carregar os pagamentos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});

describe('tela Pagamentos: simulador (conta feita no servidor)', () => {
  it('pede ao servidor a simulação e mostra total do comprador, retenção do gateway e líquido da paróquia', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    const sim = (await screen.findByRole('heading', { name: 'Simulador de pedido' })).closest('section');
    expect(await within(sim).findByText('R$ 18,74')).toBeInTheDocument(); // 3 fotos no cartão
    expect(within(sim).getByText('Paróquia recebe líquido')).toBeInTheDocument();
    expect(within(sim).getByText('R$ 18,00')).toBeInTheDocument();
    expect(within(sim).getByText('Taxa de serviço')).toBeInTheDocument();
    expect(within(sim).getByText('Taxa de comodidade')).toBeInTheDocument();
    expect(chamadas('/api/pascom/pagamentos/simulador')[0][0]).toContain('quantidade=3');
  });

  it('mudar a quantidade ou o método atualiza a conta', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    await userEvent.click(await screen.findByRole('button', { name: 'Mais uma foto' }));
    await screen.findByText('4 fotos');
    expect(chamadas('/api/pascom/pagamentos/simulador').at(-1)[0]).toContain('quantidade=4');
    await userEvent.click(screen.getByRole('radio', { name: 'Pix' }));
    expect(await screen.findByText('R$ 23,16')).toBeInTheDocument();
  });

  it('mostra a tabela por quantidade com o acréscimo percentual do cartão', async () => {
    renderPainel(<Pagamentos />, { rotas: rotas() });
    await aberta();
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getAllByRole('row')).toHaveLength(5);
    expect(within(tabela).getAllByText('74,8 %').length).toBe(4);
  });
});
