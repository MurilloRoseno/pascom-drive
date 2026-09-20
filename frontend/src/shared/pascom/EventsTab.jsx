/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories, categoryLabel } from '../../data/categories.js';
import { pascomEvento, pascomEventoAcao, pascomEventos } from '../../lib/api.js';
import { buildEventSharePayload, shareEventNatively } from '../eventShare.js';
import LiberarEspacoDialog from './LiberarEspacoDialog.jsx';
import { currency } from './OrdersTab.jsx';

const FILTROS = [
  ['ativos', 'Todos', (evento) => evento.etapa !== 'arquivado'],
  ['andamento', 'Em andamento', (evento) => ['fila', 'processando', 'erro'].includes(evento.etapa)],
  ['revisar', 'Para revisar', (evento) => evento.etapa === 'revisar'],
  ['publicados', 'Publicados', (evento) => ['publicado', 'avenda'].includes(evento.etapa)],
  ['arquivados', 'Arquivados', (evento) => evento.etapa === 'arquivado'],
];

const ETAPA_LABEL = {
  fila: 'Na fila',
  processando: 'Processando',
  erro: 'Com erro',
  revisar: 'Para revisar',
  publicado: 'Publicado',
  avenda: 'À venda',
  arquivado: 'Arquivado',
};

const PASSOS = ['Enviado', 'Processando', 'Revisar', 'Publicado', 'À venda'];
const PASSO_POR_ETAPA = { fila: 1, processando: 1, erro: 1, revisar: 2, publicado: 3, avenda: 5 };

const MENSAGENS = {
  publicar: 'Evento publicado no site.',
  despublicar: 'Evento voltou para rascunho e saiu do site.',
  autorizarVenda: 'Venda liberada.',
  revogarVenda: 'Venda pausada.',
  definirVisibilidade: 'Visibilidade atualizada.',
  gerarCodigo: 'Novo código gerado.',
  revogarCodigo: 'Código revogado: a galeria ficou fechada.',
  arquivar: 'Evento arquivado.',
  editar: 'Dados do evento salvos.',
  reprocessar: 'As fotos com falha voltaram para a fila. O processamento tenta de novo em até 5 minutos.',
  descartarFalhas: 'Fotos com falha descartadas.',
  trocarCapa: 'Troca de capa na fila. A nova capa aparece em até 5 minutos.',
};

const PEDIDO_LABEL = { trocarCapa: 'Na fila: trocando capa' };

const POLL_MS = 30000;
const COVER_REUSE_MS = 45 * 60 * 1000;
const FOTOS_PAGINA = 24;

function formFromEvento(evento) {
  return {
    Titulo: evento.title || '',
    DataEvento: evento.date || '',
    HorarioEvento: evento.time || '',
    Categoria: evento.category || '',
    SlugPublico: evento.slug || '',
    ProtecaoMenores: evento.minorProtection ? 'SIM' : 'NAO',
  };
}

function Badge({ tone, children }) {
  return <span className={`pascom-badge is-${tone}`}>{children}</span>;
}

function EventBadges({ evento }) {
  if (evento.fila) return <Badge tone="info">Na fila</Badge>;
  return (
    <>
      <Badge tone={{ avenda: 'ok', publicado: 'ok', erro: 'danger', arquivado: 'muted' }[evento.etapa] || 'info'}>
        {ETAPA_LABEL[evento.etapa]}
        {evento.etapa === 'processando' && evento.totalFotos ? ` ${evento.progresso ?? evento.fotosProcessadas}/${evento.totalFotos}` : ''}
      </Badge>
      {evento.pedidoPendente && <Badge tone="info">{PEDIDO_LABEL[evento.pedidoPendente.tipo] || 'Pedido na fila'}</Badge>}
      {evento.espacoLiberacao ? (
        <Badge tone="muted">{evento.espacoLiberacao === 'parcial' ? 'Liberação parcial' : 'Arquivos removidos'}</Badge>
      ) : (
        <Badge tone={evento.visibility === 'publica' ? 'muted' : 'lock'}>
          {evento.visibility === 'publica' ? 'Pública' : 'Com código'}
        </Badge>
      )}
    </>
  );
}

