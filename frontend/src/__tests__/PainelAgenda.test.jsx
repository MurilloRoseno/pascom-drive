import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Agenda from '../painel/pages/Agenda.jsx';
import { renderPainel, resposta, chamadas, TODAS } from '../test-utils/painel.jsx';

const TIPOS = [{ id: 'missa', nome: 'Missa' }, { id: 'reuniao', nome: 'Reunião' }];
const base = { horaFim: '', local: '', descricao: '', ate: '', ativo: true };
const COMPROMISSOS = [
  { ...base, id: 'a', titulo: 'Missa dominical', data: '2026-10-04', hora: '08:00', tipo: 'missa', recorrencia: 'semanal', local: 'Matriz' },
  { ...base, id: 'b', titulo: 'Reunião do conselho', data: '2026-10-10', hora: '19:00', tipo: 'reuniao', recorrencia: 'nenhuma' },
];
const OCORRENCIAS = [
  { id: 'a', titulo: 'Missa dominical', data: '2026-10-04', hora: '08:00', horaFim: '', local: 'Matriz', tipo: 'missa', descricao: '', recorrencia: 'semanal' },
  { id: 'b', titulo: 'Reunião do conselho', data: '2026-10-10', hora: '19:00', horaFim: '', local: '', tipo: 'reuniao', descricao: '', recorrencia: 'nenhuma' },
];

function rotas(extra = {}) {
  return (url, opcoes) => {
    const caminho = url.replace(/^.*(?=\/api)/, '');
    const chave = `${opcoes.method || 'GET'} ${caminho.split('?')[0]}`;
    if (extra[chave]) return extra[chave](opcoes);
    if (chave === 'GET /api/pascom/agenda') return resposta(200, { mes: '2026-10', hoje: '2026-10-03', tipos: TIPOS, ocorrencias: OCORRENCIAS, compromissos: COMPROMISSOS });
    return resposta(404, { error: `sem rota: ${chave}` });
  };
}

const corpo = (o) => JSON.parse(o.body);
const aberta = () => screen.findByRole('group', { name: /Calendário de/ });

