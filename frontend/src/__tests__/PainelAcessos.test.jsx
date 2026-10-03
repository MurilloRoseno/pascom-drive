import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Acessos, { alternar } from '../painel/pages/Acessos.jsx';
import { renderPainel, resposta, chamadas } from '../test-utils/painel.jsx';

const PAPEIS = [
  { id: 'admin', nome: 'Administrador', descricao: 'Tudo. Papel fixo.' },
  { id: 'coord', nome: 'Coordenação', descricao: 'Organiza eventos e agenda.' },
  { id: 'foto', nome: 'Fotógrafo', descricao: 'Envia fotos.' },
];
const AREAS = [
  { chave: 'eventos', rotulo: 'Eventos e publicação', acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'agenda', rotulo: 'Agenda', acoes: ['ver', 'criar', 'editar', 'excluir'] },
  { chave: 'acessos', rotulo: 'Acessos', acoes: ['gerenciar'] },
];
const MATRIZ = {
  admin: ['eventos.ver', 'eventos.criar', 'eventos.editar', 'eventos.excluir', 'agenda.ver', 'agenda.criar', 'agenda.editar', 'agenda.excluir', 'acessos.gerenciar'],
  coord: ['eventos.ver', 'eventos.editar', 'agenda.ver'],
  foto: ['eventos.ver'],
};
const EQUIPE = [
  { email: 'dono@p.org', nome: 'Administrador', role: 'admin', ativo: true, fixo: true },
  { email: 'bia@p.org', nome: 'Bia', role: 'foto', ativo: true, fixo: false },
];

