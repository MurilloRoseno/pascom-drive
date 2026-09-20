import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import EventsTab from '../shared/pascom/EventsTab.jsx';
import * as api from '../lib/api.js';

jest.mock('../lib/api.js', () => ({
  pascomEventos: jest.fn(),
  pascomEvento: jest.fn(),
  pascomEventoAcao: jest.fn(),
  pascomEstimarLiberacao: jest.fn(),
}));

const ok = { ok: true };
function acoes(overrides = {}) {
  return {
    publicar: ok, despublicar: { ok: false }, autorizarVenda: { ok: false, motivo: 'x' }, revogarVenda: { ok: false },
    tornarPublica: ok, tornarProtegida: { ok: false }, gerarCodigo: ok, revogarCodigo: { ok: false }, arquivar: ok, editar: ok, reprocessar: { ok: false }, descartarFalhas: { ok: false }, trocarCapa: ok, liberarEspaco: { ok: false, motivo: 'Arquive o evento antes de liberar espaço.' },
    ...overrides,
  };
}

function evento(overrides = {}) {
  return {
    id: 'EV1', eventoId: 'EV1', title: 'Casamento Joao e Maria', nomePasta: 'casamento__2026-05-20__joao-e-maria',
    category: 'casamento', date: '2026-05-20', dateLabel: '20 de maio de 2026', time: '', slug: 'joao-e-maria',
    visibility: 'protegida', salesAuthorized: false, publication: 'rascunho', minorProtection: false, hasCode: false,
    status: 'Processado', totalFotos: 2, fotosProcessadas: 2, hasCover: true, coverThumbnail: '', vendas: 0, receita: 0,
    etapa: 'revisar', acoes: acoes(), avisos: [],
    ...overrides,
  };
}

const fila = {
  id: 'fila-UP1', eventoId: '', fila: true, title: 'Turma Da Tarde', nomePasta: 'crisma__2026-06-01__turma-da-tarde',
  category: 'crisma', date: '2026-06-01', dateLabel: '1 de junho de 2026', status: 'Na fila', totalFotos: 30,
  fotosProcessadas: 0, vendas: 0, receita: 0, etapa: 'fila', acoes: {}, avisos: [],
};

const getToken = jest.fn().mockResolvedValue('clerk-token');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  api.pascomEventos.mockResolvedValue({ eventos: [evento()] });
  api.pascomEvento.mockResolvedValue({ evento: evento(), fotos: [{ id: 'C1', type: 'capa', thumbnailUrl: '/t/C1', previewUrl: '/p/C1' }] });
});

async function abrirEvento() {
  render(<EventsTab getToken={getToken} />);
  fireEvent.click(await screen.findByRole('button', { name: /Casamento Joao e Maria/ }));
  await screen.findByRole('heading', { name: 'Casamento Joao e Maria' });
}

