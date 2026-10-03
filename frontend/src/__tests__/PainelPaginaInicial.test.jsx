import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaInicial from '../painel/pages/PaginaInicial.jsx';
import { renderPainel, resposta, TODAS } from '../test-utils/painel.jsx';

const BLOCOS = [
  { id: 'categorias', titulo: 'Sacramentos e celebrações', ligado: true },
  { id: 'destaque', titulo: 'Em destaque', ligado: true },
  { id: 'eventos', titulo: 'Eventos recentes', ligado: true },
  { id: 'missao', titulo: 'Nossa missão', ligado: true },
  { id: 'agenda', titulo: 'Próximas atividades', ligado: true },
  { id: 'depoimentos', titulo: 'O que dizem nossos fiéis', ligado: true },
  { id: 'contato', titulo: 'Fale com a secretaria', ligado: true },
];
const INFO = {
  categorias: { modulo: 'busca', noAr: true, so: null },
  destaque: { modulo: 'busca', noAr: true, so: null },
  eventos: { modulo: 'busca', noAr: true, so: null },
  missao: { modulo: null, noAr: true, so: 'desktop' },
  agenda: { modulo: 'agenda', noAr: false, so: null },
  depoimentos: { modulo: null, noAr: true, so: 'desktop' },
  contato: { modulo: null, noAr: true, so: 'mobile' },
};
const HOME = { blocos: BLOCOS, destaque: '', info: INFO, eventosNoAr: [{ eventoId: 'A', nome: 'Missa dominical' }] };

function rotas(put = jest.fn(() => resposta(200, {}))) {
  return (url, opcoes) => {
    const chave = `${opcoes.method || 'GET'} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (chave === 'GET /api/pascom/home') return resposta(200, HOME);
    if (chave === 'PUT /api/pascom/home') return put(opcoes);
    return resposta(404, { error: chave });
  };
}
const corpo = (o) => JSON.parse(o.body);
const carregada = () => screen.findByRole('heading', { name: 'Evento em destaque' });

describe('painel: Página inicial', () => {
  it('lista os blocos na ordem, diz onde cada um existe e avisa o que está oculto por módulo', async () => {
    renderPainel(<PaginaInicial />, { rotas: rotas() });
    await carregada();
    const titulos = screen.getAllByLabelText(/^Título do bloco/).map((i) => i.value);
    expect(titulos).toEqual(BLOCOS.map((b) => b.titulo));
    expect(screen.getAllByText('só no computador')).toHaveLength(2);
    expect(screen.getByText('só no celular')).toBeInTheDocument();
    expect(screen.getByText('Oculto: Agenda paroquial desligado')).toBeInTheDocument();
    expect(screen.getByText(/Os depoimentos vêm de Conteúdo do site/)).toBeInTheDocument();
  });

  it('só oferece como destaque eventos que estão no ar', async () => {
    renderPainel(<PaginaInicial />, { rotas: rotas() });
    await carregada();
    const select = screen.getByLabelText('Evento');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Nenhum', 'Missa dominical']);
  });

  it('sobe um bloco, muda o título, desliga outro, escolhe o destaque e publica tudo na ordem nova', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<PaginaInicial />, { rotas: rotas(put) });
    await carregada();
    await userEvent.click(screen.getByRole('button', { name: 'Subir Eventos recentes' }));
    const t = screen.getByLabelText('Título do bloco eventos');
    await userEvent.clear(t);
    await userEvent.type(t, 'Fotos recentes');
    await userEvent.click(screen.getByRole('switch', { name: 'Mostrar Nossa missão' }));
    await userEvent.selectOptions(screen.getByLabelText('Evento'), 'A');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar página inicial' }));
    expect(await screen.findByText('Página inicial publicada.')).toBeInTheDocument();
    const enviado = corpo(put.mock.calls[0][0]);
    expect(enviado.blocos.map((b) => b.id)).toEqual(['categorias', 'eventos', 'destaque', 'missao', 'agenda', 'depoimentos', 'contato']);
    expect(enviado.blocos[1].titulo).toBe('Fotos recentes');
    expect(enviado.blocos.find((b) => b.id === 'missao').ligado).toBe(false);
    expect(enviado.destaque).toBe('A');
  });

  it('o primeiro não sobe e o último não desce', async () => {
    renderPainel(<PaginaInicial />, { rotas: rotas() });
    await carregada();
    expect(screen.getByRole('button', { name: 'Subir Sacramentos e celebrações' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descer Fale com a secretaria' })).toBeDisabled();
  });

  it('título vazio é barrado antes de enviar', async () => {
    const put = jest.fn(() => resposta(200, {}));
    renderPainel(<PaginaInicial />, { rotas: rotas(put) });
    await carregada();
    await userEvent.clear(screen.getByLabelText('Título do bloco agenda'));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar página inicial' }));
    expect(await screen.findByText('Cada bloco precisa de um título.')).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
  });

  it('quem só pode ver não edita nem publica', async () => {
    renderPainel(<PaginaInicial />, { rotas: rotas(), permissoes: TODAS.filter((p) => p !== 'conteudo.editar') });
    await carregada();
    expect(screen.getByLabelText('Título do bloco agenda')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Publicar página inicial|Nada a publicar/ })).not.toBeInTheDocument();
  });
});
