import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { obterFaq } from '../lib/api.js';
import AssistenteChat from '../components/AssistenteChat.jsx';

/** Minúsculas e sem acento, para a busca achar "pagamento" digitando "pagaménto". */
const simples = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function Pergunta({ item, aberta, onAlternar }) {
  const ref = useRef(null);
  useEffect(() => {
    if (aberta) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [aberta]);

  return (
    <details ref={ref} open={aberta} onToggle={(e) => { if (e.currentTarget.open !== aberta) onAlternar(item.id, e.currentTarget.open); }} className="card" id={`faq-${item.id}`}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-lg)', minHeight: 'var(--touch-sm)', color: 'var(--photo-ink)' }}>
        {item.pergunta}
      </summary>
      <div className="mt-3" style={{ fontSize: 'var(--text-base)' }}>
        <p style={{ whiteSpace: 'pre-line' }}>{item.resposta}</p>
        {item.passos.length > 0 && (
          <ol className="mt-3 space-y-2" style={{ paddingLeft: '1.25rem', listStyle: 'decimal' }}>
            {item.passos.map((p) => <li key={p}>{p}</li>)}
          </ol>
        )}
        {item.imagem && (
          <figure className="mt-3">
            <img src={item.imagem} alt={item.imagemLegenda || item.pergunta} loading="lazy" style={{ maxWidth: '100%', borderRadius: 8 }} />
            {item.imagemLegenda && <figcaption style={{ fontSize: 'var(--text-sm)', color: 'var(--photo-grafite)' }}>{item.imagemLegenda}</figcaption>}
          </figure>
        )}
        {item.video && (
          <p className="mt-3">
            <a href={item.video} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--photo-primary)', textDecoration: 'underline' }}>
              ▶ Assistir ao vídeo{item.videoTitulo ? `: ${item.videoTitulo}` : ''}
            </a>
          </p>
        )}
      </div>
    </details>
  );
}

/** /ajuda — Central de Ajuda: busca, temas, passo a passo e o assistente. */
export default function AjudaPage() {
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

  return (
    <section className="py-6" style={{ background: 'var(--photo-paper)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="font-display font-bold" style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-3xl)' }}>Central de Ajuda</h1>
        <p className="mt-1 mb-6" style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
          Veja as dúvidas mais comuns sobre comprar, pagar e baixar suas fotos.
        </p>

        {estado.fase === 'carregando' && <p role="status" style={{ fontSize: 'var(--text-base)' }}>Carregando a ajuda…</p>}
        {estado.fase === 'erro' && <p role="alert" style={{ fontSize: 'var(--text-base)' }}>Não foi possível carregar a ajuda agora. Tente de novo em instantes.</p>}

        {estado.fase === 'ok' && (
          <div className="space-y-6">
            {estado.assistenteAtivo && <AssistenteChat onAbrirPergunta={abrirPergunta} />}

            <div>
              <label htmlFor="busca-ajuda" className="sr-only">Buscar na ajuda</label>
              <input id="busca-ajuda" type="search" className="input-field" placeholder="Buscar na ajuda (ex.: pagamento, baixar, prazo)" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <div className="flex gap-2 overflow-x-auto mt-3" role="group" aria-label="Filtrar por assunto" style={{ padding: '0.25rem 0' }}>
                {[{ id: null, nome: 'Todos' }, ...estado.temas.filter((t) => estado.perguntas.some((p) => p.tema === t.id))].map((t) => (
                  <button
                    key={t.id ?? 'todos'} type="button" aria-pressed={tema === t.id} onClick={() => setTema(t.id)}
                    className="flex-shrink-0 rounded-full font-semibold whitespace-nowrap"
                    style={{
                      minHeight: 'var(--touch-sm)', padding: '0 1.1rem', fontSize: 'var(--text-sm)', cursor: 'pointer',
                      background: tema === t.id ? 'var(--photo-primary)' : 'white',
                      color: tema === t.id ? 'white' : 'var(--photo-primary)',
                      border: `2px solid ${tema === t.id ? 'var(--photo-primary)' : 'rgba(109,32,119,0.35)'}`,
                    }}
                  >
                    {t.nome}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filtradas.length === 0 ? (
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--photo-grafite)' }}>
                  Nenhuma pergunta encontrada. Tente outra palavra ou pergunte ao assistente.
                </p>
              ) : filtradas.map((p) => <Pergunta key={p.id} item={p} aberta={abertas.has(p.id)} onAlternar={alternar} />)}
            </div>

            <div className="bloco bloco--roxo">
              <div className="bloco__titulo">Não resolveu?</div>
              {estado.whatsapp ? (
                <p style={{ fontSize: 'var(--text-base)' }}>
                  Fale com a secretaria da paróquia pelo{' '}
                  <a href={`https://wa.me/${estado.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--photo-primary)', textDecoration: 'underline', fontWeight: 700 }}>WhatsApp</a>.
                </p>
              ) : (
                <p style={{ fontSize: 'var(--text-base)' }}>Procure a secretaria da paróquia, no horário de atendimento.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
