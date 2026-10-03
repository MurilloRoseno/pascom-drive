const {
  agoraSP, somarDias, estadoPublicacao, publicacaoEfetiva, montarPublicacao, publicacaoSchema,
} = require('../lib/publicacao');

// 2026-10-03 12:00 em São Paulo (UTC-3) = 15:00 UTC
const AGORA = new Date('2026-10-03T15:00:00Z');
const AGORA_SP = '2026-10-03T12:00';

describe('agoraSP', () => {
  it('formata o instante no fuso de São Paulo, sem segundos', () => {
    expect(agoraSP(AGORA)).toBe(AGORA_SP);
  });

  it('vira o dia certo perto da meia-noite UTC', () => {
    expect(agoraSP(new Date('2026-10-04T01:30:00Z'))).toBe('2026-10-03T22:30');
  });
});

describe('somarDias', () => {
  it('soma dias mantendo a hora', () => {
    expect(somarDias('2026-10-03T08:00', 7)).toBe('2026-10-10T08:00');
  });

  it('atravessa mês e ano', () => {
    expect(somarDias('2026-12-30T10:15', 5)).toBe('2027-01-04T10:15');
    expect(somarDias('2026-02-27T00:00', 2)).toBe('2026-03-01T00:00');
  });
});

describe('estadoPublicacao (coluna Publicacao + janela)', () => {
  const ev = (o) => ({ publicacao: 'publicado', publicarEm: '', expiraEm: '', ...o });

  it('evento antigo publicado, sem as colunas novas, continua no ar sem prazo', () => {
    expect(estadoPublicacao(ev({}), AGORA)).toEqual({ estado: 'no_ar', saiEmDias: null });
  });

  it('rascunho, vazio e valor desconhecido nunca aparecem', () => {
    expect(estadoPublicacao(ev({ publicacao: 'rascunho' }), AGORA).estado).toBe('rascunho');
    expect(estadoPublicacao(ev({ publicacao: '' }), AGORA).estado).toBe('rascunho');
    expect(estadoPublicacao(ev({ publicacao: 'sim' }), AGORA).estado).toBe('rascunho');
  });

  it('publicado com PublicarEm no futuro fica agendado até a hora e depois entra no ar sozinho', () => {
    const e = ev({ publicarEm: '2026-10-17T08:00', expiraEm: '2026-10-24T08:00' });
    expect(estadoPublicacao(e, AGORA).estado).toBe('agendado');
    expect(estadoPublicacao(e, new Date('2026-10-17T10:59:00Z')).estado).toBe('agendado');
    expect(estadoPublicacao(e, new Date('2026-10-17T11:00:00Z')).estado).toBe('no_ar');
  });

  it('com prazo, sai do ar na hora e passa a arquivado', () => {
    const e = ev({ publicarEm: '2026-09-26T12:00', expiraEm: '2026-10-03T12:00' });
    expect(estadoPublicacao(e, new Date('2026-10-03T14:59:00Z')).estado).toBe('no_ar');
    expect(estadoPublicacao(e, AGORA).estado).toBe('arquivado');
  });

  it('informa quantos dias faltam para sair do ar', () => {
    expect(estadoPublicacao(ev({ publicarEm: AGORA_SP, expiraEm: '2026-10-06T12:00' }), AGORA))
      .toEqual({ estado: 'no_ar', saiEmDias: 3 });
    expect(estadoPublicacao(ev({ publicarEm: AGORA_SP, expiraEm: '2026-10-03T18:00' }), AGORA).saiEmDias).toBe(1);
  });

  it('arquivado explícito continua arquivado, mesmo com datas', () => {
    expect(estadoPublicacao(ev({ publicacao: 'arquivado', publicarEm: AGORA_SP }), AGORA).estado).toBe('arquivado');
  });

  it('data ilegível não esconde nem derruba: trata como sem prazo', () => {
    expect(estadoPublicacao(ev({ expiraEm: 'lixo' }), AGORA).estado).toBe('no_ar');
    expect(estadoPublicacao(ev({ publicarEm: 'lixo' }), AGORA).estado).toBe('no_ar');
  });
});

