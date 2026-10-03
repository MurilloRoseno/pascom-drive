import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Conteudo from '../painel/pages/Conteudo.jsx';
import { renderPainel, resposta, TODAS } from '../test-utils/painel.jsx';

const CONTEUDO = {
  nome: 'Paróquia São Rafael',
  cidade: 'Açailândia – MA',
  lema: '',
  email: 'contato@paroquia.org',
  whatsapp: '5599991646063',
  endereco: 'Av. Contorno, Qd 59',
  horario: 'Terça a sexta: 8h30 às 11h',
  instagram: '',
  facebook: '',
  youtube: '',
  versiculo: 'Tudo posso naquele que me fortalece.',
  referencia: 'Filipenses 4:13',
  missao: null,
  numeros: [],
  depoimentos: [],
};

function rotas(put = jest.fn(() => resposta(200, { alterados: ['Nome'], conteudo: CONTEUDO })), inicial = CONTEUDO) {
  return (url, opcoes) => {
    const chave = `${opcoes.method || 'GET'} ${url.replace(/^.*(?=\/api)/, '')}`;
    if (chave === 'GET /api/pascom/conteudo') return resposta(200, inicial);
    if (chave === 'PUT /api/pascom/conteudo') return put(opcoes);
    return resposta(404, { error: chave });
  };
}
const corpo = (o) => JSON.parse(o.body);
const carregada = () => screen.findByRole('heading', { name: 'Identidade' });

