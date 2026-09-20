/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories } from '../../data/categories.js';
import {
  pascomArmazenamento, pascomCancelarEnvio, pascomCriarEnvio, pascomFinalizarEnvio, pascomSessoesEnvio,
} from '../../lib/api.js';
import {
  SESSION_BATCH, SessionExpiredError, UPLOAD_CONCURRENCY, fileKey, fileMimeType, formatBytes,
  loadPendingUpload, rejectReason, runPool, savePendingUpload, slugTitulo, uploadFile,
} from './resumableUpload.js';

const EMPTY_FORM = { categoria: '', data: '', titulo: '' };
const THUMBS_PAGE = 48;

function previewUrl(file) {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';
}

function revoke(url) {
  if (url && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
}

function formValid(form) {
  return Boolean(form.categoria && form.data && form.titulo.trim().length >= 3 && slugTitulo(form.titulo));
}

export default function UploadTab({ getToken, onVerEventos }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [capaKey, setCapaKey] = useState('');
  const [phase, setPhase] = useState('selecao');
  const [envio, setEnvio] = useState(null);
  const [pending, setPending] = useState(() => loadPendingUpload());
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [visibleThumbs, setVisibleThumbs] = useState(THUMBS_PAGE);
  const [dragging, setDragging] = useState(false);

  const envioRef = useRef(null);
  const persistedRef = useRef(null);
  const sessionsRef = useRef({});
  const abortRef = useRef(null);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  const withToken = useCallback(async (fn) => fn(await getToken()), [getToken]);

  useEffect(() => {
    let alive = true;
    withToken(pascomArmazenamento)
      .then((data) => alive && setStorage(data))
      .catch((cause) => alive && /nao configurado/i.test(cause.message) && setError(cause.message));
    return () => { alive = false; };
  }, [withToken]);

  useEffect(() => () => itemsRef.current.forEach((item) => revoke(item.preview)), []);

  useEffect(() => {
    if (phase !== 'enviando') return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase]);

  const totals = useMemo(() => {
    const bytes = items.reduce((sum, item) => sum + item.size, 0);
    const sent = items.reduce((sum, item) => sum + item.sent, 0);
    const done = items.filter((item) => item.status === 'concluido').length;
    const failed = items.filter((item) => item.status === 'erro').length;
    return { bytes, sent, done, failed, percent: bytes ? Math.round((sent / bytes) * 100) : 0 };
  }, [items]);

  const locked = phase === 'enviando' || Boolean(envio);
  const folderName = form.categoria && form.data && slugTitulo(form.titulo)
    ? `${form.categoria}__${form.data}__${slugTitulo(form.titulo)}`
    : '';
  const storageShort = storage?.livre != null && totals.bytes > storage.livre;
  const canStart = formValid(form) && items.length > 0 && phase === 'selecao' && !storageShort;

  const patchItem = (key, patch) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const persist = (mutate) => {
    if (!persistedRef.current) return;
    mutate(persistedRef.current);
    savePendingUpload(persistedRef.current);
  };

  const addFiles = (fileList) => {
    if (phase === 'enviando' || phase === 'concluido') return;
    const incoming = Array.from(fileList || []);
    const names = new Set(itemsRef.current.map((item) => item.name));
    const accepted = [];
    const refused = [];
    const resumed = persistedRef.current?.files || {};
    incoming.forEach((file) => {
      const reason = rejectReason(file) || (names.has(file.name) ? 'Nome repetido neste envio.' : null);
      if (reason) {
        refused.push({ name: file.name, reason });
        return;
      }
      names.add(file.name);
      const key = fileKey(file);
      const previous = resumed[key];
      if (previous?.sessionUrl) sessionsRef.current[key] = previous.sessionUrl;
      accepted.push({
        key,
        file,
        name: file.name,
        size: file.size,
        mimeType: fileMimeType(file),
        preview: previewUrl(file),
        status: previous?.done ? 'concluido' : 'pendente',
        sent: previous?.done ? file.size : 0,
        resume: Boolean(previous?.sessionUrl && !previous?.done),
        error: '',
      });
    });
    setItems((current) => [...current, ...accepted]);
    setRejected((current) => [...refused, ...current].slice(0, 30));
    if (!capaKey && persistedRef.current?.capaName) {
      const capa = accepted.find((item) => item.name === persistedRef.current.capaName);
      if (capa) setCapaKey(capa.key);
    }
  };

  const removeItem = (key) => {
    setItems((current) => {
      const target = current.find((item) => item.key === key);
      revoke(target?.preview);
      return current.filter((item) => item.key !== key);
    });
    if (capaKey === key) setCapaKey('');
  };

  const resetAll = () => {
    itemsRef.current.forEach((item) => revoke(item.preview));
    setItems([]);
    setRejected([]);
    setCapaKey('');
    setForm(EMPTY_FORM);
    setEnvio(null);
    setResult(null);
    setPhase('selecao');
    envioRef.current = null;
    persistedRef.current = null;
    sessionsRef.current = {};
    savePendingUpload(null);
  };

  const resumePending = () => {
    envioRef.current = { uploadId: pending.uploadId, nomePasta: pending.nomePasta };
    persistedRef.current = pending;
    setEnvio(envioRef.current);
    setForm(pending.form || EMPTY_FORM);
    setPending(null);
  };

  const discardPending = async () => {
    const target = pending;
    setPending(null);
    savePendingUpload(null);
    try {
      await withToken((token) => pascomCancelarEnvio(token, target.uploadId));
    } catch (_cause) {
      // Envio ja removido ou expirado: a limpeza de 48h do Apps Script cuida do resto.
    }
  };

  const ensureSession = (() => {
    let inflight = null;
    return async (item, queue, uploadId) => {
      while (!sessionsRef.current[item.key]) {
        if (!inflight) {
          const batch = [item, ...queue.filter((other) => other.key !== item.key && !sessionsRef.current[other.key])]
            .slice(0, SESSION_BATCH);
          inflight = withToken((token) => pascomSessoesEnvio(token, uploadId, batch.map((entry) => ({
            nome: entry.name, mimeType: entry.mimeType, tamanho: entry.size,
          }))))
            .then(({ sessoes }) => {
              sessoes.forEach((sessao, index) => { sessionsRef.current[batch[index].key] = sessao.sessionUrl; });
              persist((state) => {
                batch.forEach((entry) => {
                  state.files[entry.key] = { name: entry.name, sessionUrl: sessionsRef.current[entry.key], done: false };
                });
              });
            })
            .finally(() => { inflight = null; });
        }
        await inflight;
      }
      return sessionsRef.current[item.key];
    };
  })();

  const startUpload = async () => {
    setError('');
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('enviando');
    let wakeLock = null;
    try {
      wakeLock = await navigator.wakeLock?.request?.('screen');
    } catch (_cause) {
      // Tela pode apagar; o envio continua enquanto a aba estiver ativa.
    }

    try {
      const current = itemsRef.current;
      const capaName = current.find((item) => item.key === capaKey)?.name || '';
      if (!envioRef.current) {
        const created = await withToken((token) => pascomCriarEnvio(token, {
          ...form,
          titulo: form.titulo.trim(),
          totalArquivos: current.length,
          bytesTotais: current.reduce((sum, item) => sum + item.size, 0),
        }));
        envioRef.current = { uploadId: created.uploadId, nomePasta: created.nomePasta };
        setEnvio(envioRef.current);
        if (created.armazenamento) setStorage(created.armazenamento);
        persistedRef.current = { ...envioRef.current, form, capaName, files: {} };
        savePendingUpload(persistedRef.current);
      } else {
        persist((state) => { state.capaName = capaName; });
      }

      const { uploadId } = envioRef.current;
      const queue = current.filter((item) => item.status !== 'concluido');
      let failed = 0;
      await runPool(queue, UPLOAD_CONCURRENCY, async (item) => {
        if (controller.signal.aborted) return;
        patchItem(item.key, { status: 'enviando', error: '' });
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const sessionUrl = await ensureSession(item, queue, uploadId);
            await uploadFile({
              file: item.file,
              sessionUrl,
              resume: item.resume && attempt === 0,
              signal: controller.signal,
              onProgress: (sent) => patchItem(item.key, { sent }),
            });
            patchItem(item.key, { status: 'concluido', sent: item.size });
            persist((state) => {
              state.files[item.key] = { ...(state.files[item.key] || {}), name: item.name, done: true };
            });
            return;
          } catch (cause) {
            if (cause?.name === 'AbortError') {
              patchItem(item.key, { status: 'pendente' });
              return;
            }
            if (cause instanceof SessionExpiredError && attempt === 0) {
              delete sessionsRef.current[item.key];
              continue;
            }
            failed += 1;
            patchItem(item.key, { status: 'erro', error: cause.message });
            return;
          }
        }
      });

      if (controller.signal.aborted) return;
      if (failed) {
        setPhase('selecao');
        setError(`${failed} foto(s) não chegaram ao Drive. Confira a conexão e toque em "Tentar de novo".`);
        return;
      }
      const done = await withToken((token) => pascomFinalizarEnvio(token, uploadId, {
        esperados: current.length,
        capa: capaName,
      }));
      savePendingUpload(null);
      persistedRef.current = null;
      setResult(done);
      setPhase('concluido');
    } catch (cause) {
      setError(cause.message);
      setPhase('selecao');
    } finally {
      abortRef.current = null;
      wakeLock?.release?.().catch?.(() => {});
    }
  };

  const cancelUpload = async () => {
    if (!window.confirm('Cancelar este envio? As fotos que já chegaram ao Drive serão descartadas.')) return;
    abortRef.current?.abort();
    const uploadId = envioRef.current?.uploadId;
    resetAll();
    if (uploadId) {
      try {
        await withToken((token) => pascomCancelarEnvio(token, uploadId));
      } catch (_cause) {
        // A limpeza automatica de 48h remove o que sobrar.
      }
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer?.files);
  };

  if (phase === 'concluido' && result) {
    return (
      <section className="pascom-card pascom-upload" aria-live="polite">
        <span className="pascom-eyebrow">Envio concluído</span>
        <h2>{result.arquivos} fotos no Drive</h2>
        <p>
          O evento <strong>{result.nomePasta}</strong> entrou na fila. Em até 5 minutos o sistema gera as prévias com
          marca d’água e as miniaturas; depois é só revisar e publicar na aba Eventos.
        </p>
        <div className="pascom-user-actions">
          {onVerEventos && (
            <button type="button" className="pascom-primary" onClick={() => onVerEventos(result.nomePasta)}>Acompanhar em Eventos</button>
          )}
          <button type="button" className="pascom-secondary" onClick={resetAll}>Enviar outro evento</button>
        </div>
      </section>
    );
  }

  const uploading = phase === 'enviando';
  const shownItems = items.slice(0, visibleThumbs);

  return (
    <section className="pascom-card pascom-upload">
      <div className="pascom-toolbar">
        <div>
          <span className="pascom-eyebrow">Enviar fotos</span>
          <h2>Novo evento no Drive</h2>
        </div>
        {storage?.limite > 0 && (
          <p className="pascom-upload-storage">
            Drive: {formatBytes(storage.usado)} de {formatBytes(storage.limite)} usados
          </p>
        )}
      </div>

      {pending && !envio && (
        <div className="pascom-alert pascom-upload-pending" role="status">
          <span>
            Há um envio não concluído: <strong>{pending.nomePasta}</strong>. Continue e selecione as mesmas fotos —
            as que já chegaram serão puladas.
          </span>
          <div className="pascom-user-actions">
            <button type="button" className="pascom-primary" onClick={resumePending}>Continuar envio</button>
            <button type="button" className="pascom-secondary" onClick={discardPending}>Descartar</button>
          </div>
        </div>
      )}

      {error && <div className="pascom-alert" role="alert">{error}</div>}

      <fieldset className="pascom-upload-step" disabled={locked}>
        <legend><span>1</span> Evento</legend>
        <div className="pascom-upload-fields">
          <label>
            Categoria
            <select value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })} required>
              <option value="">Escolha…</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label>
            Data do evento
            <input type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} required />
          </label>
          <label className="pascom-upload-title">
            Título
            <input
              value={form.titulo}
              maxLength={80}
              placeholder="Ex.: Casamento João e Maria"
              onChange={(event) => setForm({ ...form, titulo: event.target.value })}
              required
            />
          </label>
        </div>
        <p className="pascom-upload-hint">
          {folderName ? <>Pasta no Drive: <code>{envio?.nomePasta || folderName}</code></> : 'Preencha os campos para gerar o nome da pasta.'}
        </p>
      </fieldset>

      <fieldset className="pascom-upload-step" disabled={uploading}>
        <legend><span>2</span> Fotos</legend>
        <label
          className={`pascom-dropzone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}
          />
          <strong>Toque para escolher ou arraste as fotos aqui</strong>
          <span>JPG ou PNG, até 40 MB cada. Os originais vão sem compressão.</span>
        </label>

        {rejected.length > 0 && (
          <ul className="pascom-upload-rejected" aria-label="Arquivos recusados">
            {rejected.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.name}</strong> — {item.reason}</li>)}
          </ul>
        )}

        {items.length > 0 && (
          <>
            <p className="pascom-upload-hint">
              {items.length} foto(s) · {formatBytes(totals.bytes)}.{' '}
              {capaKey ? 'Capa escolhida — toque em outra foto para trocar.' : 'Toque numa foto para escolher a capa do evento.'}
            </p>
            {storageShort && (
              <div className="pascom-alert" role="alert">
                Espaço insuficiente no Drive: faltam {formatBytes(totals.bytes - storage.livre)}. Arquive eventos antigos antes de enviar.
              </div>
            )}
            <ul className="pascom-upload-grid">
              {shownItems.map((item) => (
                <li key={item.key} className={`is-${item.status}`}>
                  <button
                    type="button"
                    className="pascom-upload-thumb"
                    aria-pressed={capaKey === item.key}
                    aria-label={`Usar ${item.name} como capa`}
                    onClick={() => setCapaKey(capaKey === item.key ? '' : item.key)}
                  >
                    {item.preview ? <img src={item.preview} alt="" loading="lazy" decoding="async" /> : <span>{item.name}</span>}
                    {capaKey === item.key && <em className="pascom-upload-capa">Capa</em>}
                  </button>
                  <div className="pascom-upload-meta">
                    <span title={item.name}>{item.name}</span>
                    {!uploading && item.status !== 'concluido' && (
                      <button type="button" aria-label={`Remover ${item.name}`} onClick={() => removeItem(item.key)}>×</button>
                    )}
                  </div>
                  <progress max={item.size} value={item.sent} aria-label={`Progresso de ${item.name}`} />
                  {item.error && <small className="pascom-upload-error">{item.error}</small>}
                </li>
              ))}
            </ul>
            {items.length > visibleThumbs && (
              <button type="button" className="pascom-secondary" onClick={() => setVisibleThumbs(visibleThumbs + THUMBS_PAGE)}>
                Mostrar mais {Math.min(THUMBS_PAGE, items.length - visibleThumbs)} fotos
              </button>
            )}
          </>
        )}
      </fieldset>

      <div className="pascom-upload-footer">
        {(uploading || totals.sent > 0) && (
          <div className="pascom-upload-total" aria-live="polite">
            <progress max={100} value={totals.percent} aria-label="Progresso total" />
            <span>{totals.done} de {items.length} fotos · {totals.percent}%</span>
          </div>
        )}
        <div className="pascom-user-actions">
          {envio && <button type="button" className="pascom-secondary" onClick={cancelUpload}>Cancelar envio</button>}
          <button type="button" className="pascom-primary" disabled={!canStart} onClick={startUpload}>
            {uploading ? 'Enviando… mantenha esta tela aberta' : totals.failed ? 'Tentar de novo' : envio ? 'Continuar envio' : (items.length ? `Enviar ${items.length} fotos` : 'Enviar fotos')}
          </button>
        </div>
      </div>
    </section>
  );
}
