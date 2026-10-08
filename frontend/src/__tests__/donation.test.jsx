import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DonationForm from '../donation/DonationForm';
import { amountError, brl, parseAmount, resumoDoacao } from '../donation/donation-math';

jest.mock('../lib/api', () => ({ criarDoacao: jest.fn() }));

const { criarDoacao } = require('../lib/api');

const CONFIG = {
  destinos: [
    { id: 'dizimo', label: 'Dízimo' },
    { id: 'obras', label: 'Obras da Matriz' },
  ],
  valoresSugeridos: [20, 50, 100, 200],
  limites: { min: 5, max: 10000 },
  tarifas: { pix: { percentage: 1.19, fixed: 0 }, credit_card: { percentage: 3.99, fixed: 0.39 } },
};

beforeEach(() => {
  sessionStorage.clear();
  criarDoacao.mockReset().mockReturnValue(new Promise(() => {}));
});

describe('calculo da doacao no navegador', () => {
  it('le valores digitados em formato brasileiro', () => {
    expect(parseAmount('50')).toBe(50);
    expect(parseAmount('50,5')).toBe(50.5);
    expect(parseAmount('1.250,00')).toBe(1250);
    expect(parseAmount('R$ 30')).toBe(30);
    expect(parseAmount('')).toBeNaN();
    expect(parseAmount('12,345')).toBeNaN();
  });

  it('valida os limites', () => {
    expect(amountError(Number.NaN, CONFIG.limites)).toMatch(/Informe o valor/);
    expect(amountError(4, CONFIG.limites)).toMatch(/mínimo é R\$ 5,00/);
    expect(amountError(10001, CONFIG.limites)).toMatch(/máximo/);
    expect(amountError(50, CONFIG.limites)).toBe('');
  });

  it('calcula a taxa coberta igual ao servidor', () => {
    expect(resumoDoacao({ amount: 50, method: 'pix', coverFees: false, tarifas: CONFIG.tarifas })).toEqual({ amount: 50, fee: 0, total: 50 });
    expect(resumoDoacao({ amount: 50, method: 'pix', coverFees: true, tarifas: CONFIG.tarifas })).toEqual({ amount: 50, fee: 0.6, total: 50.6 });
    expect(resumoDoacao({ amount: 100, method: 'credit_card', coverFees: true, tarifas: CONFIG.tarifas })).toEqual({ amount: 100, fee: 4.56, total: 104.56 });
    expect(resumoDoacao({ amount: 50, method: 'pix', coverFees: true, tarifas: null }).total).toBe(50);
    expect(brl(104.56)).toBe('R$ 104,56');
  });
});

describe('formulario de doacao', () => {
  it('envia a oferta padrao sem exigir identificacao', () => {
    render(<DonationForm config={CONFIG} />);
    fireEvent.click(screen.getByRole('button', { name: /doar r\$ 50,00/i }));
    expect(criarDoacao).toHaveBeenCalledWith({
      amount: 50, destino: 'dizimo', frequency: 'unica', method: 'pix', coverFees: false, name: '', email: '',
    });
    expect(screen.getByRole('button', { name: /abrindo o stripe/i })).toBeDisabled();
  });

  it('usa o valor livre e o destino escolhidos', () => {
    render(<DonationForm config={CONFIG} />);
    fireEvent.click(screen.getByRole('radio', { name: /obras da matriz/i }));
    fireEvent.change(screen.getByLabelText(/outro valor/i), { target: { value: '75,50' } });
    fireEvent.click(screen.getByRole('button', { name: /doar r\$ 75,50/i }));
    expect(criarDoacao).toHaveBeenCalledWith(expect.objectContaining({ amount: 75.5, destino: 'obras' }));
  });

  it('forca cartao na doacao mensal e bloqueia o Pix', () => {
    render(<DonationForm config={CONFIG} />);
    fireEvent.click(screen.getByRole('radio', { name: /todo mês/i }));
    expect(screen.getByRole('radio', { name: 'Pix' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Cartão' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: /doar r\$ 50,00 por mês/i }));
    expect(criarDoacao).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'mensal', method: 'credit_card' }));
  });

  it('mostra e soma a taxa quando o doador decide cobrir', () => {
    render(<DonationForm config={CONFIG} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Cartão' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /quero cobrir a taxa do pagamento \(\+ r\$ 2,48\)/i }));
    expect(screen.getByText(/oferta de r\$ 50,00 mais r\$ 2,48/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /doar r\$ 52,48/i }));
    expect(criarDoacao).toHaveBeenCalledWith(expect.objectContaining({ amount: 50, coverFees: true, method: 'credit_card' }));
  });

  it('esconde a opcao de cobrir taxa enquanto as tarifas nao chegam', () => {
    render(<DonationForm config={{ ...CONFIG, tarifas: null }} />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('bloqueia valor abaixo do minimo e e-mail invalido', () => {
    render(<DonationForm config={CONFIG} />);
    fireEvent.change(screen.getByLabelText(/outro valor/i), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /doar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/mínimo é R\$ 5,00/);
    expect(criarDoacao).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/outro valor/i), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText(/e-mail para o comprovante/i), { target: { value: 'maria@' } });
    fireEvent.click(screen.getByRole('button', { name: /doar/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/confira o e-mail/i);
    expect(criarDoacao).not.toHaveBeenCalled();
  });

  it('mostra o erro do servidor e libera nova tentativa', async () => {
    criarDoacao.mockRejectedValueOnce(new Error('Limite de tentativas de pagamento atingido.'));
    render(<DonationForm config={CONFIG} />);
    fireEvent.click(screen.getByRole('button', { name: /doar r\$ 50,00/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/limite de tentativas/i));
    expect(screen.getByRole('button', { name: /doar r\$ 50,00/i })).toBeEnabled();
  });

  it('restaura as escolhas quando o doador volta do Stripe sem pagar', () => {
    sessionStorage.setItem('doar:form', JSON.stringify({ destino: 'obras', preset: 100, custom: '', frequency: 'unica', method: 'credit_card', coverFees: false, name: 'Maria', email: '' }));
    render(<DonationForm config={CONFIG} canceled />);
    expect(screen.getByRole('status')).toHaveTextContent(/não foi concluído/i);
    expect(screen.getByRole('radio', { name: /obras da matriz/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /doar r\$ 100,00/i })).toBeInTheDocument();
    expect(sessionStorage.getItem('doar:form')).toBeNull();
  });
});
