import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PainelAutenticado from '../painel/PainelAutenticado.jsx';

const ME = {
  authorized: true,
  user: {
    id: 'user_1', name: 'Ana', role: 'atend', email: 'ana@pascom.org', phone: '', permissoes: ['pedidos.ver', 'eventos.ver'],
  },
};

const DASHBOARD = {
  dashboard: {
    ordersToday: 2, revenueToday: 21.65, ordersMonth: 9, revenueMonth: 130,
    pendingOrders: 1, activeDownloads: 4, publishedEvents: 3, deliveryIssues: 0,
  },
};

const AUDITORIA = {
  alteracoes: [{ quando: '03/10/2026 09:00:00', quem: 'ana@pascom.org', mensagem: 'Acessos: Fotógrafo — liberou eventos.criar' }],
};

function resposta(status, corpo) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(corpo) });
}

function montar(rota = '/painel') {
  const onSair = jest.fn();
  const obterToken = jest.fn().mockResolvedValue('tok');
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/painel/*" element={<PainelAutenticado obterToken={obterToken} onSair={onSair} />} />
      </Routes>
    </MemoryRouter>,
  );
  return { onSair, obterToken };
}

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/api/pascom/me')) return resposta(200, ME);
    if (url.endsWith('/api/pascom/dashboard')) return resposta(200, DASHBOARD);
    if (url.endsWith('/api/pascom/auditoria')) return resposta(200, AUDITORIA);
    return resposta(404, { error: 'não achei' });
  });
});

describe('PainelAutenticado', () => {
  it('manda o token do Clerk como Bearer ao consultar /me', async () => {
    montar();
    await screen.findByRole('heading', { name: 'Visão geral' });
    const [url, opcoes] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/pascom\/me$/);
    expect(opcoes.headers.Authorization).toBe('Bearer tok');
  });

  it('mostra menu, nome, papel e os indicadores reais do dashboard', async () => {
    montar();
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Atendimento')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Visão geral/ })).toBeInTheDocument();
    expect(await screen.findByText('Pedidos hoje')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*21,65 confirmados/)).toBeInTheDocument();
    expect(screen.getByText('Eventos publicados')).toBeInTheDocument();
    expect(screen.getByText('nada pede atenção')).toBeInTheDocument();
    expect(screen.getByText(/liberou eventos.criar/)).toBeInTheDocument();
  });

  it('o menu só tem o que o papel permite (atendimento não vê Acessos nem Segurança)', async () => {
    montar();
    await screen.findByText('Pedidos hoje');
    expect(screen.queryByRole('link', { name: /Acessos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Segurança/ })).not.toBeInTheDocument();
  });

  it('avisa que o acesso é restrito quando o servidor responde 403', async () => {
    global.fetch = jest.fn(() => resposta(403, { error: 'Usuario sem permissao na EquipePascom.' }));
    const { onSair } = montar();
    expect(await screen.findByText('Acesso restrito à equipe')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(onSair).toHaveBeenCalled();
  });

  it('mostra o erro quando o servidor falha', async () => {
    global.fetch = jest.fn(() => resposta(500, { error: 'Erro interno. Tente de novo em instantes.' }));
    montar();
    expect(await screen.findByText('Não foi possível abrir o painel')).toBeInTheDocument();
    expect(screen.getByText('Erro interno. Tente de novo em instantes.')).toBeInTheDocument();
  });

  it('erro ao carregar a visão geral aparece com botão para tentar de novo', async () => {
    global.fetch = jest.fn((url) => {
      if (url.endsWith('/api/pascom/me')) return resposta(200, ME);
      return resposta(500, { error: 'Erro interno. Tente de novo em instantes.' });
    });
    montar();
    expect(await screen.findByText('Não foi possível carregar a visão geral.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('rota desconhecida do painel volta para a visão geral', async () => {
    montar('/painel/nao-existe');
    expect(await screen.findByText('Pedidos hoje')).toBeInTheDocument();
  });
});
