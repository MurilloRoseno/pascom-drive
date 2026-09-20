import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SistemaTab from '../shared/pascom/SistemaTab.jsx';
import * as api from '../lib/api.js';

jest.mock('../lib/api.js', () => ({
  pascomEstimarLiberacao: jest.fn(),
  pascomEventoAcao: jest.fn(),
  pascomReprocessarPasta: jest.fn(),
  pascomCorrigirNomePasta: jest.fn(),
}));

const GB = 1024 ** 3;
const getToken = jest.fn().mockResolvedValue('clerk-token');

function sistema(overrides = {}) {
  return {
    verificadoEm: '2026-09-19T12:00:00Z',
    resumo: { erros: 1, avisos: 1 },
    grupos: [{ id: 'pagamentos', titulo: 'Pagamentos' }, { id: 'automacao', titulo: 'Automação' }],
    itens: [
      { id: 'mp_token', grupo: 'pagamentos', estado: 'ok', titulo: 'Token do Mercado Pago', orientacao: '' },
      { id: 'mp_webhook', grupo: 'pagamentos', estado: 'erro', titulo: 'Assinatura do webhook', orientacao: 'Defina MP_WEBHOOK_SECRET na Vercel.' },
      { id: 'quarentena', grupo: 'automacao', estado: 'aviso', titulo: 'Pastas em quarentena', orientacao: 'Tire o prefixo _ERRO_.' },
    ],
    appsScriptDisponivel: true,
    armazenamento: {
      usado: 13.8 * GB, limite: 15 * GB, livre: 1.2 * GB, mediaPorEvento: 0.6 * GB, cabemEventos: 2,
      pastas: { calculadoEm: '2026-09-19T10:00:00Z', completo: true, pastas: { originais: { bytes: 9 * GB }, previas: { bytes: 2 * GB } } },
    },
    quarentena: [{ nome: '_ERRO_crisma__2026-06-01__turma_202606011200', desde: '2026-06-01T12:00:00Z' }],
    arquivados: [
      { eventoId: 'EV2', title: 'Batismo de Maio', dateLabel: '10 de maio de 2026', totalFotos: 80, espacoLiberacao: '' },
      { eventoId: 'EV3', title: 'Antigo', espacoLiberacao: 'concluida', espacoLiberadoBytes: 2 * GB },
    ],
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

it('resume o que impede vendas e abre a orientacao dos erros', () => {
  render(<SistemaTab getToken={getToken} sistema={sistema()} onReload={jest.fn()} />);
  expect(screen.getByRole('heading', { name: '1 item impede vendas · 1 aviso' })).toBeInTheDocument();
  // Erro ja vem aberto; aviso abre ao tocar.
  expect(screen.getByText('Defina MP_WEBHOOK_SECRET na Vercel.')).toBeInTheDocument();
  expect(screen.queryByText('Tire o prefixo _ERRO_.')).not.toBeInTheDocument();
  const aviso = screen.getByText('Pastas em quarentena', { selector: 'span' }).closest('li');
  fireEvent.click(within(aviso).getByRole('button', { name: 'Como corrigir' }));
  expect(screen.getByText('Tire o prefixo _ERRO_.')).toBeInTheDocument();
  // Itens ok ficam recolhidos.
  expect(screen.queryByText('Token do Mercado Pago')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver 1 item em ordem' }));
  expect(screen.getByText('Token do Mercado Pago')).toBeInTheDocument();
});

it('mostra tudo pronto quando nao ha erros nem avisos', () => {
  render(<SistemaTab getToken={getToken} sistema={sistema({ resumo: { erros: 0, avisos: 0 }, itens: [] })} onReload={jest.fn()} />);
  expect(screen.getByRole('heading', { name: 'Tudo pronto para vender' })).toBeInTheDocument();
});

it('mostra o uso do Drive, a projecao e a quarentena', () => {
  render(<SistemaTab getToken={getToken} sistema={sistema()} onReload={jest.fn()} />);
  expect(screen.getByRole('meter', { name: 'Uso do Drive' })).toHaveAttribute('aria-valuenow', '92');
  expect(screen.getByText(/cabem mais uns 2 eventos/)).toBeInTheDocument();
  expect(screen.getByText('_ERRO_crisma__2026-06-01__turma_202606011200')).toBeInTheDocument();
  expect(screen.getByText(/Arquivos removidos · 2 GB/)).toBeInTheDocument();
});

it('libera espaco so depois de digitar o nome do evento e oferece continuar quando fica parcial', async () => {
  const onReload = jest.fn();
  api.pascomEstimarLiberacao.mockResolvedValue({
    arquivos: 412, bytesLiberados: 1.9 * GB, originaisMantidos: 38, bytesMantidos: 0.3 * GB, pedidosPendentes: 0,
  });
  api.pascomEventoAcao
    .mockResolvedValueOnce({ evento: { id: 'EV2' }, liberacao: { situacao: 'parcial', bytesLiberados: GB } })
    .mockResolvedValueOnce({ evento: { id: 'EV2' }, liberacao: { situacao: 'concluida', bytesLiberados: 0.9 * GB } });
  render(<SistemaTab getToken={getToken} sistema={sistema()} onReload={onReload} />);

  fireEvent.click(screen.getByRole('button', { name: 'Liberar espaço' }));
  const dialog = await screen.findByRole('dialog');
  expect(await within(dialog).findByText('1,9 GB')).toBeInTheDocument();
  expect(within(dialog).getByText('38 originais vendidos')).toBeInTheDocument();
  expect(api.pascomEstimarLiberacao).toHaveBeenCalledWith('clerk-token', 'EV2');

  const botao = within(dialog).getByRole('button', { name: 'Mandar para a lixeira' });
  expect(botao).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText(/digite o nome do evento/), { target: { value: 'batismo de maio ' } });
  expect(botao).toBeEnabled();
  fireEvent.click(botao);

  expect(await within(dialog).findByText(/continue para terminar/)).toBeInTheDocument();
  expect(api.pascomEventoAcao).toHaveBeenCalledWith('clerk-token', 'EV2', { acao: 'liberarEspaco' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Continuar' }));
  expect(await within(dialog).findByText(/Pronto: 1,9 GB foram para a lixeira/)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(onReload).toHaveBeenCalled();
});

it('nao deixa liberar com pedido aguardando pagamento', async () => {
  api.pascomEstimarLiberacao.mockResolvedValue({
    arquivos: 10, bytesLiberados: GB, originaisMantidos: 0, bytesMantidos: 0, pedidosPendentes: 2,
  });
  render(<SistemaTab getToken={getToken} sistema={sistema()} onReload={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Liberar espaço' }));
  const dialog = await screen.findByRole('dialog');
  expect(await within(dialog).findByText(/2 pedido\(s\) deste evento aguardando pagamento/)).toBeInTheDocument();
  expect(within(dialog).queryByRole('button', { name: 'Mandar para a lixeira' })).not.toBeInTheDocument();
});

it('mostra carregando e erro antes da primeira verificacao', () => {
  const onReload = jest.fn();
  const { rerender } = render(<SistemaTab getToken={getToken} sistema={null} loading onReload={onReload} />);
  expect(screen.getByRole('status')).toHaveTextContent(/Verificando/);
  rerender(<SistemaTab getToken={getToken} sistema={null} loading={false} error="Sem conexão" onReload={onReload} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(onReload).toHaveBeenCalled();
});

it('quarentena: tenta de novo as fotos com falha e corrige nome fora do padrao', async () => {
  const onReload = jest.fn();
  api.pascomReprocessarPasta.mockResolvedValue({ nomePasta: 'crisma__2026-06-01__turma', devolvidas: 2 });
  api.pascomCorrigirNomePasta.mockResolvedValue({ nomePasta: 'batismo__2026-06-10__ana' });
  render(<SistemaTab getToken={getToken} onReload={onReload} sistema={sistema({
    quarentena: [
      { nome: '_ERRO_crisma__2026-06-01__turma_202606011200', folderId: 'pastaFalhas01', falhas: 2, nomeValido: true, desde: '2026-06-01T12:00:00Z' },
      { nome: '_ERRO_fotos do sabado', folderId: 'pastaNomeRuim1', falhas: 0, nomeValido: false, desde: '2026-06-01T12:00:00Z' },
    ],
  })} />);

  expect(screen.getByText(/2 fotos falharam 3 vezes/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
  expect(await screen.findByText(/crisma__2026-06-01__turma voltou para a fila/)).toBeInTheDocument();
  expect(api.pascomReprocessarPasta).toHaveBeenCalledWith('clerk-token', 'pastaFalhas01');
  expect(onReload).toHaveBeenCalled();

  expect(screen.getByText(/nome fora do padrão categoria__/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Corrigir o nome' }));
  fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'batismo' } });
  fireEvent.change(screen.getByLabelText('Data do evento'), { target: { value: '2026-06-10' } });
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar e processar' }));
  await waitFor(() => expect(api.pascomCorrigirNomePasta).toHaveBeenCalledWith('clerk-token', 'pastaNomeRuim1', {
    categoria: 'batismo', data: '2026-06-10', titulo: 'Ana',
  }));
});
