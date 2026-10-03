import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { perguntarAoAssistente } from '../lib/api.js';

const SUGESTOES = ['Quanto custa uma foto?', 'Como compro uma foto?', 'Como baixo minhas fotos?'];

/**
 * Chat do assistente da Central de Ajuda. Sem histórico entre visitas: as mensagens
 * vivem só nesta tela. Cada resposta mostra de onde veio.
 * @param {{ onAbrirPergunta?: (id: string) => void }} props
 */
export default function AssistenteChat({ onAbrirPergunta }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fim = useRef(null);

  async function enviar(pergunta) {
    const limpa = pergunta.trim();
    if (limpa.length < 2 || enviando) return;
    setMensagens((m) => [...m, { autor: 'visitante', texto: limpa }]);
    setTexto('');
    setEnviando(true);
    try {
      const r = await perguntarAoAssistente(limpa);
      setMensagens((m) => [...m, { autor: 'assistente', texto: r.resposta, fonte: r.fonte, relacionadas: r.relacionadas }]);
    } catch (err) {
      setMensagens((m) => [...m, { autor: 'assistente', texto: err.message || 'Não consegui responder agora.', fonte: 'Aviso', erro: true }]);
    } finally {
      setEnviando(false);
      setTimeout(() => fim.current?.scrollIntoView?.({ block: 'nearest' }), 0);
    }
  }

  return (
    <section aria-labelledby="titulo-assistente" className="card" id="assistente">
      <h2 id="titulo-assistente" className="font-display font-bold" style={{ fontSize: 'var(--text-xl)', color: 'var(--photo-primary)' }}>
        Pergunte ao assistente
      </h2>
      <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>
        Ele responde só com as informações do site da paróquia. Nunca digite cartão, CPF ou senha.
      </p>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversa com o assistente"
        className="mt-4 space-y-3"
        style={{ maxHeight: 360, overflowY: 'auto' }}
      >
        {mensagens.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" onClick={() => enviar(s)} className="btn btn-outline" style={{ fontSize: 'var(--text-sm)' }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === 'visitante' ? 'text-right' : ''}>
            <div
              className="inline-block rounded-xl p-3 text-left"
              style={{
                maxWidth: '92%',
                whiteSpace: 'pre-line',
                fontSize: 'var(--text-base)',
                background: m.autor === 'visitante' ? 'var(--photo-primary)' : m.erro ? 'rgba(163,63,32,0.10)' : 'var(--photo-paper)',
                color: m.autor === 'visitante' ? 'white' : 'var(--photo-ink)',
                border: m.autor === 'visitante' ? 'none' : '1px solid rgba(109,32,119,0.12)',
              }}
            >
              {m.texto}
            </div>
            {m.fonte && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--photo-sepia)', marginTop: '0.25rem' }}>{m.fonte}</p>}
            {m.relacionadas && m.relacionadas.length > 0 && onAbrirPergunta && (
              <p style={{ fontSize: 'var(--text-sm)', marginTop: '0.25rem' }}>
                Veja também:{' '}
                {m.relacionadas.map((r) => (
                  <button key={r.id} type="button" onClick={() => onAbrirPergunta(r.id)} style={{ color: 'var(--photo-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', marginRight: '0.75rem' }}>
                    {r.pergunta}
                  </button>
                ))}
              </p>
            )}
          </div>
        ))}
        {enviando && <p role="status" style={{ color: 'var(--photo-sepia)', fontSize: 'var(--text-sm)' }}>Procurando a resposta…</p>}
        <div ref={fim} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="mt-4 flex gap-2">
        <label htmlFor="pergunta-assistente" className="sr-only">Sua pergunta</label>
        <input
          id="pergunta-assistente"
          className="input-field"
          style={{ flex: 1 }}
          value={texto}
          maxLength={300}
          placeholder="Escreva sua dúvida"
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={enviando || texto.trim().length < 2}>
          Enviar
        </button>
      </form>
    </section>
  );
}

AssistenteChat.propTypes = { onAbrirPergunta: PropTypes.func };
