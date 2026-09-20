/* eslint-disable react/prop-types */
import { useState } from 'react';
import { categories } from '../../data/categories.js';
import { pascomCorrigirNomePasta, pascomReprocessarPasta } from '../../lib/api.js';
import LiberarEspacoDialog, { formatBytes } from './LiberarEspacoDialog.jsx';

const ESTADO = {
  ok: { label: 'OK', simbolo: '✓' },
  aviso: { label: 'Atenção', simbolo: '!' },
  erro: { label: 'Impede vendas', simbolo: '×' },
};

const horaFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function quando(iso) {
  const data = new Date(iso || '');
  return Number.isNaN(data.getTime()) ? '' : horaFormat.format(data);
}

function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`;
}

function Resumo({ resumo }) {
  if (!resumo.erros && !resumo.avisos) return <strong>Tudo pronto para vender</strong>;
  const partes = [];
  if (resumo.erros) partes.push(plural(resumo.erros, 'item impede vendas', 'itens impedem vendas'));
  if (resumo.avisos) partes.push(plural(resumo.avisos, 'aviso', 'avisos'));
  return <strong>{partes.join(' · ')}</strong>;
}

function ItemChecklist({ item }) {
  const [aberto, setAberto] = useState(item.estado === 'erro');
  const estado = ESTADO[item.estado] || ESTADO.aviso;
  return (
    <li className={`pascom-check-item is-${item.estado}`}>
      <span className="pascom-check-icon" aria-hidden="true">{estado.simbolo}</span>
      <div className="pascom-check-body">
        <div className="pascom-check-head">
          <span>{item.titulo}</span>
          <span className="pascom-check-state">{estado.label}</span>
        </div>
        {item.orientacao && (
          <>
            <button type="button" className="pascom-link" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
              {aberto ? 'Ocultar como corrigir' : 'Como corrigir'}
            </button>
            {aberto && <p className="pascom-check-help">{item.orientacao}</p>}
          </>
        )}
      </div>
    </li>
  );
}

function Grupo({ grupo, itens }) {
  const [mostrarOk, setMostrarOk] = useState(false);
  const problemas = itens.filter((item) => item.estado !== 'ok');
  const ok = itens.filter((item) => item.estado === 'ok');
  const visiveis = mostrarOk ? itens : problemas;
  return (
    <section className="pascom-check-group" aria-labelledby={`grupo-${grupo.id}`}>
      <h3 id={`grupo-${grupo.id}`}>
        {grupo.titulo}
        {!problemas.length && <span className="pascom-badge is-ok">Tudo certo</span>}
      </h3>
      {visiveis.length > 0 && <ul className="pascom-check-list">{visiveis.map((item) => <ItemChecklist key={item.id} item={item} />)}</ul>}
      {ok.length > 0 && problemas.length > 0 && (
        <button type="button" className="pascom-link" onClick={() => setMostrarOk(!mostrarOk)}>
          {mostrarOk ? 'Ocultar itens em ordem' : `Ver ${plural(ok.length, 'item em ordem', 'itens em ordem')}`}
        </button>
      )}
      {!problemas.length && (
        <button type="button" className="pascom-link" onClick={() => setMostrarOk(!mostrarOk)}>
          {mostrarOk ? 'Ocultar detalhes' : `Ver ${plural(ok.length, 'verificação', 'verificações')}`}
        </button>
      )}
    </section>
  );
}

function motivoQuarentena(pasta) {
  const partes = [];
  if (pasta.nomeValido === false) partes.push('nome fora do padrão categoria__AAAA-MM-DD__titulo');
  if (pasta.falhas > 0) partes.push(plural(pasta.falhas, 'foto falhou 3 vezes', 'fotos falharam 3 vezes'));
  return partes.join(' · ') || 'erro no processamento';
}

/** Uma pasta em quarentena: tentar de novo ou corrigir o nome, sem abrir o Drive. */
function PastaQuarentena({ pasta, getToken, onResolvida }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ categoria: categories[0]?.id || '', data: '', titulo: '' });
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');

  const executar = async (acao) => {
    setBusy(true);
    setErro('');
    try {
      const resultado = await acao(await getToken());
      onResolvida(`${resultado.nomePasta || pasta.nome} voltou para a fila. O processamento tenta de novo em até 5 minutos.`);
    } catch (cause) {
      setErro(cause.message);
    } finally {
      setBusy(false);
    }
  };

  const corrigir = (event) => {
    event.preventDefault();
    executar((token) => pascomCorrigirNomePasta(token, pasta.folderId, form));
  };

  return (
    <li className="pascom-quarentena-item">
      <div>
        <strong className="pascom-break">{pasta.nome}</strong>
        <small>{motivoQuarentena(pasta)} · desde {quando(pasta.desde)}</small>
      </div>
      {pasta.folderId && !editando && (
        <div className="pascom-user-actions">
          {pasta.nomeValido === false ? (
            <button type="button" className="pascom-primary" onClick={() => setEditando(true)} disabled={busy}>Corrigir o nome</button>
          ) : (
            <button type="button" className="pascom-primary" disabled={busy}
              onClick={() => executar((token) => pascomReprocessarPasta(token, pasta.folderId))}>
              {busy ? 'Enviando…' : 'Tentar de novo'}
            </button>
          )}
        </div>
      )}
      {editando && (
        <form className="pascom-upload-fields pascom-quarentena-form" onSubmit={corrigir}>
          <label>Categoria
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label>Data do evento
            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
          </label>
          <label className="pascom-upload-title">Título
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} minLength={3} maxLength={80} required />
          </label>
          <div className="pascom-user-actions pascom-upload-title">
            <button type="submit" className="pascom-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e processar'}</button>
            <button type="button" className="pascom-secondary" onClick={() => setEditando(false)} disabled={busy}>Cancelar</button>
          </div>
        </form>
      )}
      {erro && <div className="pascom-alert" role="alert">{erro}</div>}
    </li>
  );
}

const PASTAS = [['originais', 'Originais'], ['previas', 'Prévias'], ['miniaturas', 'Miniaturas']];

function Armazenamento({ armazenamento }) {
  if (!armazenamento) {
    return <p className="pascom-empty">O espaço do Drive aparece quando o painel conseguir falar com o Apps Script.</p>;
  }
  const { usado, limite, livre } = armazenamento;
  const uso = limite > 0 ? Math.min(usado / limite, 1) : 0;
  const tom = uso >= 0.95 ? 'erro' : uso >= 0.8 ? 'aviso' : 'ok';
  const pastas = armazenamento.pastas?.pastas || {};
  return (
    <div className="pascom-storage">
      <div className="pascom-storage-head">
        <strong>{formatBytes(usado)}</strong>
        <span>de {limite > 0 ? formatBytes(limite) : 'espaço ilimitado'} · {Math.round(uso * 100)}% usado</span>
      </div>
      <div className={`pascom-storage-bar is-${tom}`} role="meter" aria-label="Uso do Drive" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uso * 100)}>
        <span style={{ width: `${Math.max(uso * 100, 1)}%` }} />
      </div>
      <dl className="pascom-storage-split">
        {PASTAS.filter(([id]) => pastas[id]).map(([id, label]) => (
          <div key={id}><dt>{label}</dt><dd>{formatBytes(pastas[id].bytes)}</dd></div>
        ))}
        {livre !== null && livre !== undefined && <div><dt>Livre</dt><dd>{formatBytes(livre)}</dd></div>}
      </dl>
      {armazenamento.cabemEventos !== null && armazenamento.cabemEventos !== undefined && (
        <p className="pascom-upload-hint">
          Um evento ocupa em média {formatBytes(armazenamento.mediaPorEvento)}:{' '}
          {armazenamento.cabemEventos > 0
            ? `cabem mais uns ${plural(armazenamento.cabemEventos, 'evento', 'eventos')}.`
            : 'não cabe outro evento desse tamanho. Libere espaço antes do próximo envio.'}
        </p>
      )}
      {armazenamento.pastas?.calculadoEm && (
        <p className="pascom-upload-hint">
          Divisão por pasta calculada em {quando(armazenamento.pastas.calculadoEm)}{armazenamento.pastas.completo === false ? ' (parcial)' : ''}.
        </p>
      )}
    </div>
  );
}

export default function SistemaTab({ getToken, sistema, loading, error, onReload }) {
  const [liberando, setLiberando] = useState(null);
  const [aviso, setAviso] = useState('');

  if (!sistema) {
    return (
      <section className="pascom-card pascom-sistema">
        <span className="pascom-eyebrow">Sistema</span>
        <h2>Saúde do sistema</h2>
        {loading && <p role="status">Verificando pagamentos, planilha, Drive e automação…</p>}
        {error && <div className="pascom-alert" role="alert">{error}</div>}
        {error && <button type="button" className="pascom-secondary" onClick={onReload}>Tentar de novo</button>}
      </section>
    );
  }

  const tom = sistema.resumo.erros ? 'erro' : sistema.resumo.avisos ? 'aviso' : 'ok';
  const arquivados = sistema.arquivados || [];

  return (
    <div className="pascom-sistema">
      <section className={`pascom-card pascom-sistema-resumo is-${tom}`} aria-live="polite">
        <div>
          <span className="pascom-eyebrow">Sistema</span>
          <h2><Resumo resumo={sistema.resumo} /></h2>
          <p className="pascom-upload-hint">
            Verificado em {quando(sistema.verificadoEm)}
            {sistema.ultimaExecucao?.fim ? ` · processamento automático rodou em ${quando(sistema.ultimaExecucao.fim)}` : ''}
          </p>
        </div>
        <button type="button" className="pascom-secondary" onClick={onReload} disabled={loading}>
          {loading ? 'Verificando…' : 'Verificar de novo'}
        </button>
      </section>

      {error && <div className="pascom-alert" role="alert">{error}</div>}

      <section className="pascom-card pascom-sistema-checklist" aria-label="Checklist de produção">
        {sistema.grupos
          .map((grupo) => ({ grupo, itens: sistema.itens.filter((item) => item.grupo === grupo.id) }))
          .filter(({ itens }) => itens.length)
          .map(({ grupo, itens }) => <Grupo key={grupo.id} grupo={grupo} itens={itens} />)}
      </section>

      <section className="pascom-card pascom-sistema-espaco" aria-labelledby="pascom-espaco">
        <span className="pascom-eyebrow">Google Drive</span>
        <h2 id="pascom-espaco">Espaço</h2>
        <Armazenamento armazenamento={sistema.armazenamento} />

        <h3>Eventos arquivados</h3>
        {arquivados.length === 0 && (
          <p className="pascom-empty">Nenhum evento arquivado. Arquive eventos antigos na aba Eventos para poder liberar espaço.</p>
        )}
        {arquivados.length > 0 && (
          <ul className="pascom-archive-list">
            {arquivados.map((evento) => (
              <li key={evento.eventoId}>
                <div>
                  <strong>{evento.title}</strong>
                  <small>
                    {[evento.dateLabel, evento.totalFotos ? `${evento.totalFotos} fotos` : ''].filter(Boolean).join(' · ')}
                  </small>
                </div>
                {evento.espacoLiberacao === 'concluida' ? (
                  <span className="pascom-badge is-muted">Arquivos removidos · {formatBytes(evento.espacoLiberadoBytes)}</span>
                ) : (
                  <button type="button" className="pascom-secondary" onClick={() => setLiberando(evento)} disabled={!sistema.appsScriptDisponivel}>
                    {evento.espacoLiberacao === 'parcial' ? 'Continuar liberação' : 'Liberar espaço'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pascom-card pascom-sistema-quarentena" aria-labelledby="pascom-quarentena">
        <span className="pascom-eyebrow">Fotos_Origem</span>
        <h2 id="pascom-quarentena">Pastas em quarentena</h2>
        {aviso && <div className="pascom-alert success" role="status">{aviso}</div>}
        {!sistema.quarentena?.length && (
          <p className="pascom-empty">
            {sistema.appsScriptDisponivel ? 'Nenhuma pasta com erro.' : 'Aparece quando o painel conseguir falar com o Apps Script.'}
          </p>
        )}
        {sistema.quarentena?.length > 0 && (
          <>
            <p>
              O processamento não conseguiu terminar estas pastas. As fotos boas de cada evento já estão prontas;
              aqui você manda as que falharam de novo para a fila ou corrige um nome fora do padrão.
            </p>
            <ul className="pascom-archive-list">
              {sistema.quarentena.map((pasta) => (
                <PastaQuarentena key={pasta.folderId || pasta.nome} pasta={pasta} getToken={getToken}
                  onResolvida={(texto) => { setAviso(texto); onReload(); }} />
              ))}
            </ul>
          </>
        )}
      </section>

      {liberando && (
        <LiberarEspacoDialog
          getToken={getToken}
          evento={liberando}
          onClose={() => { setLiberando(null); onReload(); }}
        />
      )}
    </div>
  );
}
