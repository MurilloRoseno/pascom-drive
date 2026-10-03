import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { obterFaq } from '../lib/api.js';
import AssistenteChat from '../components/AssistenteChat.jsx';
import '../shared/ajuda-agenda.css';

/** Minúsculas e sem acento, para a busca achar "pagamento" digitando "pagaménto". */
const simples = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Pergunta({ item, aberta, onAlternar }) {
  const ref = useRef(null);
  useEffect(() => {
    if (aberta) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [aberta]);

  return (
    <details ref={ref} open={aberta} onToggle={(e) => { if (e.currentTarget.open !== aberta) onAlternar(item.id, e.currentTarget.open); }} className="aa-pergunta" id={`faq-${item.id}`}>
      <summary>{item.pergunta}</summary>
      <div className="aa-resposta">
        <p>{item.resposta}</p>
        {item.passos.length > 0 && (
          <ol>
            {item.passos.map((p) => <li key={p}>{p}</li>)}
          </ol>
        )}
        {item.imagem && (
          <figure>
            <img src={item.imagem} alt={item.imagemLegenda || item.pergunta} loading="lazy" />
            {item.imagemLegenda && <figcaption>{item.imagemLegenda}</figcaption>}
          </figure>
        )}
        {item.video && (
          <p className="aa-video">
            <a className="aa-link" href={item.video} target="_blank" rel="noopener noreferrer">
              ▶ Assistir ao vídeo{item.videoTitulo ? `: ${item.videoTitulo}` : ''}
            </a>
          </p>
        )}
      </div>
    </details>
  );
}

Pergunta.propTypes = {
  item: PropTypes.object.isRequired,
  aberta: PropTypes.bool,
  onAlternar: PropTypes.func.isRequired,
};

/** /ajuda: Central de Ajuda com busca, assuntos, passo a passo e o assistente. */
export default function AjudaPage({ mobile = false }) {
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [busca, setBusca] = useState('');
  const [tema, setTema] = useState(null);
  const [params] = useSearchParams();
  const [abertas, setAbertas] = useState(() => new Set(params.get('pergunta') ? [params.get('pergunta')] : []));

  useEffect(() => {
    let ativo = true;
    obterFaq()
      .then((d) => ativo && setEstado({ fase: 'ok', ...d }))
      .catch((e) => ativo && setEstado({ fase: 'erro', mensagem: e.message }));
    return () => { ativo = false; };
  }, []);

  const filtradas = useMemo(() => {
    if (estado.fase !== 'ok') return [];
    const termo = simples(busca).trim();
    return estado.perguntas.filter((p) => (!tema || p.tema === tema)
      && (!termo || simples(`${p.pergunta} ${p.resposta} ${p.passos.join(' ')}`).includes(termo)));
  }, [estado, busca, tema]);

  function alternar(id, aberta) {
    setAbertas((s) => { const n = new Set(s); if (aberta) n.add(id); else n.delete(id); return n; });
  }

  function abrirPergunta(id) {
    setBusca('');
    setTema(null);
    setAbertas((s) => new Set(s).add(id));
  }

  const conteudo = (
    <section className={`aa aa-pagina${mobile ? '' : ' aa-pagina--solta'}`}>
      <div className="aa-conteudo">
        <h1 className="aa-h1">Central de Ajuda</h1>
        <p className="aa-lead">Veja as dúvidas mais comuns sobre comprar, pagar e baixar suas fotos.</p>

        {estado.fase === 'carregando' && <p role="status" className="aa-estado">Carregando a ajuda…</p>}
        {estado.fase === 'erro' && <p role="alert" className="aa-estado">Não foi possível carregar a ajuda agora. Tente de novo em instantes.</p>}

        {estado.fase === 'ok' && (
          <div className="aa-pilha">
            {estado.assistenteAtivo && <AssistenteChat onAbrirPergunta={abrirPergunta} />}

            <div>
              <label htmlFor="busca-ajuda" className="aa-sr">Buscar na ajuda</label>
              <input id="busca-ajuda" type="search" className="aa-input" placeholder="Buscar na ajuda (ex.: pagamento, baixar, prazo)" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <div className="aa-chips" role="group" aria-label="Filtrar por assunto">
                {[{ id: null, nome: 'Todos' }, ...estado.temas.filter((t) => estado.perguntas.some((p) => p.tema === t.id))].map((t) => (
                  <button key={t.id ?? 'todos'} type="button" aria-pressed={tema === t.id} onClick={() => setTema(t.id)} className="aa-chip">
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="aa-pilha--curta">
              {filtradas.length === 0 ? (
                <p className="aa-muda">Nenhuma pergunta encontrada. Tente outra palavra ou pergunte ao assistente.</p>
              ) : filtradas.map((p) => <Pergunta key={p.id} item={p} aberta={abertas.has(p.id)} onAlternar={alternar} />)}
            </div>

            <div className="aa-nao-resolveu">
              <h2 className="aa-h2">Não resolveu?</h2>
              {estado.whatsapp ? (
                <p>
                  Fale com a secretaria da paróquia pelo{' '}
                  <a className="aa-link" href={`https://wa.me/${estado.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>.
                </p>
              ) : (
                <p>Procure a secretaria da paróquia, no horário de atendimento.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return mobile ? <div className="scroll">{conteudo}</div> : conteudo;
}

AjudaPage.propTypes = { mobile: PropTypes.bool };