function Progress({ etapa }) {
  if (etapa === 'arquivado') return null;
  const atual = PASSO_POR_ETAPA[etapa] ?? 0;
  return (
    <ol className="pascom-event-steps" aria-label="Etapas do evento">
      {PASSOS.map((passo, index) => {
        const estado = index < atual ? 'done' : index === atual ? 'current' : 'todo';
        return (
          <li key={passo} className={`is-${estado}`} aria-current={estado === 'current' ? 'step' : undefined}>
            <span aria-hidden="true" />
            {passo}
          </li>
        );
      })}
    </ol>
  );
}

function ActionButton({ evento, regra, label, acao, confirmar, primary, busy, onRun }) {
  const rule = evento.acoes?.[regra] || { ok: false };
  return (
    <div className="pascom-event-action">
      <button
        type="button"
        className={primary ? 'pascom-primary' : 'pascom-secondary'}
        disabled={!rule.ok || Boolean(busy)}
        onClick={() => onRun(acao, confirmar)}
      >
        {busy === acao.acao ? 'Salvando…' : label}
      </button>
      {!rule.ok && rule.motivo && <small>{rule.motivo}</small>}
    </div>
  );
}

function CodeDialog({ codigo, onClose }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
    } catch (_error) {
      setCopiado(false);
    }
  };
  return (
    <div className="pascom-dialog-backdrop">
      <div className="pascom-dialog" role="dialog" aria-modal="true" aria-labelledby="pascom-code-title">
        <span className="pascom-eyebrow">Código de acesso</span>
        <h2 id="pascom-code-title">Anote o código agora</h2>
        <p className="pascom-code-value" data-testid="codigo-gerado">{codigo}</p>
        <p>Ele não será mostrado de novo. Quem tiver o link do evento vai precisar deste código para ver as fotos.</p>
        <div className="pascom-user-actions">
          <button type="button" className="pascom-secondary" onClick={copiar}>{copiado ? 'Copiado' : 'Copiar código'}</button>
          <button type="button" className="pascom-primary" onClick={onClose} autoFocus>Já anotei</button>
        </div>
      </div>
    </div>
  );
}

