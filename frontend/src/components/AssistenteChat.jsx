import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { perguntarAoAssistente } from '../lib/api.js';
import '../shared/ajuda-agenda.css';

const SUGESTOES = ['Quanto custa uma foto?', 'Como compro uma foto?', 'Como baixo minhas fotos?'];

/**
 * Chat do assistente da Central de Ajuda. Sem histórico entre visitas: as mensagens
 * vivem só nesta tela. Cada resposta mostra de onde veio.
 * @param {{ onAbrirPergunta?: (id: string) => void, titulo?: boolean }} props
 */
export default function AssistenteChat({ onAbrirPergunta, titulo = true }) {
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
    <section aria-labelledby="titulo-assistente" className="aa aa-card" id="assistente">
      <h2 id="titulo-assistente" className={titulo ? 'aa-h2' : 'aa-sr'}>Pergunte ao assistente</h2>
      <p className="aa-chat-sub">
        Ele responde só com as informações do site da paróquia. Nunca digite cartão, CPF ou senha.
      </p>

      <div role="log" aria-live="polite" aria-label="Conversa com o assistente" className="aa-chat-log">
        {mensagens.length === 0 && (
          <div className="aa-sugestoes">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" onClick={() => enviar(s)} className="aa-btn">{s}</button>
            ))}
          </div>
        )}
        {mensagens.map((m, i) => (
          <div key={i} className={m.autor === 'visitante' ? 'aa-msg--eu' : ''}>
            <div className={`aa-bolha${m.autor === 'visitante' ? ' aa-bolha--eu' : ''}${m.erro ? ' aa-bolha--erro' : ''}`}>
              {m.texto}
            </div>
            {m.fonte && <p className="aa-fonte">{m.fonte}</p>}
            {m.relacionadas && m.relacionadas.length > 0 && onAbrirPergunta && (
              <p className="aa-relacionadas">
                Veja também:{' '}
                {m.relacionadas.map((r) => (
                  <button key={r.id} type="button" onClick={() => onAbrirPergunta(r.id)} className="aa-link">
                    {r.pergunta}
                  </button>
                ))}
              </p>
            )}
          </div>
        ))}
        {enviando && <p role="status" className="aa-muda">Procurando a resposta…</p>}
        <div ref={fim} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="aa-chat-form">
        <label htmlFor="pergunta-assistente" className="aa-sr">Sua pergunta</label>
        <input
          id="pergunta-assistente"
          className="aa-input"
          value={texto}
          maxLength={300}
          placeholder="Escreva sua dúvida"
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" className="aa-btn aa-btn--primario" disabled={enviando || texto.trim().length < 2}>
          Enviar
        </button>
      </form>
    </section>
  );
}

AssistenteChat.propTypes = { onAbrirPergunta: PropTypes.func, titulo: PropTypes.bool };