describe('publicacaoEfetiva (o que o resto do sistema compara com "publicado")', () => {
  const evento = (o) => ({ publicationRaw: 'publicado', publishAt: '', expiresAt: '', ...o });

  it('só devolve "publicado" quando está no ar agora', () => {
    expect(publicacaoEfetiva(evento({}), AGORA)).toBe('publicado');
    expect(publicacaoEfetiva(evento({ publishAt: '2026-10-17T08:00' }), AGORA)).toBe('agendado');
    expect(publicacaoEfetiva(evento({ expiresAt: '2026-10-03T12:00' }), AGORA)).toBe('arquivado');
    expect(publicacaoEfetiva(evento({ publicationRaw: 'rascunho' }), AGORA)).toBe('rascunho');
    expect(publicacaoEfetiva(evento({ publicationRaw: 'arquivado' }), AGORA)).toBe('arquivado');
  });

  it('é recalculada a cada chamada: o mesmo evento muda de estado com o relógio', () => {
    const e = evento({ publishAt: '2026-10-03T13:00', expiresAt: '2026-10-03T14:00' });
    expect(publicacaoEfetiva(e, new Date('2026-10-03T15:59:00Z'))).toBe('agendado');
    expect(publicacaoEfetiva(e, new Date('2026-10-03T16:00:00Z'))).toBe('publicado');
    expect(publicacaoEfetiva(e, new Date('2026-10-03T17:00:00Z'))).toBe('arquivado');
  });
});

describe('montarPublicacao', () => {
  it('"agora" publica neste instante e calcula a saída pelo prazo', () => {
    expect(montarPublicacao({ modo: 'agora', prazoDias: 7 }, AGORA)).toEqual({
      publicacao: 'publicado', publicarEm: AGORA_SP, prazoDias: 7, expiraEm: '2026-10-10T12:00',
    });
  });

  it('prazo 0 significa sem prazo (não expira)', () => {
    const r = montarPublicacao({ modo: 'agora', prazoDias: 0 }, AGORA);
    expect(r.expiraEm).toBe('');
    expect(r.prazoDias).toBe(0);
  });

  it('agendar usa a data e a hora escolhidas e grava a intenção como "publicado"', () => {
    expect(montarPublicacao({ modo: 'agendar', data: '2026-10-17', hora: '08:00', prazoDias: 3 }, AGORA)).toEqual({
      publicacao: 'publicado', publicarEm: '2026-10-17T08:00', prazoDias: 3, expiraEm: '2026-10-20T08:00',
    });
  });

  it('agendar exige data e hora e nunca no passado', () => {
    expect(() => montarPublicacao({ modo: 'agendar', prazoDias: 7 }, AGORA)).toThrow('Escolha o dia e o horário');
    expect(() => montarPublicacao({ modo: 'agendar', data: '2026-10-02', hora: '08:00', prazoDias: 7 }, AGORA))
      .toThrow('Escolha um dia a partir de hoje');
    expect(() => montarPublicacao({ modo: 'agendar', data: '2026-10-03', hora: '11:59', prazoDias: 7 }, AGORA))
      .toThrow('Escolha um dia a partir de hoje');
    expect(() => montarPublicacao({ modo: 'agendar', data: '2026-02-30', hora: '08:00', prazoDias: 7 }, AGORA))
      .toThrow('Escolha o dia e o horário');
  });

  it('rascunho e arquivar limpam as datas', () => {
    expect(montarPublicacao({ modo: 'rascunho', prazoDias: 7 }, AGORA)).toEqual({
      publicacao: 'rascunho', publicarEm: '', prazoDias: 7, expiraEm: '',
    });
    expect(montarPublicacao({ modo: 'arquivar', prazoDias: 7 }, AGORA)).toEqual({
      publicacao: 'arquivado', publicarEm: '', prazoDias: 7, expiraEm: '',
    });
  });
});

describe('publicacaoSchema', () => {
  it('recusa campos desconhecidos (nada de status ou expiraEm vindo do navegador)', () => {
    expect(publicacaoSchema.safeParse({ modo: 'agora', prazoDias: 7, publicacao: 'publicado' }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agora', prazoDias: 7, expiraEm: '2030-01-01T00:00' }).success).toBe(false);
  });

  it('valida modo, formato de data/hora e limites do prazo', () => {
    expect(publicacaoSchema.safeParse({ modo: 'voar', prazoDias: 7 }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agendar', data: '17/10/2026', hora: '08:00', prazoDias: 7 }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agendar', data: '2026-10-17', hora: '25:00', prazoDias: 7 }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agora', prazoDias: -1 }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agora', prazoDias: 366 }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agora', prazoDias: 2.5 }).success).toBe(false);
    expect(publicacaoSchema.safeParse({ modo: 'agora', prazoDias: 30 }).success).toBe(true);
    expect(publicacaoSchema.safeParse({ modo: 'arquivar', prazoDias: 7 }).success).toBe(true);
  });
});
