const { montarEmailAdmin, escaparHtmlEmail } = require('../EmailTemplates');

const dados = {
  titulo: 'Erro ao processar foto: foto.jpg',
  resumo: 'Uma foto enviada nao pode ser processada.',
  detalhes: [
    { rotulo: 'Arquivo', valor: 'foto.jpg' },
    { rotulo: 'Erro', valor: 'API falhou <500>' },
  ],
  proximoPasso: 'Confira o arquivo.',
};

describe('montarEmailAdmin', () => {
  it('builds subject, plain text and HTML from the same data', () => {
    const email = montarEmailAdmin(dados);
    expect(email.assunto).toBe('[Pascom] Erro ao processar foto: foto.jpg');
    expect(email.texto).toContain('Arquivo: foto.jpg');
    expect(email.texto).toContain('Erro: API falhou <500>');
    expect(email.texto).toContain('O que fazer: Confira o arquivo.');
    expect(email.html).toContain('Paróquia São Rafael');
    expect(email.html).toContain('Erro ao processar foto: foto.jpg');
    expect(email.html).toContain('Confira o arquivo.');
  });

  it('escapes dynamic values in the HTML body', () => {
    const email = montarEmailAdmin(dados);
    expect(email.html).toContain('API falhou &lt;500&gt;');
    expect(email.html).not.toContain('<500>');
    expect(escaparHtmlEmail(undefined)).toBe('');
  });

  it('works without details', () => {
    const email = montarEmailAdmin({ titulo: 'Aviso', resumo: 'Resumo', proximoPasso: 'Nada' });
    expect(email.texto).toContain('Aviso');
    expect(email.html).toContain('Resumo');
  });
});