it('lista eventos com filtros contados e abre o detalhe com as miniaturas de revisao', async () => {
  api.pascomEventos.mockResolvedValue({ eventos: [fila, evento()] });
  render(<EventsTab getToken={getToken} />);
  await screen.findByText('Turma Da Tarde');
  expect(screen.getByRole('button', { name: /Em andamento 1/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Para revisar 1/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Publicados/ }));
  expect(screen.getByText('Nenhum evento neste filtro.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Todos/ }));
  fireEvent.click(screen.getByRole('button', { name: /Casamento Joao e Maria/ }));
  expect(await screen.findByRole('link', { name: 'Abrir prévia da capa' })).toHaveAttribute('href', '/p/C1');
  expect(api.pascomEvento).toHaveBeenCalledWith('clerk-token', 'EV1');
});

it('mostra o motivo quando publicar esta indisponivel', async () => {
  const bloqueado = evento({ acoes: acoes({ publicar: { ok: false, motivo: 'Informe categoria e data antes de publicar.' } }) });
  api.pascomEventos.mockResolvedValue({ eventos: [bloqueado] });
  api.pascomEvento.mockResolvedValue({ evento: bloqueado, fotos: [] });
  await abrirEvento();
  expect(screen.getByRole('button', { name: 'Publicar evento' })).toBeDisabled();
  expect(screen.getByText('Informe categoria e data antes de publicar.')).toBeInTheDocument();
});

it('pede confirmacao antes de publicar e atualiza o evento com a resposta', async () => {
  const confirm = jest.spyOn(window, 'confirm');
  await abrirEvento();

  confirm.mockReturnValueOnce(false);
  fireEvent.click(screen.getByRole('button', { name: 'Publicar evento' }));
  expect(api.pascomEventoAcao).not.toHaveBeenCalled();

  const publicado = evento({ publication: 'publicado', etapa: 'publicado', acoes: acoes({ publicar: { ok: false }, despublicar: ok, autorizarVenda: ok }) });
  api.pascomEventoAcao.mockResolvedValue({ evento: publicado, fotos: [] });
  confirm.mockReturnValueOnce(true);
  fireEvent.click(screen.getByRole('button', { name: 'Publicar evento' }));

  expect(await screen.findByText('Evento publicado no site.')).toBeInTheDocument();
  expect(api.pascomEventoAcao).toHaveBeenCalledWith('clerk-token', 'EV1', { acao: 'publicar' });
  expect(screen.getByRole('button', { name: 'Liberar venda' })).toBeEnabled();
  confirm.mockRestore();
});

it('mostra o codigo gerado uma vez em um dialogo', async () => {
  await abrirEvento();
  api.pascomEventoAcao.mockResolvedValue({ evento: evento({ hasCode: true }), fotos: [], codigo: 'ABCD1234' });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar código' }));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByTestId('codigo-gerado')).toHaveTextContent('ABCD1234');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Já anotei' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gerar novo código' })).toBeInTheDocument();
});

it('envia so os campos alterados na edicao', async () => {
  await abrirEvento();
  api.pascomEventoAcao.mockResolvedValue({ evento: evento({ time: '19:30' }), fotos: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '19:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => expect(api.pascomEventoAcao).toHaveBeenCalledWith('clerk-token', 'EV1', {
    acao: 'editar', campos: { HorarioEvento: '19:30' },
  }));
});

it('atualiza sozinho so enquanto houver evento na fila ou em processamento', async () => {
  jest.useFakeTimers();
  api.pascomEventos.mockResolvedValue({ eventos: [fila] });
  render(<EventsTab getToken={getToken} />);
  await act(async () => { await Promise.resolve(); });
  await act(async () => { await Promise.resolve(); });
  expect(api.pascomEventos).toHaveBeenCalledTimes(1);

  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(api.pascomEventos).toHaveBeenCalledTimes(2);

  api.pascomEventos.mockResolvedValue({ eventos: [evento()] });
  await act(async () => { jest.advanceTimersByTime(30000); });
  await act(async () => { await Promise.resolve(); });
  const chamadas = api.pascomEventos.mock.calls.length;
  await act(async () => { jest.advanceTimersByTime(90000); });
  expect(api.pascomEventos).toHaveBeenCalledTimes(chamadas);
});

it('seleciona o evento recem-enviado quando chega da aba de envio', async () => {
  api.pascomEventos.mockResolvedValue({ eventos: [fila, evento()] });
  render(<EventsTab getToken={getToken} focusNomePasta="crisma__2026-06-01__turma-da-tarde" />);
  expect(await screen.findByRole('heading', { name: 'Turma Da Tarde' })).toBeInTheDocument();
  expect(screen.getByText(/Envio concluído/)).toBeInTheDocument();
});

it('evento arquivado oferece liberar espaco e mostra o selo depois', async () => {
  const arquivado = evento({ publication: 'arquivado', etapa: 'arquivado', acoes: acoes({ publicar: { ok: false }, arquivar: { ok: false }, liberarEspaco: ok }) });
  api.pascomEventos.mockResolvedValue({ eventos: [arquivado] });
  api.pascomEvento.mockResolvedValue({ evento: arquivado, fotos: [] });
  api.pascomEstimarLiberacao.mockResolvedValue({ arquivos: 3, bytesLiberados: 3000, originaisMantidos: 0, bytesMantidos: 0, pedidosPendentes: 0 });
  const liberado = { ...arquivado, espacoLiberacao: 'concluida', acoes: acoes({ publicar: { ok: false }, arquivar: { ok: false }, liberarEspaco: { ok: false, motivo: 'O espaço deste evento já foi liberado.' } }) };
  api.pascomEventoAcao.mockResolvedValue({ evento: liberado, fotos: [], liberacao: { situacao: 'concluida', bytesLiberados: 3000 } });

  render(<EventsTab getToken={getToken} />);
  fireEvent.click(await screen.findByRole('button', { name: /Arquivados 1/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Casamento Joao e Maria/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Liberar espaço no Drive' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(await within(dialog).findByLabelText(/digite o nome do evento/), { target: { value: 'Casamento Joao e Maria' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Mandar para a lixeira' }));
  expect(await within(dialog).findByText(/Pronto/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
  expect(screen.getAllByText('Arquivos removidos').length).toBeGreaterThan(0);
  expect(screen.getByText('O espaço deste evento já foi liberado.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Publicar novamente' })).not.toBeInTheDocument();
});

it('evento com falha mostra as fotos que falharam e deixa tentar de novo ou descartar', async () => {
  const comErro = evento({
    status: 'Erro', etapa: 'erro', falhas: ['Foto (ruim.jpg): JPEG corrompido'],
    acoes: acoes({ reprocessar: ok, descartarFalhas: ok }),
  });
  api.pascomEventos.mockResolvedValue({ eventos: [comErro] });
  api.pascomEvento.mockResolvedValue({ evento: comErro, fotos: [] });
  api.pascomEventoAcao.mockResolvedValue({ evento: { ...comErro, status: 'Pendente', etapa: 'processando', acoes: acoes() }, fotos: [] });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  await abrirEvento();

  expect(screen.getByText('Foto (ruim.jpg): JPEG corrompido')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Descartar as fotos com falha' }));
  expect(confirm).toHaveBeenCalled();
  expect(api.pascomEventoAcao).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(await screen.findByText(/voltaram para a fila/)).toBeInTheDocument();
  expect(api.pascomEventoAcao).toHaveBeenCalledWith('clerk-token', 'EV1', { acao: 'reprocessar' });
  confirm.mockRestore();
});

it('troca a capa pela estrela da foto com confirmacao e mostra o pedido na fila', async () => {
  api.pascomEvento.mockResolvedValue({
    evento: evento(),
    fotos: [{ id: 'C1', type: 'capa', thumbnailUrl: '/t/C1', previewUrl: '/p/C1' }, { id: 'F2', type: 'foto', thumbnailUrl: '/t/F2', previewUrl: '/p/F2' }],
  });
  const naFila = evento({ pedidoPendente: { tipo: 'trocarCapa', desde: '2026-06-02T10:00:00Z', alvo: 'F2' }, acoes: acoes({ trocarCapa: { ok: false, motivo: 'Aguarde: a troca de capa está na fila do processamento.' } }) });
  api.pascomEventoAcao.mockResolvedValue({ evento: naFila, fotos: [] });
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  await abrirEvento();

  expect(screen.queryByRole('button', { name: 'Usar a foto C1 como capa' })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Usar a foto F2 como capa' }));
  expect(confirm.mock.calls[0][0]).toMatch(/capa atual vira uma foto comum/);
  expect(await screen.findByText(/Troca de capa na fila/)).toBeInTheDocument();
  expect(api.pascomEventoAcao).toHaveBeenCalledWith('clerk-token', 'EV1', { acao: 'trocarCapa', fotoId: 'F2' });
  expect(screen.getAllByText('Na fila: trocando capa').length).toBeGreaterThan(0);
  confirm.mockRestore();
});

it('evento grande em processamento mostra o progresso das partes', async () => {
  const processando = evento({ status: 'Processando', etapa: 'processando', totalFotos: 300, progresso: 120, fotosProcessadas: 119 });
  api.pascomEventos.mockResolvedValue({ eventos: [processando] });
  api.pascomEvento.mockResolvedValue({ evento: processando, fotos: [] });
  await abrirEvento();
  expect(screen.getByText(/120 de 300 fotos prontas/)).toBeInTheDocument();
  expect(screen.getAllByText('Processando 120/300').length).toBeGreaterThan(0);
});
