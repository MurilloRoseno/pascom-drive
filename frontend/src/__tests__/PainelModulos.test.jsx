import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modulos from '../painel/pages/Modulos.jsx';
import { renderPainel, resposta } from '../test-utils/painel.jsx';

const LISTA = [
  { chave: 'busca', nome: 'Busca e galerias', grupo: 'Fotos', dependeDe: null, descricao: 'Galerias.', ligado: true, efetivo: true, recado: 'Esta área está em manutenção. Volte em breve.', derruba: ['Compra de fotos'] },
  { chave: 'checkout', nome: 'Compra de fotos', grupo: 'Fotos', dependeDe: 'busca', descricao: 'Pagamento.', ligado: true, efetivo: false, caiCom: 'Busca e galerias', recado: 'Vendas pausadas.', derruba: [] },
  { chave: 'agenda', nome: 'Agenda paroquial', grupo: 'Comunidade', dependeDe: null, descricao: 'Calendário.', ligado: false, efetivo: false, recado: 'Voltamos logo.', derruba: [] },
];

function rotas(put = jest.fn(() => resposta(200, {}))) {
  return (url, opcoes) => {
    const chave = `${opcoes.method || 'GET'} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (chave === 'GET /api/pascom/modulos') return resposta(200, { modulos: LISTA });
    if (chave.startsWith('PUT /api/pascom/modulos/')) return put(opcoes, chave);
    return resposta(404, { error: chave });
  };
}

const corpo = (o) => JSON.parse(o.body);
const aberta = () => screen.findByRole('heading', { name: 'Comunidade' });

describe('painel — Módulos', () => {
  it('agrupa, mostra a situação e a dependência de cada módulo', async () => {
    renderPainel(<Modulos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByRole('heading', { name: 'Fotos' })).toBeInTheDocument();
    expect(screen.getByText('No ar')).toBeInTheDocument();
    expect(screen.getByText('Cai com Busca e galerias')).toBeInTheDocument();
    expect(screen.getByText('Desligado')).toBeInTheDocument();
    expect(screen.getByText(/depende de Busca e galerias/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Agenda paroquial' })).not.toBeChecked();
  });

  it('desligar a busca grava e avisa quem cai junto', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<Modulos />, { rotas: rotas(put) });
    await aberta();
    await userEvent.click(screen.getByRole('switch', { name: 'Busca e galerias' }));
    expect(await screen.findByText('Busca e galerias desligado. Também cai: Compra de fotos.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ ligado: false });
    expect(put.mock.calls[0][1]).toBe('PUT /api/pascom/modulos/busca');
  });

  it('ligar um módulo grava ligado:true', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<Modulos />, { rotas: rotas(put) });
    await aberta();
    await userEvent.click(screen.getByRole('switch', { name: 'Agenda paroquial' }));
    expect(await screen.findByText('Agenda paroquial ligado.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ ligado: true });
  });

  it('escolher um módulo mostra o aviso de cascata, o recado e o que o visitante vê', async () => {
    renderPainel(<Modulos />, { rotas: rotas() });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /^Busca e galerias/ }));
    expect(screen.getByText(/Desligar este módulo também derruba: Compra de fotos/)).toBeInTheDocument();
    expect(screen.getByText(/No ar: o visitante usa normalmente/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Agenda paroquial/ }));
    const previa = screen.getByText('Em manutenção').parentElement;
    expect(within(previa).getByText('Voltamos logo.')).toBeInTheDocument();
  });

  it('salva o recado; a prévia acompanha o que está sendo digitado', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<Modulos />, { rotas: rotas(put) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /Agenda paroquial/ }));
    const campo = screen.getByLabelText('Recado para o visitante quando estiver fora do ar');
    await userEvent.clear(campo);
    await userEvent.type(campo, 'Em reforma até sábado.');
    expect(screen.getAllByText('Em reforma até sábado.').length).toBeGreaterThan(1);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar recado' }));
    expect(await screen.findByText('Recado salvo.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ recado: 'Em reforma até sábado.' });
  });

  it('erro do servidor aparece e nada some da tela', async () => {
    const put = jest.fn(() => resposta(400, { error: 'O recado pode ter até 200 caracteres.' }));
    renderPainel(<Modulos />, { rotas: rotas(put) });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: /Agenda paroquial/ }));
    await userEvent.type(screen.getByLabelText('Recado para o visitante quando estiver fora do ar'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar recado' }));
    expect((await screen.findAllByText('O recado pode ter até 200 caracteres.')).length).toBeGreaterThan(0);
  });

  it('explica o que nunca sai do ar', async () => {
    renderPainel(<Modulos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByText(/Nunca saem do ar/)).toBeInTheDocument();
    expect(screen.getByText(/download de pedidos já pagos/)).toBeInTheDocument();
  });
});
