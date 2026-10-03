import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Eventos from '../painel/pages/Eventos.jsx';
import {
  renderPainel, resposta, chamadas, TODAS,
} from '../test-utils/painel.jsx';

const EVENTOS = [
  { eventoId: 'MISSA', nome: 'Missa dominical', categoria: 'celebracoes', totalFotos: 40, estado: 'no_ar', saiEmDias: null, statusPublicacao: 'publicado', publicarEm: '2026-10-01T10:00', expiraEm: '', prazoDias: 0 },
  { eventoId: 'BATISMO', nome: 'Batismo', categoria: 'batismo', totalFotos: 12, estado: 'agendado', saiEmDias: null, statusPublicacao: 'agendado', publicarEm: '2026-10-17T08:00', expiraEm: '2026-10-24T08:00', prazoDias: 7 },
  { eventoId: 'FESTA', nome: 'Festa junina', categoria: 'celebracoes', totalFotos: 80, estado: 'no_ar', saiEmDias: 2, statusPublicacao: 'publicado', publicarEm: '2026-09-26T12:00', expiraEm: '2026-10-05T12:00', prazoDias: 7 },
];
const CATEGORIAS = [
  { id: 'celebracoes', nome: 'Celebrações', tipo: 'celebracao', ativo: true },
  { id: 'batismo', nome: 'Batismo', tipo: 'sacramento', ativo: true },
];