describe('painel: Conteúdo do site', () => {
  it('mostra o que está publicado e o botão fica parado enquanto nada muda', async () => {
    renderPainel(<Conteudo />, { rotas: rotas() });
    await carregada();
    expect(screen.getByLabelText('Nome da paróquia')).toHaveValue('Paróquia São Rafael');
    expect(screen.getByLabelText('WhatsApp da secretaria (opcional)')).toHaveValue('99991646063');
    expect(screen.getByRole('button', { name: 'Nada a publicar' })).toBeDisabled();
  });

  it('publica só o que mudou', async () => {
    const put = jest.fn(() => resposta(200, { alterados: ['Nome'], conteudo: { ...CONTEUDO, nome: 'Paróquia São Rafael Arcanjo' } }));
    renderPainel(<Conteudo />, { rotas: rotas(put) });
    await carregada();
    const nome = screen.getByLabelText('Nome da paróquia');
    await userEvent.clear(nome);
    await userEvent.type(nome, 'Paróquia São Rafael Arcanjo');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar conteúdo' }));
    expect(await screen.findByText('Publicado: Nome.')).toBeInTheDocument();
    expect(corpo(put.mock.calls[0][0])).toEqual({ nome: 'Paróquia São Rafael Arcanjo' });
    expect(screen.getByRole('button', { name: 'Nada a publicar' })).toBeDisabled();
  });

  it('o WhatsApp mostrado sem o 55 não conta como mudança', async () => {
    renderPainel(<Conteudo />, { rotas: rotas() });
    await carregada();
    await userEvent.type(screen.getByLabelText('Nome da paróquia'), 'x');
    await userEvent.type(screen.getByLabelText('Endereço'), 'y');
    expect(screen.getByRole('button', { name: 'Publicar conteúdo' })).toBeEnabled();
    await userEvent.clear(screen.getByLabelText('Nome da paróquia'));
    await userEvent.type(screen.getByLabelText('Nome da paróquia'), 'Paróquia São Rafael');
    await userEvent.clear(screen.getByLabelText('Endereço'));
    await userEvent.type(screen.getByLabelText('Endereço'), 'Av. Contorno, Qd 59');
    expect(screen.getByRole('button', { name: 'Nada a publicar' })).toBeDisabled();
  });

  it('seções da Home nascem vazias e dizem que não aparecem no site', async () => {
    renderPainel(<Conteudo />, { rotas: rotas() });
    await carregada();
    expect(screen.getByText('Nenhum número cadastrado: a faixa não aparece no site.')).toBeInTheDocument();
    expect(screen.getByText('Nenhum depoimento cadastrado: a seção não aparece no site.')).toBeInTheDocument();
  });

  it('adiciona número, depoimento e missão e publica listas já limpas', async () => {
    const put = jest.fn(() => resposta(200, { alterados: ['Missão', 'Números', 'Depoimentos'], conteudo: CONTEUDO }));
    renderPainel(<Conteudo />, { rotas: rotas(put) });
    await carregada();
    await userEvent.type(screen.getByLabelText('Título da missão'), 'Servir em comunhão');
    await userEvent.type(screen.getByLabelText('Texto da missão'), 'Primeiro parágrafo.{enter}{enter}Segundo parágrafo.');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar número' }));
    await userEvent.type(screen.getByLabelText('Valor do número 1'), '40+');
    await userEvent.type(screen.getByLabelText('O que o número 1 conta'), 'anos de história');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar depoimento' }));
    await userEvent.type(screen.getByLabelText('Autor do depoimento 1'), 'Ana');
    await userEvent.type(screen.getByLabelText('Texto do depoimento 1'), 'Muito bom.');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar conteúdo' }));
    await screen.findByText(/Publicado:/);
    expect(corpo(put.mock.calls[0][0])).toEqual({
      missao: { titulo: 'Servir em comunhão', paragrafos: ['Primeiro parágrafo.', 'Segundo parágrafo.'] },
      numeros: [{ valor: '40+', rotulo: 'anos de história' }],
      depoimentos: [{ autor: 'Ana', funcao: '', texto: 'Muito bom.' }],
    });
  });

  it('remover o último depoimento limpa a seção (lista vazia)', async () => {
    const com = { ...CONTEUDO, depoimentos: [{ autor: 'Ana', funcao: '', texto: 'Muito bom.' }] };
    const put = jest.fn(() => resposta(200, { alterados: ['Depoimentos'], conteudo: CONTEUDO }));
    renderPainel(<Conteudo />, { rotas: rotas(put, com) });
    await carregada();
    await userEvent.click(screen.getByRole('button', { name: 'Remover depoimento 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Publicar conteúdo' }));
    await screen.findByText(/Publicado:/);
    expect(corpo(put.mock.calls[0][0])).toEqual({ depoimentos: [] });
  });

  it('respeita os limites: no máximo 4 números e 6 depoimentos', async () => {
    renderPainel(<Conteudo />, { rotas: rotas() });
    await carregada();
    for (let i = 0; i < 4; i += 1) await userEvent.click(screen.getByRole('button', { name: 'Adicionar número' }));
    expect(screen.queryByRole('button', { name: 'Adicionar número' })).not.toBeInTheDocument();
    for (let i = 0; i < 6; i += 1) await userEvent.click(screen.getByRole('button', { name: 'Adicionar depoimento' }));
    expect(screen.queryByRole('button', { name: 'Adicionar depoimento' })).not.toBeInTheDocument();
  });

  it('erro do servidor aparece em português e o que foi digitado continua na tela', async () => {
    const put = jest.fn(() => resposta(400, { error: 'E-mail: E-mail inválido.' }));
    renderPainel(<Conteudo />, { rotas: rotas(put) });
    await carregada();
    const email = screen.getByLabelText('E-mail da secretaria');
    await userEvent.clear(email);
    await userEvent.type(email, 'nao-e-email');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar conteúdo' }));
    expect((await screen.findAllByText('E-mail: E-mail inválido.')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('E-mail da secretaria')).toHaveValue('nao-e-email');
  });

  it('Descartar volta ao que está publicado', async () => {
    renderPainel(<Conteudo />, { rotas: rotas() });
    await carregada();
    await userEvent.type(screen.getByLabelText('Nome da paróquia'), ' Nova');
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(screen.getByLabelText('Nome da paróquia')).toHaveValue('Paróquia São Rafael');
  });

  it('quem só pode ver (sem conteudo.editar) não publica', async () => {
    renderPainel(<Conteudo />, { rotas: rotas(), permissoes: TODAS.filter((p) => p !== 'conteudo.editar') });
    await carregada();
    expect(screen.getByLabelText('Nome da paróquia')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Publicar conteúdo|Nada a publicar/ })).not.toBeInTheDocument();
    expect(screen.getByText(/não publicar mudanças/)).toBeInTheDocument();
  });
});