function rotas(extra = {}) {
  return (url, opcoes) => {
    const chave = `${opcoes.method || 'GET'} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (extra[chave]) return extra[chave](opcoes);
    if (chave === 'GET /api/pascom/acessos') return resposta(200, { papeis: PAPEIS, areas: AREAS, protegidas: ['acessos.gerenciar'], matriz: MATRIZ, equipe: EQUIPE });
    return resposta(404, { error: `sem rota: ${chave}` });
  };
}

const corpo = (o) => JSON.parse(o.body);
const aberta = () => screen.findByRole('heading', { name: 'Papéis e permissões' });

describe('alternar — regras da matriz', () => {
  it('marcar criar/editar/excluir marca o "ver" junto', () => {
    expect(new Set(alternar([], 'agenda', 'criar', true))).toEqual(new Set(['agenda.criar', 'agenda.ver']));
  });

  it('tirar o "ver" tira a área inteira, sem mexer nas outras', () => {
    expect(new Set(alternar(['agenda.ver', 'agenda.criar', 'eventos.ver'], 'agenda', 'ver', false))).toEqual(new Set(['eventos.ver']));
  });

  it('tirar outra ação mantém o "ver"', () => {
    expect(new Set(alternar(['agenda.ver', 'agenda.criar'], 'agenda', 'criar', false))).toEqual(new Set(['agenda.ver']));
  });
});

describe('tela Acessos', () => {
  it('mostra a matriz do papel escolhido (Coordenação por padrão)', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByRole('radio', { name: 'Coordenação' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Ver Eventos e publicação' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Editar Eventos e publicação' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Criar Eventos e publicação' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Gerir Acessos' })).toBeDisabled();
  });

  it('marcar uma ação marca o "ver"; salvar manda a lista completa só deste papel', async () => {
    const put = jest.fn(() => resposta(200, { papel: 'coord', permissoes: [] }));
    renderPainel(<Acessos />, { rotas: rotas({ 'PUT /api/pascom/acessos/papeis/coord': put }) });
    await aberta();
    expect(screen.getByRole('button', { name: 'Nada para salvar' })).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Criar Agenda' }));
    expect(screen.getByRole('checkbox', { name: 'Ver Agenda' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar permissões de Coordenação' }));
    expect(await screen.findByText('Permissões de Coordenação salvas.')).toBeInTheDocument();
    expect(new Set(corpo(put.mock.calls[0][0]).permissoes)).toEqual(new Set(['eventos.ver', 'eventos.editar', 'agenda.ver', 'agenda.criar']));
  });

  it('descartar volta ao que está salvo', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Excluir Eventos e publicação' }));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByRole('checkbox', { name: 'Excluir Eventos e publicação' })).not.toBeChecked();
  });

  it('o administrador é só leitura, tudo marcado, sem botão de salvar', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    await userEvent.click(screen.getByRole('radio', { name: 'Administrador' }));
    expect(screen.getByRole('checkbox', { name: 'Excluir Agenda' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Excluir Agenda' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Salvar permissões/ })).not.toBeInTheDocument();
  });

  it('trocar de papel descarta o rascunho do anterior', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Criar Agenda' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Fotógrafo' }));
    expect(screen.getByRole('checkbox', { name: 'Ver Agenda' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'Coordenação' }));
    expect(screen.getByRole('checkbox', { name: 'Criar Agenda' })).not.toBeChecked();
  });

  it('o card do menu mostra o que o papel enxerga conforme o rascunho', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    const menu = screen.getByRole('heading', { name: 'Menu que este papel enxerga' }).closest('section');
    expect(within(menu).getByText('✓ Visão geral')).toBeInTheDocument();
    expect(within(menu).getByText('✗ Acessos')).toBeInTheDocument();
    expect(within(menu).getByText('✗ Segurança')).toBeInTheDocument();
  });

  it('erro do servidor aparece no aviso', async () => {
    const put = jest.fn(() => resposta(400, { error: 'Papel desconhecido.' }));
    renderPainel(<Acessos />, { rotas: rotas({ 'PUT /api/pascom/acessos/papeis/coord': put }) });
    await aberta();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Criar Agenda' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar permissões de Coordenação' }));
    expect(await screen.findByText('Papel desconhecido.')).toBeInTheDocument();
  });
});

describe('equipe', () => {
  it('lista a equipe; o admin do ambiente aparece fixo, sem controles', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByText('Administrador do ambiente')).toBeInTheDocument();
    expect(screen.queryByLabelText('Papel de Administrador')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Papel de Bia')).toHaveValue('foto');
  });

  it('muda o papel e desativa uma pessoa pela API', async () => {
    const patch = jest.fn(() => resposta(200, {}));
    renderPainel(<Acessos />, { rotas: rotas({ 'PATCH /api/pascom/acessos/equipe/bia%40p.org': patch }) });
    await aberta();
    await userEvent.selectOptions(screen.getByLabelText('Papel de Bia'), 'coord');
    expect(await screen.findByText('Bia agora é Coordenação.')).toBeInTheDocument();
    expect(corpo(patch.mock.calls[0][0])).toEqual({ role: 'coord' });
    await userEvent.click(screen.getByRole('switch', { name: 'Bia ativo' }));
    expect(await screen.findByText('Bia desativado.')).toBeInTheDocument();
    expect(corpo(patch.mock.calls[1][0])).toEqual({ ativo: false });
  });

  it('o aviso da trava do último administrador chega à tela', async () => {
    const patch = jest.fn(() => resposta(400, { error: 'Precisa existir ao menos um administrador ativo.' }));
    renderPainel(<Acessos />, { rotas: rotas({ 'PATCH /api/pascom/acessos/equipe/bia%40p.org': patch }) });
    await aberta();
    await userEvent.click(screen.getByRole('switch', { name: 'Bia ativo' }));
    expect(await screen.findByText('Precisa existir ao menos um administrador ativo.')).toBeInTheDocument();
  });

  it('adiciona uma pessoa e limpa o formulário; erro do servidor mantém o digitado', async () => {
    const post = jest.fn()
      .mockReturnValueOnce(resposta(400, { error: 'Informe um e-mail válido.' }))
      .mockReturnValueOnce(resposta(201, { email: 'carla@p.org' }));
    renderPainel(<Acessos />, { rotas: rotas({ 'POST /api/pascom/acessos/equipe': post }) });
    await aberta();
    await userEvent.type(screen.getByLabelText('E-mail'), 'carla');
    await userEvent.type(screen.getByLabelText('Nome'), 'Carla Souza');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à equipe' }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Carla Souza');
    await userEvent.clear(screen.getByLabelText('E-mail'));
    await userEvent.type(screen.getByLabelText('E-mail'), 'carla@p.org');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à equipe' }));
    expect(await screen.findByText('carla@p.org entrou na equipe.')).toBeInTheDocument();
    expect(corpo(post.mock.calls[1][0])).toEqual({ email: 'carla@p.org', nome: 'Carla Souza', role: 'atend' });
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(chamadas('/api/pascom/acessos', 'GET').length).toBeGreaterThanOrEqual(2);
  });
});

describe('backup das configurações', () => {
  it('o botão baixa o arquivo gerado pelo servidor', async () => {
    globalThis.URL.createObjectURL = jest.fn(() => 'blob:x');
    globalThis.URL.revokeObjectURL = jest.fn();
    const clique = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPainel(<Acessos />, {
      rotas: rotas({ 'GET /api/pascom/backup': () => resposta(200, { geradoEm: '2026-10-03T12:00:00.000Z', configuracoes: {} }) }),
    });
    await aberta();
    await userEvent.click(screen.getByRole('button', { name: 'Baixar backup' }));
    expect(await screen.findByText('Backup baixado.')).toBeInTheDocument();
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
    expect(clique).toHaveBeenCalled();
    clique.mockRestore();
  });

  it('avisa em português que o arquivo leva os e-mails da equipe e não leva pedidos', async () => {
    renderPainel(<Acessos />, { rotas: rotas() });
    await aberta();
    expect(screen.getByText(/Não inclui pedidos, fotos nem chaves/)).toBeInTheDocument();
    expect(screen.getByText(/e-mails da equipe/)).toBeInTheDocument();
  });
});