function rotas(extra = {}) {
  return (url, opcoes) => {
    const metodo = opcoes.method || 'GET';
    const chave = `${metodo} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (extra[chave]) return extra[chave](opcoes);
    if (chave === 'GET /api/pascom/eventos') return resposta(200, { eventos: EVENTOS, prazoPadraoDias: 7 });
    if (chave === 'GET /api/pascom/categorias') return resposta(200, { categorias: CATEGORIAS });
    return resposta(404, { error: `sem rota: ${chave}` });
  };
}

const corpo = (o) => JSON.parse(o.body);

describe('tela Eventos', () => {
  it('lista os eventos com estado, saída e categoria', async () => {
    renderPainel(<Eventos />, { rotas: rotas() });
    expect(await screen.findByText('Missa dominical')).toBeInTheDocument();
    expect(screen.getByText('Agendado')).toBeInTheDocument();
    expect(screen.getByText('Sai em 2d')).toBeInTheDocument();
    expect(screen.getByText('celebracoes · 40 fotos')).toBeInTheDocument();
  });

  it('mostra o prazo padrão atual como "· padrão"', async () => {
    renderPainel(<Eventos />, { rotas: rotas() });
    await screen.findByText('Missa dominical');
    const grupo = screen.getByRole('radiogroup', { name: 'Prazo padrão' });
    expect(within(grupo).getByRole('radio', { name: '1 semana' })).toBeChecked();
  });

  it('troca o prazo padrão, avisa e grava pela API', async () => {
    const put = jest.fn(() => resposta(200, { chave: 'prazoPadraoDias', valor: 3 }));
    renderPainel(<Eventos />, { rotas: rotas({ 'PUT /api/pascom/configuracoes': put }) });
    await screen.findByText('Missa dominical');
    await userEvent.click(screen.getByRole('radio', { name: '3 dias' }));
    expect(await screen.findByText('Novos eventos ficam no ar por 3 dias.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ chave: 'prazoPadraoDias', valor: 3 });
  });

  it('prazo personalizado valida de 1 a 365 antes de enviar', async () => {
    renderPainel(<Eventos />, { rotas: rotas() });
    await screen.findByText('Missa dominical');
    await userEvent.click(screen.getAllByRole('radio', { name: 'Personalizado' })[0]);
    await userEvent.type(screen.getByLabelText('Quantos dias'), '400');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar prazo' }));
    expect(await screen.findByText('Informe um prazo de 1 a 365 dias.')).toBeInTheDocument();
    expect(chamadas('/api/pascom/configuracoes', 'PUT')).toHaveLength(0);
  });

  it('publica agora enviando só modo e prazo (o servidor monta as datas)', async () => {
    const put = jest.fn(() => resposta(200, { ...EVENTOS[0], estado: 'no_ar', publicarEm: '2026-10-03T12:00', expiraEm: '2026-10-10T12:00', prazoDias: 7 }));
    renderPainel(<Eventos />, { rotas: rotas({ 'PUT /api/pascom/eventos/MISSA/publicacao': put }) });
    await userEvent.click(await screen.findByRole('button', { name: /Missa dominical/ }));
    await userEvent.click(screen.getByRole('radio', { name: '1 semana · padrão' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar agora' }));
    expect(await screen.findByText('Evento publicado agora.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ modo: 'agora', prazoDias: 7 });
  });

  it('agendar pede o dia e envia data e hora', async () => {
    const put = jest.fn(() => resposta(200, { ...EVENTOS[0], estado: 'agendado', publicarEm: '2099-10-17T09:30', prazoDias: 3 }));
    renderPainel(<Eventos />, { rotas: rotas({ 'PUT /api/pascom/eventos/MISSA/publicacao': put }) });
    await userEvent.click(await screen.findByRole('button', { name: /Missa dominical/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Agendar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar agendamento' }));
    expect(await screen.findByText('Escolha o dia da publicação.')).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText('Dia da publicação'), '2099-10-17');
    await userEvent.clear(screen.getByLabelText('Horário'));
    await userEvent.type(screen.getByLabelText('Horário'), '09:30');
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Prazo de permanência' })).getByRole('radio', { name: '3 dias' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar agendamento' }));
    expect(await screen.findByText(/Publicação agendada para/)).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ modo: 'agendar', data: '2099-10-17', hora: '09:30', prazoDias: 3 });
  });

  it('mostra o erro do servidor (ex.: data no passado) sem fechar o formulário', async () => {
    const put = jest.fn(() => resposta(400, { error: 'Escolha um dia a partir de hoje.' }));
    renderPainel(<Eventos />, { rotas: rotas({ 'PUT /api/pascom/eventos/MISSA/publicacao': put }) });
    await userEvent.click(await screen.findByRole('button', { name: /Missa dominical/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar agora' }));
    expect(await screen.findByText('Escolha um dia a partir de hoje.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publicar agora' })).toBeEnabled();
  });

  it('voltar a rascunho', async () => {
    const put = jest.fn(() => resposta(200, { ...EVENTOS[0], estado: 'rascunho' }));
    renderPainel(<Eventos />, { rotas: rotas({ 'PUT /api/pascom/eventos/MISSA/publicacao': put }) });
    await userEvent.click(await screen.findByRole('button', { name: /Missa dominical/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Voltar a rascunho' }));
    expect(await screen.findByText('Evento voltou a rascunho.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0]).modo).toBe('rascunho');
    await waitFor(() => expect(screen.getByText('Rascunho')).toBeInTheDocument());
  });

  it('troca a categoria do evento', async () => {
    const put = jest.fn(() => resposta(200, { ...EVENTOS[0], categoria: 'batismo' }));
    renderPainel(<Eventos />, { rotas: rotas({ 'PUT /api/pascom/eventos/MISSA/categoria': put }) });
    await userEvent.click(await screen.findByRole('button', { name: /Missa dominical/ }));
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'batismo');
    expect(await screen.findByText('Categoria atualizada.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ categoria: 'batismo' });
  });

  it('quem só pode ver não tem botões de publicar nem muda o prazo', async () => {
    renderPainel(<Eventos />, { rotas: rotas(), permissoes: TODAS.filter((p) => p !== 'eventos.editar') });
    await userEvent.click(await screen.findByRole('button', { name: /Missa dominical/ }));
    expect(screen.queryByRole('button', { name: 'Publicar agora' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('radiogroup', { name: 'Prazo padrão' })).getByRole('radio', { name: '3 dias' })).toBeDisabled();
  });

  it('erro de carga oferece tentar de novo', async () => {
    let falhou = true;
    renderPainel(<Eventos />, {
      rotas: (url, o) => {
        if (url.endsWith('/api/pascom/eventos') && falhou) { falhou = false; return resposta(500, { error: 'Planilha indisponível' }); }
        return rotas()(url, o);
      },
    });
    expect(await screen.findByText('Planilha indisponível')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Missa dominical')).toBeInTheDocument();
  });
});