describe('painel — Agenda', () => {
  it('abre no mês com o dia de hoje escolhido e o formulário daquele dia', async () => {
    renderPainel(<Agenda />, { rotas: rotas() });
    await aberta();
    expect(screen.getByRole('heading', { name: 'sábado, 3 de outubro' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo compromisso em sábado, 3 de outubro' })).toBeInTheDocument();
    expect(chamadas('/api/pascom/agenda', 'GET')[0][0]).toMatch(/mes=\d{4}-\d{2}$/);
  });

  it('adiciona um compromisso do dia escolhido e limpa o formulário', async () => {
    const post = jest.fn(() => resposta(201, { id: 'n' }));
    renderPainel(<Agenda />, { rotas: rotas({ 'POST /api/pascom/agenda': post }) });
    await aberta();
    await userEvent.type(screen.getByLabelText('Título'), 'Celebração da Profissão de Fé');
    await userEvent.type(screen.getByLabelText('Início (vazio = dia inteiro)'), '09:30');
    await userEvent.click(screen.getByRole('radio', { name: 'Reunião' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Toda semana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à agenda' }));
    expect(await screen.findByText('Compromisso adicionado à agenda.')).toBeInTheDocument();
    expect(corpo(post.mock.calls[0][0])).toMatchObject({
      titulo: 'Celebração da Profissão de Fé', data: '2026-10-03', hora: '09:30', tipo: 'reuniao', recorrencia: 'semanal',
    });
    expect(screen.getByLabelText('Título')).toHaveValue('');
  });

  it('se o servidor recusar, mostra a mensagem e MANTÉM o que foi digitado', async () => {
    const post = jest.fn(() => resposta(400, { error: 'O horário de término precisa ser depois do início.' }));
    renderPainel(<Agenda />, { rotas: rotas({ 'POST /api/pascom/agenda': post }) });
    await aberta();
    await userEvent.type(screen.getByLabelText('Título'), 'Ensaio do coral longo');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à agenda' }));
    expect(await screen.findByText('O horário de término precisa ser depois do início.')).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Ensaio do coral longo');
  });

  it('o campo "repete até" só aparece quando há repetição', async () => {
    renderPainel(<Agenda />, { rotas: rotas() });
    await aberta();
    expect(screen.queryByLabelText('Repete até (opcional)')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Todo mês' }));
    expect(screen.getByLabelText('Repete até (opcional)')).toBeInTheDocument();
  });

  it('o término fica desabilitado enquanto não há horário de início', async () => {
    renderPainel(<Agenda />, { rotas: rotas() });
    await aberta();
    expect(screen.getByLabelText('Término (opcional)')).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Início (vazio = dia inteiro)'), '08:00');
    expect(screen.getByLabelText('Término (opcional)')).toBeEnabled();
  });

  it('editar abre o formulário com os dados e salva só pelo PATCH', async () => {
    const patch = jest.fn(() => resposta(200, {}));
    renderPainel(<Agenda />, { rotas: rotas({ 'PATCH /api/pascom/agenda/a': patch }) });
    await userEvent.click(await screen.findByRole('button', { name: /domingo, 4 de outubro/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Editar Missa dominical' }));
    expect(screen.getByRole('heading', { name: 'Editar compromisso' })).toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toHaveValue('Missa dominical');
    expect(screen.getByLabelText('Local')).toHaveValue('Matriz');
    await userEvent.clear(screen.getByLabelText('Local'));
    await userEvent.type(screen.getByLabelText('Local'), 'Salão');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(await screen.findByText('Compromisso atualizado.')).toBeInTheDocument();
    expect(corpo(patch.mock.calls[0][0])).toMatchObject({ local: 'Salão', titulo: 'Missa dominical', data: '2026-10-04', recorrencia: 'semanal' });
  });

  it('remover pede confirmação e avisa quando a série inteira será removida', async () => {
    const del = jest.fn(() => resposta(200, { ok: true }));
    renderPainel(<Agenda />, { rotas: rotas({ 'DELETE /api/pascom/agenda/a': del }) });
    await userEvent.click(await screen.findByRole('button', { name: /domingo, 4 de outubro/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover Missa dominical' }));
    expect(del).not.toHaveBeenCalled();
    const confirmar = screen.getByRole('button', { name: 'Remover Missa dominical' });
    expect(confirmar).toHaveTextContent('Confirmar: remove a série toda');
    await userEvent.click(confirmar);
    expect(await screen.findByText('Compromisso removido.')).toBeInTheDocument();
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('atendimento cria e edita mas não vê o botão Remover', async () => {
    renderPainel(<Agenda />, { rotas: rotas(), permissoes: TODAS.filter((p) => p !== 'agenda.excluir') });
    await userEvent.click(await screen.findByRole('button', { name: /domingo, 4 de outubro/ }));
    expect(screen.getByRole('button', { name: 'Editar Missa dominical' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover Missa/ })).not.toBeInTheDocument();
  });

  it('só-leitura: sem formulário editável e sem botões de ação', async () => {
    renderPainel(<Agenda />, { rotas: rotas(), permissoes: ['agenda.ver'] });
    await userEvent.click(await screen.findByRole('button', { name: /domingo, 4 de outubro/ }));
    expect(screen.queryByRole('button', { name: /Editar|Remover/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar à agenda' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Título')).toBeDisabled();
  });

  it('filtrar por tipo e trocar de mês busca o mês novo', async () => {
    renderPainel(<Agenda />, { rotas: rotas() });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: 'Reunião' }));
    expect(screen.getByRole('button', { name: 'domingo, 4 de outubro, nenhum compromisso' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    await within(document.body).findByRole('group', { name: /Calendário de/ });
    expect(chamadas('/api/pascom/agenda', 'GET').length).toBe(2);
  });

  it('erro de carga oferece tentar de novo', async () => {
    let falhou = true;
    renderPainel(<Agenda />, {
      rotas: (url, o) => {
        if (url.includes('/api/pascom/agenda') && falhou) { falhou = false; return resposta(500, { error: 'Planilha indisponível' }); }
        return rotas()(url, o);
      },
    });
    expect(await screen.findByText('Planilha indisponível')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await aberta()).toBeInTheDocument();
  });
});
