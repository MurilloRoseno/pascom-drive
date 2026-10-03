import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AgendaPage from '../pages/Agenda.jsx';
import CalendarioMes from '../components/agenda/CalendarioMes.jsx';
import { PainelDoDia, ListaDoMes } from '../components/agenda/PainelDoDia.jsx';
import FiltroTipos from '../components/agenda/FiltroTipos.jsx';

jest.mock('../lib/api', () => ({ obterAgenda: jest.fn() }));
const { obterAgenda } = require('../lib/api');

const TIPOS = [
  { id: 'missa', nome: 'Missa' }, { id: 'sacramento', nome: 'Sacramento' }, { id: 'reuniao', nome: 'Reunião' },
];

const oc = (id, data, titulo, extra = {}) => ({
  id, titulo, data, hora: '', horaFim: '', local: '', tipo: 'missa', descricao: '', recorrencia: 'nenhuma', ...extra,
});

const OCORRENCIAS = [
  oc('a', '2026-10-04', 'Missa dominical', { hora: '08:00', horaFim: '09:00', local: 'Matriz', recorrencia: 'semanal', descricao: 'Todos são bem-vindos' }),
  oc('b', '2026-10-04', 'Batizado', { hora: '10:00', tipo: 'sacramento' }),
  oc('c', '2026-10-04', 'Reunião do conselho', { hora: '19:00', tipo: 'reuniao' }),
  oc('d', '2026-10-04', 'Ensaio do coral', { hora: '20:00' }),
  oc('e', '2026-10-11', 'Missa dominical', { hora: '08:00', recorrencia: 'semanal' }),
];

function Local() {
  const l = useLocation();
  return <output data-testid="url">{l.search}</output>;
}

function renderAgenda(url = '/agenda?mes=2026-10') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/agenda" element={<><AgendaPage /><Local /></>} /></Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  obterAgenda.mockReset().mockResolvedValue({ mes: '2026-10', hoje: '2026-10-03', tipos: TIPOS, ocorrencias: OCORRENCIAS });
});

