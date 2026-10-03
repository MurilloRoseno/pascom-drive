import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Botao, Campo, CLASSE_INPUT, Cartao, Pilula, useToast,
} from '../ui.jsx';
import EditorFaq from '../components/EditorFaq.jsx';

function Cobertura({ temas, perguntas }) {
  const publicadas = (id) => perguntas.filter((p) => p.tema === id && p.publicada).length;
  const maximo = Math.max(1, ...temas.map((t) => publicadas(t.id)));
  return (
    <Cartao titulo="Cobertura por tema" descricao="Quantas respostas publicadas cada assunto tem. Tema vazio é onde a ajuda ainda não resolve.">
      <ul className="space-y-2">
        {temas.map((t) => (
          <li key={t.id} className="grid items-center gap-3" style={{ gridTemplateColumns: '9rem 1fr 4rem' }}>
            <span className="text-body-sm">{t.nome}</span>
            <span className="h-3 rounded-full bg-painel-divisor" aria-hidden="true">
              <span className="block h-3 rounded-full bg-photo-primary" style={{ width: `${(publicadas(t.id) / maximo) * 100}%` }} />
            </span>
            <span className="font-mono text-caption text-painel-texto2">{publicadas(t.id)} resp.</span>
          </li>
        ))}
      </ul>
    </Cartao>
  );
}

export default function Ajuda() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [tema, setTema] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [nova, setNova] = useState(null); // {tema, pergunta} enquanto o formulário de nova pergunta está aberto
  const [erroNova, setErroNova] = useState('');

  const perm = {
    criar: membro.permissoes.includes('ajuda.criar'),
    editar: membro.permissoes.includes('ajuda.editar'),
    excluir: membro.permissoes.includes('ajuda.excluir'),
  };

  const carregar = useCallback(async () => {
    try {
      setEstado({ fase: 'ok', ...(await chamar('/api/pascom/faq')) });
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando a Central de Ajuda…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar a Central de Ajuda.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  async function criar(corpo) {
    try {
      const f = await chamar('/api/pascom/faq', { method: 'POST', body: corpo });
      avisar('Rascunho criado: escreva a resposta.');
      setNova(null);
      setErroNova('');
      await carregar();
      setSelecionada(f.id);
    } catch (e) {
      setErroNova(e.message);
      avisar(e.message);
    }
  }

  const { temas, perguntas, semResposta } = estado;
  const lista = perguntas.filter((p) => !tema || p.tema === tema);
  const atual = perguntas.find((p) => p.id === selecionada);

  return (
    <div className="space-y-6">
      <Cobertura temas={temas} perguntas={perguntas} />

      {semResposta.length > 0 && (
        <Cartao titulo="Perguntas que o assistente não soube responder" descricao="Viram rascunho de FAQ com um clique; escreva a resposta e publique.">
          <ul className="divide-y divide-painel-divisor">
            {semResposta.map((p) => (
              <li key={p} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>“{p}”</span>
                {perm.criar && (
                  <Botao variante="secundario" aria-label={`Criar FAQ para: ${p}`} onClick={() => criar({ tema: 'problemas', pergunta: p, daPergunta: p })}>
                    Criar FAQ
                  </Botao>
                )}
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao titulo="Perguntas">
        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tema">
          {[{ id: null, nome: 'Todas' }, ...temas].map((t) => {
            const total = t.id ? perguntas.filter((p) => p.tema === t.id).length : perguntas.length;
            return (
              <button
                key={t.id ?? 'todas'}
                type="button"
                aria-pressed={tema === t.id}
                onClick={() => setTema(t.id)}
                className={`min-h-[44px] rounded-full border px-4 text-body-sm font-semibold ${tema === t.id ? 'border-photo-primary bg-photo-primary text-white' : 'border-painel-borda bg-white'}`}
              >
                {t.nome} · {total}
              </button>
            );
          })}
          {perm.criar && <Botao variante="dourado" className="ml-auto" onClick={() => setNova({ tema: 'comprar', pergunta: '' })}>+ Nova pergunta</Botao>}
        </div>

        {nova && (
          <form
            className="mb-4 space-y-3 rounded-[10px] bg-painel-cabecalho p-4"
            onSubmit={(e) => { e.preventDefault(); criar(nova); }}
            noValidate
          >
            <Campo rotulo="Tema" htmlFor="nova-tema">
              <select id="nova-tema" className={CLASSE_INPUT} value={nova.tema} onChange={(e) => setNova({ ...nova, tema: e.target.value })}>
                {temas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Pergunta" htmlFor="nova-pergunta" erro={erroNova}>
              <input id="nova-pergunta" className={CLASSE_INPUT} maxLength={200} value={nova.pergunta} onChange={(e) => { setNova({ ...nova, pergunta: e.target.value }); setErroNova(''); }} />
            </Campo>
            <div className="flex gap-3">
              <Botao type="submit">Criar rascunho</Botao>
              <Botao variante="secundario" onClick={() => { setNova(null); setErroNova(''); }}>Cancelar</Botao>
            </div>
          </form>
        )}

        {lista.length === 0 ? (
          <p className="text-painel-texto2">Nenhuma pergunta neste tema ainda.</p>
        ) : (
          <ul className="divide-y divide-painel-divisor">
            {lista.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={selecionada === p.id}
                  onClick={() => setSelecionada(p.id)}
                  className={`flex w-full min-h-[56px] flex-wrap items-center justify-between gap-2 px-2 py-3 text-left ${selecionada === p.id ? 'bg-painel-selecionado' : 'hover:bg-painel-cabecalho'}`}
                >
                  <span>
                    <span className="block font-semibold">{p.pergunta}</span>
                    <span className="block text-caption text-painel-texto2">
                      {temas.find((t) => t.id === p.tema)?.nome}
                      {p.passos.length > 0 ? ' · passo a passo' : ''}{p.imagem ? ' · imagem' : ''}{p.video ? ' · vídeo' : ''}
                    </span>
                  </span>
                  <Pilula tom={p.publicada ? 'verde' : 'cinza'}>{p.publicada ? 'Publicada' : 'Rascunho'}</Pilula>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {atual && (
        <EditorFaq
          key={atual.id}
          faq={atual}
          temas={temas}
          perm={perm}
          onSalvo={(f) => setEstado((s) => ({ ...s, perguntas: s.perguntas.map((p) => (p.id === f.id ? f : p)) }))}
          onExcluida={(id) => { setSelecionada(null); setEstado((s) => ({ ...s, perguntas: s.perguntas.filter((p) => p.id !== id) })); }}
        />
      )}
    </div>
  );
}