export default function EventsTab({ getToken, focusNomePasta = '', onGoUpload }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('ativos');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [codigo, setCodigo] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [fotosVisiveis, setFotosVisiveis] = useState(FOTOS_PAGINA);
  const [liberando, setLiberando] = useState(false);
  const coverCache = useRef(new Map());

  const withToken = useCallback(async (fn) => fn(await getToken()), [getToken]);

  // Os tokens das miniaturas mudam a cada consulta; reaproveitar a URL evita
  // baixar de novo todas as capas a cada atualizacao automatica da lista.
  const estabilizarCapas = useCallback((lista) => lista.map((evento) => {
    if (!evento.coverThumbnail) return evento;
    const previous = coverCache.current.get(evento.id);
    if (previous && Date.now() - previous.at < COVER_REUSE_MS) return { ...evento, coverThumbnail: previous.url };
    coverCache.current.set(evento.id, { url: evento.coverThumbnail, at: Date.now() });
    return evento;
  }), []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await withToken(pascomEventos);
      setEventos(estabilizarCapas(result.eventos));
      if (!silent) setError('');
    } catch (cause) {
      if (!silent) setError(cause.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [withToken, estabilizarCapas]);

  useEffect(() => { load(); }, [load]);

  const precisaAtualizar = eventos.some((evento) => (
    evento.etapa === 'fila' || evento.etapa === 'processando' || Boolean(evento.pedidoPendente)
  ));
  useEffect(() => {
    if (!precisaAtualizar) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [precisaAtualizar, load]);

  // Chegando da aba de envio: recarrega e seleciona o evento recem-enviado.
  useEffect(() => {
    if (focusNomePasta) {
      setFiltro('ativos');
      load(true);
    }
  }, [focusNomePasta, load]);

  useEffect(() => {
    if (!focusNomePasta) return;
    const alvo = eventos.find((evento) => evento.nomePasta === focusNomePasta);
    if (alvo) setSelectedId(alvo.id);
  }, [focusNomePasta, eventos]);

  const selected = eventos.find((evento) => evento.id === selectedId) || null;
  const evento = detail?.evento?.id === selectedId ? { ...selected, ...detail.evento } : selected;
  const selectedEventoId = selected?.eventoId || '';

  useEffect(() => {
    let alive = true;
    setFotosVisiveis(FOTOS_PAGINA);
    if (!selectedEventoId) {
      setDetail(null);
      return undefined;
    }
    withToken((token) => pascomEvento(token, selectedEventoId))
      .then((result) => alive && setDetail(result))
      .catch((cause) => alive && setError(cause.message));
    return () => { alive = false; };
  }, [selectedEventoId, selected?.fotosProcessadas, selected?.status, withToken]);

  useEffect(() => {
    setEditing(false);
    setNotice('');
  }, [selectedId]);

  const visiveis = useMemo(() => {
    const teste = FILTROS.find(([id]) => id === filtro)?.[2] || (() => true);
    return eventos.filter(teste);
  }, [eventos, filtro]);

  const contagem = useMemo(() => Object.fromEntries(
    FILTROS.map(([id, , teste]) => [id, eventos.filter(teste).length]),
  ), [eventos]);

  const aplicarResultado = (result) => {
    if (!result?.evento) return;
    setDetail({ evento: result.evento, fotos: result.fotos });
    setEventos((lista) => lista.map((item) => (
      item.id === result.evento.id ? { ...result.evento, coverThumbnail: item.coverThumbnail || result.evento.coverThumbnail } : item
    )));
  };

  const executar = async (acao, confirmar) => {
    if (confirmar && !window.confirm(confirmar)) return;
    setBusy(acao.acao);
    setError('');
    setNotice('');
    try {
      const result = await withToken((token) => pascomEventoAcao(token, selectedEventoId, acao));
      aplicarResultado(result);
      if (result.codigo) setCodigo(result.codigo);
      setNotice(MENSAGENS[acao.acao] || 'Alteração salva.');
      if (acao.acao === 'editar') setEditing(false);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy('');
    }
  };

  const salvarEdicao = (submitEvent) => {
    submitEvent.preventDefault();
    const atual = formFromEvento(evento);
    const campos = Object.fromEntries(Object.entries(form).filter(([campo, valor]) => valor !== atual[campo]));
    if (!Object.keys(campos).length) {
      setEditing(false);
      return;
    }
    executar({ acao: 'editar', campos });
  };

  const compartilhar = async () => {
    const payload = buildEventSharePayload(evento, window.location.origin);
    try {
      await shareEventNatively(payload);
      setNotice('Link pronto para compartilhar.');
    } catch (_cause) {
      setNotice(payload.url);
    }
  };

  const fotos = detail?.evento?.id === selectedId ? detail.fotos || [] : [];
  const run = (acao, confirmar) => executar(acao, confirmar);

  return (
    <section className={`pascom-events${selected ? ' has-selection' : ''}`}>
      <div className="pascom-card pascom-events-list">
        <div className="pascom-toolbar">
          <div>
            <span className="pascom-eyebrow">Eventos</span>
            <h2>Do envio à venda</h2>
          </div>
          <button type="button" className="pascom-secondary" onClick={() => load()} disabled={loading}>
            {loading ? 'Carregando…' : 'Atualizar'}
          </button>
        </div>

        <div className="pascom-chips" role="group" aria-label="Filtrar eventos">
          {FILTROS.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {label} <span>{contagem[id] || 0}</span>
            </button>
          ))}
        </div>

        {error && !selected && <div className="pascom-alert" role="alert">{error}</div>}
        {precisaAtualizar && <p className="pascom-upload-hint">Atualizando sozinho a cada 30 segundos enquanto há eventos em processamento.</p>}

        {!loading && eventos.length === 0 && (
          <div className="pascom-events-empty">
            <p>Nenhum evento ainda. Envie as fotos do primeiro evento pelo painel.</p>
            {onGoUpload && <button type="button" className="pascom-primary" onClick={onGoUpload}>Enviar fotos</button>}
          </div>
        )}
        {!loading && eventos.length > 0 && visiveis.length === 0 && <p className="pascom-empty">Nenhum evento neste filtro.</p>}

        <ul className="pascom-event-list">
          {visiveis.map((item) => (
            <li key={item.id}>
              <button type="button" className={item.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
                <span className="pascom-event-thumb">
                  {item.coverThumbnail ? <img src={item.coverThumbnail} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">{(item.title || '?').charAt(0)}</span>}
                </span>
                <span className="pascom-event-info">
                  <strong>{item.title}</strong>
                  <small>{[categoryLabel(item.category), item.dateLabel].filter(Boolean).join(' · ')}</small>
                  <span className="pascom-event-badges"><EventBadges evento={item} /></span>
                </span>
                {!item.fila && item.vendas > 0 && (
                  <span className="pascom-event-sales">{item.vendas} {item.vendas === 1 ? 'venda' : 'vendas'}<br />{currency.format(item.receita)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="pascom-card pascom-event-detail">
        {!evento && <p className="pascom-empty">Selecione um evento para revisar, publicar e liberar a venda.</p>}

        {evento && (
          <>
            <button type="button" className="pascom-event-back" onClick={() => setSelectedId('')}>← Voltar para a lista</button>
            <span className="pascom-eyebrow">{categoryLabel(evento.category)}</span>
            <h2>{evento.title}</h2>
            <p className="pascom-upload-hint">
              {[evento.dateLabel, evento.time, evento.fila ? `${evento.totalFotos} fotos enviadas` : `${evento.fotosProcessadas} fotos processadas`].filter(Boolean).join(' · ')}
            </p>
            <Progress etapa={evento.etapa} />

            {error && <div className="pascom-alert" role="alert">{error}</div>}
            {notice && <div className="pascom-alert success" role="status">{notice}</div>}
            {(evento.avisos || []).map((aviso) => <div key={aviso} className="pascom-alert pascom-alert-warn">{aviso}</div>)}

            {evento.etapa === 'processando' && evento.totalFotos > 0 && (
              <p className="pascom-upload-hint" role="status">
                {evento.progresso ?? evento.fotosProcessadas} de {evento.totalFotos} fotos prontas · o processamento continua sozinho a cada 5 minutos, em partes.
              </p>
            )}

            {evento.fila && (
              <p>Envio concluído. O processamento automático gera as prévias com marca d’água e as miniaturas em até 5 minutos por evento; esta tela se atualiza sozinha.</p>
            )}

            {!evento.fila && (
              <>
                <section className="pascom-event-section" aria-labelledby="pascom-next-step">
                  <h3 id="pascom-next-step">Próximo passo</h3>
                  <div className="pascom-event-actions">
                    {['revisar', 'processando', 'erro'].includes(evento.etapa) && (
                      <ActionButton evento={evento} regra="publicar" label="Publicar evento" primary busy={busy} onRun={run}
                        acao={{ acao: 'publicar' }} confirmar="Publicar agora? O evento passa a aparecer no site." />
                    )}
                    {evento.etapa === 'publicado' && (
                      <ActionButton evento={evento} regra="autorizarVenda" label="Liberar venda" primary busy={busy} onRun={run}
                        acao={{ acao: 'autorizarVenda' }} confirmar="Liberar a venda das fotos deste evento?" />
                    )}
                    {evento.etapa === 'avenda' && (
                      <ActionButton evento={evento} regra="revogarVenda" label="Pausar venda" busy={busy} onRun={run}
                        acao={{ acao: 'revogarVenda' }} confirmar="Pausar a venda? As fotos continuam visíveis, mas ninguém consegue comprar." />
                    )}
                    {evento.etapa === 'arquivado' && !evento.espacoLiberacao && (
                      <ActionButton evento={evento} regra="publicar" label="Publicar novamente" primary busy={busy} onRun={run}
                        acao={{ acao: 'publicar' }} confirmar="Publicar este evento de novo?" />
                    )}
                    {evento.etapa === 'arquivado' && (
                      <div className="pascom-event-action">
                        <button type="button" className="pascom-secondary" disabled={!evento.acoes?.liberarEspaco?.ok || Boolean(busy)}
                          onClick={() => setLiberando(true)}>
                          {evento.espacoLiberacao === 'parcial' ? 'Continuar liberação de espaço' : 'Liberar espaço no Drive'}
                        </button>
                        {evento.acoes?.liberarEspaco?.ok
                          ? <small className="is-info">Tira do Drive as prévias e os originais que ninguém comprou.</small>
                          : evento.acoes?.liberarEspaco?.motivo && <small>{evento.acoes.liberarEspaco.motivo}</small>}
                      </div>
                    )}
                    {evento.acoes?.despublicar?.ok && (
                      <ActionButton evento={evento} regra="despublicar" label="Voltar para rascunho" busy={busy} onRun={run}
                        acao={{ acao: 'despublicar' }} confirmar="Tirar o evento do site? A venda também será pausada." />
                    )}
                  </div>
                </section>

                {evento.etapa === 'erro' && (
                  <section className="pascom-event-section" aria-labelledby="pascom-falhas">
                    <h3 id="pascom-falhas">Fotos com falha</h3>
                    {(evento.falhas || []).length > 0 && (
                      <ul className="pascom-falhas-list">
                        {evento.falhas.map((falha) => <li key={falha}>{falha}</li>)}
                      </ul>
                    )}
                    <p className="pascom-upload-hint">
                      Cada foto é tentada 3 vezes antes de ir para a quarentena. As demais fotos já estão prontas e o evento pode ser publicado.
                    </p>
                    <div className="pascom-event-actions">
                      <ActionButton evento={evento} regra="reprocessar" label="Tentar de novo" primary busy={busy} onRun={run}
                        acao={{ acao: 'reprocessar' }} />
                      <ActionButton evento={evento} regra="descartarFalhas" label="Descartar as fotos com falha" busy={busy} onRun={run}
                        acao={{ acao: 'descartarFalhas' }}
                        confirmar="Descartar as fotos com falha? Elas vão para a lixeira do Drive e o evento fica só com as fotos que deram certo." />
                    </div>
                  </section>
                )}

                <section className="pascom-event-section" aria-labelledby="pascom-access">
                  <h3 id="pascom-access">Quem pode ver</h3>
                  <div className="pascom-segmented" role="group" aria-label="Visibilidade da galeria">
                    <button type="button" aria-pressed={evento.visibility === 'protegida'}
                      disabled={!evento.acoes?.tornarProtegida?.ok || Boolean(busy)}
                      onClick={() => run({ acao: 'definirVisibilidade', visibilidade: 'protegida' })}>
                      Protegida por código
                    </button>
                    <button type="button" aria-pressed={evento.visibility === 'publica'}
                      disabled={!evento.acoes?.tornarPublica?.ok || Boolean(busy)}
                      onClick={() => run({ acao: 'definirVisibilidade', visibilidade: 'publica' }, 'Deixar a galeria aberta para qualquer pessoa com o link?')}>
                      Pública
                    </button>
                  </div>
                  {evento.minorProtection && <p className="pascom-upload-hint">Evento com menores: a galeria fica sempre protegida por código.</p>}
                  {evento.visibility === 'protegida' && (
                    <div className="pascom-event-actions">
                      <ActionButton evento={evento} regra="gerarCodigo" label={evento.hasCode ? 'Gerar novo código' : 'Gerar código'} busy={busy} onRun={run}
                        acao={{ acao: 'gerarCodigo' }} confirmar={evento.hasCode ? 'O código atual deixará de funcionar. Gerar um novo?' : undefined} />
                      {evento.hasCode && (
                        <ActionButton evento={evento} regra="revogarCodigo" label="Revogar código" busy={busy} onRun={run}
                          acao={{ acao: 'revogarCodigo' }} confirmar="Revogar o código? Ninguém mais consegue abrir a galeria até gerar outro." />
                      )}
                    </div>
                  )}
                  {evento.publication === 'publicado' && (
                    <div className="pascom-event-share">
                      <code>{buildEventSharePayload(evento, window.location.origin).url}</code>
                      <button type="button" className="pascom-secondary" onClick={compartilhar}>Compartilhar</button>
                    </div>
                  )}
                </section>

                <section className="pascom-event-section" aria-labelledby="pascom-review">
                  <h3 id="pascom-review">Revisar fotos</h3>
                  {fotos.length > 0 && !evento.acoes?.trocarCapa?.ok && evento.acoes?.trocarCapa?.motivo && evento.etapa !== 'arquivado' && (
                    <p className="pascom-upload-hint">Trocar a capa: {evento.acoes.trocarCapa.motivo}</p>
                  )}
                  {fotos.length > 0 && evento.acoes?.trocarCapa?.ok && (
                    <p className="pascom-upload-hint">Toque na estrela de uma foto para usá-la como capa.</p>
                  )}
                  {fotos.length === 0 && (
                    <p className="pascom-empty">
                      {evento.espacoLiberacao
                        ? 'As prévias deste evento foram removidas para liberar espaço no Drive.'
                        : 'As miniaturas aparecem aqui assim que o processamento gerar as prévias.'}
                    </p>
                  )}
                  <ul className="pascom-review-grid">
                    {fotos.slice(0, fotosVisiveis).map((foto) => (
                      <li key={foto.id}>
                        <a href={foto.previewUrl} target="_blank" rel="noreferrer" aria-label={`Abrir prévia ${foto.type === 'capa' ? 'da capa' : foto.id}`}>
                          <img src={foto.thumbnailUrl} alt="" loading="lazy" decoding="async" />
                          {foto.type === 'capa' && <em className="pascom-upload-capa">Capa</em>}
                        </a>
                        {foto.type !== 'capa' && evento.acoes?.trocarCapa?.ok && (
                          <button type="button" className="pascom-review-cover" aria-label={`Usar a foto ${foto.id} como capa`} title="Usar como capa"
                            disabled={Boolean(busy)}
                            onClick={() => run({ acao: 'trocarCapa', fotoId: foto.id },
                              'Usar esta foto como capa? Ela deixa de ser vendida, e a capa atual vira uma foto comum à venda, com marca d’água.')}>
                            <span aria-hidden="true">★</span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {fotos.length > fotosVisiveis && (
                    <button type="button" className="pascom-secondary" onClick={() => setFotosVisiveis(fotosVisiveis + FOTOS_PAGINA)}>
                      Mostrar mais {Math.min(FOTOS_PAGINA, fotos.length - fotosVisiveis)} de {fotos.length - fotosVisiveis}
                    </button>
                  )}
                </section>

                <section className="pascom-event-section" aria-labelledby="pascom-edit">
                  <div className="pascom-toolbar">
                    <h3 id="pascom-edit">Dados do evento</h3>
                    {!editing && (
                      <button type="button" className="pascom-secondary" onClick={() => { setForm(formFromEvento(evento)); setEditing(true); }}>Editar</button>
                    )}
                  </div>
                  {!editing && (
                    <dl className="pascom-definition">
                      <div><dt>Link público</dt><dd>{evento.slug ? `/e/${evento.slug}` : 'Automático'}</dd></div>
                      <div><dt>Menores</dt><dd>{evento.minorProtection ? 'Sim, protegido' : 'Não'}</dd></div>
                      <div><dt>Vendas</dt><dd>{evento.vendas || 0} · {currency.format(evento.receita || 0)}</dd></div>
                      <div><dt>Pasta</dt><dd className="pascom-break">{evento.nomePasta}</dd></div>
                    </dl>
                  )}
                  {editing && form && (
                    <form className="pascom-upload-fields pascom-event-form" onSubmit={salvarEdicao}>
                      <label className="pascom-upload-title">Título
                        <input value={form.Titulo} maxLength={120} onChange={(e) => setForm({ ...form, Titulo: e.target.value })} required minLength={3} />
                      </label>
                      <label>Categoria
                        <select value={form.Categoria} onChange={(e) => setForm({ ...form, Categoria: e.target.value })}>
                          {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                        </select>
                      </label>
                      <label>Data
                        <input type="date" value={form.DataEvento} onChange={(e) => setForm({ ...form, DataEvento: e.target.value })} required />
                      </label>
                      <label>Horário
                        <input type="time" value={form.HorarioEvento} onChange={(e) => setForm({ ...form, HorarioEvento: e.target.value })} />
                      </label>
                      <label>Link público (/e/…)
                        <input value={form.SlugPublico} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="ex.: casamento-joao-e-maria"
                          onChange={(e) => setForm({ ...form, SlugPublico: e.target.value.toLowerCase() })} />
                      </label>
                      <label className="pascom-check">
                        <input type="checkbox" checked={form.ProtecaoMenores === 'SIM'} onChange={(e) => setForm({ ...form, ProtecaoMenores: e.target.checked ? 'SIM' : 'NAO' })} />
                        Há menores nas fotos (galeria sempre protegida)
                      </label>
                      <div className="pascom-user-actions pascom-upload-title">
                        <button type="submit" className="pascom-primary" disabled={Boolean(busy)}>{busy === 'editar' ? 'Salvando…' : 'Salvar'}</button>
                        <button type="button" className="pascom-secondary" onClick={() => setEditing(false)}>Cancelar</button>
                      </div>
                    </form>
                  )}
                </section>

                {evento.acoes?.arquivar?.ok && (
                  <section className="pascom-event-section">
                    <ActionButton evento={evento} regra="arquivar" label="Arquivar evento" busy={busy} onRun={run}
                      acao={{ acao: 'arquivar' }} confirmar="Arquivar? O evento sai do site e a venda é encerrada. Os pedidos já pagos continuam válidos." />
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>

      {codigo && <CodeDialog codigo={codigo} onClose={() => setCodigo('')} />}
      {liberando && evento && (
        <LiberarEspacoDialog
          getToken={getToken}
          evento={evento}
          onClose={() => setLiberando(false)}
          onDone={(result) => { aplicarResultado(result); setNotice('Espaço liberado no Drive.'); }}
        />
      )}
    </section>
  );
}