describe('CalendarioMes', () => {
  const props = { mes: '2026-10', hoje: '2026-10-03', ocorrencias: OCORRENCIAS, diaSelecionado: null, onSelecionarDia: () => {}, onMudarMes: () => {}, onHoje: () => {} };

  it('mostra 42 dias com nome falado, contagem de compromissos e o dia de hoje', () => {
    render(<CalendarioMes {...props} />);
    const dias = within(screen.getByRole('group', { name: 'Calendário de outubro de 2026' })).getAllByRole('button');
    expect(dias).toHaveLength(42);
    expect(screen.getByRole('button', { name: 'domingo, 4 de outubro, 4 compromissos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'domingo, 11 de outubro, 1 compromisso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'sábado, 3 de outubro, nenhum compromisso' })).toHaveAttribute('aria-current', 'date');
  });

  it('mostra até 3 compromissos por dia e "+N mais"', () => {
    render(<CalendarioMes {...props} />);
    const dia = screen.getByRole('button', { name: /domingo, 4 de outubro/ });
    expect(within(dia).getByText('08:00 Missa dominical')).toBeInTheDocument();
    expect(within(dia).queryByText('20:00 Ensaio do coral')).not.toBeInTheDocument();
    expect(within(dia).getByText('+1 mais')).toBeInTheDocument();
  });

  it('dias de outros meses aparecem esmaecidos, mas continuam na grade', () => {
    render(<CalendarioMes {...props} />);
    expect(screen.getByRole('button', { name: /domingo, 27 de setembro/ })).toHaveStyle({ opacity: '0.42' });
    expect(screen.getByRole('button', { name: /domingo, 4 de outubro/ })).toHaveStyle({ opacity: '1' });
  });

  it('navegação: mês anterior, próximo e hoje; escolher um dia marca como pressionado', async () => {
    const onMudarMes = jest.fn(); const onHoje = jest.fn(); const onSelecionarDia = jest.fn();
    const { rerender } = render(<CalendarioMes {...props} onMudarMes={onMudarMes} onHoje={onHoje} onSelecionarDia={onSelecionarDia} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(onMudarMes.mock.calls).toEqual([[-1], [1]]);
    expect(onHoje).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /domingo, 11 de outubro/ }));
    expect(onSelecionarDia).toHaveBeenCalledWith('2026-10-11');
    rerender(<CalendarioMes {...props} diaSelecionado="2026-10-11" />);
    expect(screen.getByRole('button', { name: /domingo, 11 de outubro/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('PainelDoDia e ListaDoMes', () => {
  it('mostra horário, tipo, local, descrição e que repete; dia vazio explica', () => {
    const { rerender } = render(<PainelDoDia data="2026-10-04" ocorrencias={OCORRENCIAS} tipos={TIPOS} />);
    expect(screen.getByRole('heading', { name: 'domingo, 4 de outubro' })).toBeInTheDocument();
    expect(screen.getByText('08:00 às 09:00')).toBeInTheDocument();
    expect(screen.getByText('Matriz', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Todos são bem-vindos')).toBeInTheDocument();
    expect(screen.getByText(/repete toda semana/)).toBeInTheDocument();
    expect(screen.getAllByText('Missa').length).toBeGreaterThan(0);
    rerender(<PainelDoDia data="2026-10-20" ocorrencias={OCORRENCIAS} tipos={TIPOS} />);
    expect(screen.getByText('Nada marcado neste dia.')).toBeInTheDocument();
    rerender(<PainelDoDia data={null} ocorrencias={OCORRENCIAS} tipos={TIPOS} />);
    expect(screen.getByText(/Toque num dia do calendário/)).toBeInTheDocument();
  });

  it('o painel aceita botões de ação por compromisso (painel da equipe)', () => {
    render(<PainelDoDia data="2026-10-11" ocorrencias={OCORRENCIAS} tipos={TIPOS} acao={(o) => <button type="button">Editar {o.titulo}</button>} />);
    expect(screen.getByRole('button', { name: 'Editar Missa dominical' })).toBeInTheDocument();
  });

  it('lista do mês (celular): só dias com compromisso e só do mês', async () => {
    const onSelecionarDia = jest.fn();
    render(<ListaDoMes mes="2026-10" ocorrencias={[...OCORRENCIAS, oc('z', '2026-11-01', 'Finados')]} tipos={TIPOS} onSelecionarDia={onSelecionarDia} />);
    expect(screen.queryByText(/Finados/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /04\/10/ }));
    expect(onSelecionarDia).toHaveBeenCalledWith('2026-10-04');
    expect(screen.getByRole('button', { name: /11\/10/ })).toBeInTheDocument();
  });
});

describe('FiltroTipos', () => {
  it('escolher marca, escolher de novo limpa o filtro', async () => {
    const onChange = jest.fn();
    const { rerender } = render(<FiltroTipos tipos={TIPOS} valor={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Missa' }));
    expect(onChange).toHaveBeenLastCalledWith('missa');
    rerender(<FiltroTipos tipos={TIPOS} valor="missa" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Missa' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Missa' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('página /agenda', () => {
  it('carrega o mês da URL e abre o dia de hoje por padrão', async () => {
    renderAgenda();
    expect(await screen.findByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument();
    expect(obterAgenda).toHaveBeenCalledWith('2026-10');
    expect(screen.getByRole('heading', { name: 'sábado, 3 de outubro' })).toBeInTheDocument();
    expect(screen.getByText('Nada marcado neste dia.')).toBeInTheDocument();
  });

  it('escolher um dia atualiza a URL e mostra os compromissos dele', async () => {
    renderAgenda();
    await userEvent.click(await screen.findByRole('button', { name: /domingo, 4 de outubro/ }));
    expect(screen.getByTestId('url')).toHaveTextContent('dia=2026-10-04');
    const painel = screen.getByRole('region', { name: 'Compromissos do dia' });
    expect(within(painel).getByText('Batizado')).toBeInTheDocument();
    expect(within(painel).getByText('Ensaio do coral')).toBeInTheDocument();
  });

  it('trocar de mês busca o mês novo e limpa o dia', async () => {
    renderAgenda('/agenda?mes=2026-10&dia=2026-10-04');
    await screen.findByRole('heading', { name: 'outubro de 2026' });
    obterAgenda.mockResolvedValue({ mes: '2026-11', hoje: '2026-10-03', tipos: TIPOS, ocorrencias: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await waitFor(() => expect(obterAgenda).toHaveBeenLastCalledWith('2026-11'));
    expect(await screen.findByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument();
    expect(screen.getByTestId('url')).toHaveTextContent('mes=2026-11');
    expect(screen.getByTestId('url')).not.toHaveTextContent('dia=');
  });

  it('filtro por tipo esconde os outros tipos e fica na URL', async () => {
    renderAgenda();
    await screen.findByRole('heading', { name: 'outubro de 2026' });
    await userEvent.click(screen.getByRole('button', { name: 'Reunião' }));
    expect(screen.getByTestId('url')).toHaveTextContent('tipo=reuniao');
    expect(screen.getByRole('button', { name: 'domingo, 4 de outubro, 1 compromisso' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'domingo, 11 de outubro, nenhum compromisso' })).toBeInTheDocument();
  });

  it('mês inválido na URL cai no mês de hoje, sem quebrar nem consultar lixo', async () => {
    renderAgenda('/agenda?mes=../../etc');
    await screen.findByRole('heading', { level: 1, name: 'Agenda da paróquia' });
    expect(obterAgenda.mock.calls[0][0]).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('erro de carga mostra aviso amigável', async () => {
    obterAgenda.mockRejectedValue(new Error('x'));
    renderAgenda();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a agenda');
  });
});
