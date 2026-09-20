const { acoesDisponiveis, avisosEvento, etapaEvento } = require('../lib/event-rules');

const base = {
  publication: 'rascunho', status: 'Processado', category: 'casamento', date: '2026-05-20',
  visibility: 'protegida', salesAuthorized: false, minorProtection: false, hasCode: true, hasCover: true, fotosProcessadas: 10,
};

it('classifica a etapa do ciclo do evento', () => {
  expect(etapaEvento({ fila: true })).toBe('fila');
  expect(etapaEvento({ ...base, status: 'Processando' })).toBe('processando');
  expect(etapaEvento({ ...base, status: 'Erro' })).toBe('erro');
  expect(etapaEvento(base)).toBe('revisar');
  expect(etapaEvento({ ...base, publication: 'publicado' })).toBe('publicado');
  expect(etapaEvento({ ...base, publication: 'publicado', salesAuthorized: true })).toBe('avenda');
  expect(etapaEvento({ ...base, publication: 'arquivado' })).toBe('arquivado');
});

it('explica por que publicar esta indisponivel', () => {
  expect(acoesDisponiveis(base).publicar).toEqual({ ok: true });
  expect(acoesDisponiveis({ ...base, status: 'Processando' }).publicar.motivo).toMatch(/processamento/);
  expect(acoesDisponiveis({ ...base, date: '' }).publicar.motivo).toMatch(/categoria e data/);
  expect(acoesDisponiveis({ ...base, publication: 'publicado' }).publicar.ok).toBe(false);
});

it('bloqueia venda e galeria publica para eventos com menores', () => {
  const menores = { ...base, minorProtection: true, visibility: 'publica' };
  expect(acoesDisponiveis(menores).autorizarVenda.motivo).toMatch(/menores/);
  expect(acoesDisponiveis({ ...base, minorProtection: true }).tornarPublica.motivo).toMatch(/menores/);
  expect(acoesDisponiveis({ ...base, fotosProcessadas: 0 }).autorizarVenda.motivo).toMatch(/Nenhuma foto/);
});

it('avisa sobre galeria protegida sem codigo', () => {
  expect(avisosEvento({ ...base, hasCode: false })[0]).toMatch(/sem código/);
  expect(avisosEvento(base)).toEqual([]);
  expect(acoesDisponiveis({ fila: true })).toEqual({});
});

it('libera espaco so de evento arquivado e bloqueia publicar e vender depois disso', () => {
  expect(acoesDisponiveis(base).liberarEspaco.motivo).toMatch(/Arquive/);
  const arquivado = { ...base, publication: 'arquivado' };
  expect(acoesDisponiveis(arquivado).liberarEspaco).toEqual({ ok: true });
  expect(acoesDisponiveis({ ...arquivado, espacoLiberacao: 'parcial' }).liberarEspaco).toEqual({ ok: true });
  expect(acoesDisponiveis({ ...arquivado, espacoLiberacao: 'concluida' }).liberarEspaco.motivo).toMatch(/já foi liberado/);

  const removido = { ...base, espacoLiberacao: 'concluida' };
  expect(acoesDisponiveis(removido).publicar.motivo).toMatch(/removidos para liberar espaço/);
  expect(acoesDisponiveis(removido).autorizarVenda.motivo).toMatch(/removidos para liberar espaço/);
  expect(avisosEvento({ ...arquivado, espacoLiberacao: 'parcial' })).toEqual(
    expect.arrayContaining([expect.stringMatching(/parou no meio/)]),
  );
});

it('reprocessar e descartar falhas so com erro e sem pedido na fila; trocar capa so com evento pronto', () => {
  const comErro = { ...base, status: 'Erro', falhas: ['Foto (a.jpg): x'] };
  expect(acoesDisponiveis(base).reprocessar.ok).toBe(false);
  expect(acoesDisponiveis(comErro).reprocessar).toEqual({ ok: true });
  expect(acoesDisponiveis(comErro).descartarFalhas).toEqual({ ok: true });
  expect(acoesDisponiveis(base).trocarCapa).toEqual({ ok: true });

  const naFila = { ...comErro, pedidoPendente: { tipo: 'trocarCapa' } };
  expect(acoesDisponiveis(naFila).reprocessar.motivo).toMatch(/troca de capa está na fila/);
  expect(acoesDisponiveis({ ...base, pedidoPendente: { tipo: 'trocarCapa' } }).trocarCapa.ok).toBe(false);

  const processando = { ...base, status: 'Processando', totalFotos: 300, progresso: 120, restantes: 180 };
  expect(acoesDisponiveis(processando).trocarCapa.motivo).toBe('Processando: faltam 180 fotos.');
  expect(acoesDisponiveis(processando).publicar.motivo).toBe('Processando: faltam 180 fotos.');
  expect(avisosEvento(comErro)[0]).toMatch(/1 foto falhou no processamento/);
  expect(avisosEvento({ ...base, pedidoErro: 'Preview API falhou (500)' })).toEqual(
    expect.arrayContaining([expect.stringMatching(/troca de capa falhou: Preview API/)]),
  );
});
