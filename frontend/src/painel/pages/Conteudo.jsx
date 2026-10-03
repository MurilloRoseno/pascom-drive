import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, useToast,
} from '../ui.jsx';

const GRUPOS = [
  {
    titulo: 'Identidade',
    campos: [
      { chave: 'nome', rotulo: 'Nome da paróquia', max: 80 },
      { chave: 'cidade', rotulo: 'Cidade e estado', max: 80 },
      { chave: 'lema', rotulo: 'Lema do site (opcional)', max: 120 },
    ],
  },
  {
    titulo: 'Contato',
    campos: [
      { chave: 'email', rotulo: 'E-mail da secretaria', tipo: 'email', max: 120 },
      { chave: 'whatsapp', rotulo: 'WhatsApp da secretaria (opcional)', tipo: 'tel', ajuda: 'Com DDD. Em branco = não mostrar.' },
      { chave: 'endereco', rotulo: 'Endereço', tipo: 'area', max: 200 },
      { chave: 'horario', rotulo: 'Horário da secretaria', max: 120 },
    ],
  },
  {
    titulo: 'Redes sociais',
    campos: [
      { chave: 'instagram', rotulo: 'Instagram (opcional)', tipo: 'url', ajuda: 'Link do instagram.com, começando com https://' },
      { chave: 'facebook', rotulo: 'Facebook (opcional)', tipo: 'url', ajuda: 'Link do facebook.com, começando com https://' },
      { chave: 'youtube', rotulo: 'YouTube (opcional)', tipo: 'url', ajuda: 'Link do youtube.com ou youtu.be, começando com https://' },
    ],
  },
  {
    titulo: 'Rodapé',
    campos: [
      { chave: 'versiculo', rotulo: 'Versículo do rodapé (opcional)', tipo: 'area', max: 200 },
      { chave: 'referencia', rotulo: 'Referência do versículo (opcional)', max: 60 },
    ],
  },
];
const SIMPLES = GRUPOS.flatMap((g) => g.campos);

const limpo = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
/** WhatsApp para mostrar: sem o 55 do começo. */
const semDDI = (v) => { const d = digitos(v); return d.length >= 12 ? d.slice(2) : d; };
const mesmoTelefone = (a, b) => semDDI(a) === semDDI(b);

/** O que o servidor guarda -> o que os campos mostram. */
function paraFormulario(c) {
  return {
    ...Object.fromEntries(SIMPLES.map((s) => [s.chave, s.chave === 'whatsapp' ? semDDI(c.whatsapp) : c[s.chave] || ''])),
    missaoTitulo: c.missao ? c.missao.titulo : '',
    missaoTexto: c.missao ? c.missao.paragrafos.join('\n\n') : '',
    numeros: c.numeros.map((n) => ({ ...n })),
    depoimentos: c.depoimentos.map((d) => ({ ...d })),
  };
}

/** O que os campos mostram -> o que o servidor entende (listas e missão já limpas). */
function missaoDoFormulario(f) {
  const titulo = limpo(f.missaoTitulo);
  const paragrafos = String(f.missaoTexto).split(/\n\s*\n/).map(limpo).filter(Boolean);
  return !titulo && paragrafos.length === 0 ? null : { titulo, paragrafos };
}
const numerosDoFormulario = (f) => f.numeros.map((n) => ({ valor: limpo(n.valor), rotulo: limpo(n.rotulo) })).filter((n) => n.valor || n.rotulo);
const depoimentosDoFormulario = (f) => f.depoimentos
  .map((d) => ({ autor: limpo(d.autor), funcao: limpo(d.funcao), texto: limpo(d.texto) }))
  .filter((d) => d.autor || d.funcao || d.texto);

/** Só o que mudou em relação ao que está publicado. */
function alteracoes(f, original) {
  const mudou = {};
  for (const s of SIMPLES) {
    const igual = s.chave === 'whatsapp' ? mesmoTelefone(f.whatsapp, original.whatsapp) : limpo(f[s.chave]) === limpo(original[s.chave]);
    if (!igual) mudou[s.chave] = limpo(f[s.chave]);
  }
  const missao = missaoDoFormulario(f);
  if (JSON.stringify(missao) !== JSON.stringify(original.missao)) mudou.missao = missao;
  const numeros = numerosDoFormulario(f);
  if (JSON.stringify(numeros) !== JSON.stringify(original.numeros)) mudou.numeros = numeros;
  const depoimentos = depoimentosDoFormulario(f);
  if (JSON.stringify(depoimentos) !== JSON.stringify(original.depoimentos)) mudou.depoimentos = depoimentos;
  return mudou;
}

function ListaEditavel({
  titulo, descricao, itens, vazio, max, rotuloAdicionar, onChange, novo, children, desabilitado,
}) {
  const mudar = (i, campo, valor) => onChange(itens.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  return (
    <Cartao titulo={titulo} descricao={descricao}>
      {itens.length === 0 && <p className="mb-3 text-body-sm text-painel-texto2">{vazio}</p>}
      <ul className="space-y-4">
        {itens.map((item, i) => (
          <li key={i} className="rounded-[10px] border border-painel-divisor p-3">
            {children(item, i, (campo, valor) => mudar(i, campo, valor))}
            <Botao className="mt-2" variante="secundario" disabled={desabilitado} onClick={() => onChange(itens.filter((_, j) => j !== i))}>
              Remover {titulo.toLowerCase()} {i + 1}
            </Botao>
          </li>
        ))}
      </ul>
      {itens.length < max && (
        <Botao className="mt-3" variante="secundario" disabled={desabilitado} onClick={() => onChange([...itens, novo()])}>{rotuloAdicionar}</Botao>
      )}
    </Cartao>
  );
}

export default function Conteudo() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const [publicando, setPublicando] = useState(false);
  const podeEditar = membro.permissoes.includes('conteudo.editar');

  const carregar = useCallback(async () => {
    try {
      const c = await chamar('/api/pascom/conteudo');
      setEstado({ fase: 'ok', conteudo: c });
      setForm(paraFormulario(c));
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar o conteúdo do site.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const mudou = alteracoes(form, estado.conteudo);
  const sujo = Object.keys(mudou).length > 0;
  const desabilitado = !podeEditar || publicando;
  const mudar = (chave) => (e) => { setForm((f) => ({ ...f, [chave]: e.target.value })); setErro(''); };

  async function publicar() {
    setPublicando(true);
    try {
      const r = await chamar('/api/pascom/conteudo', { method: 'PUT', body: mudou });
      avisar(`Publicado: ${r.alterados.join(', ')}.`);
      setErro('');
      setEstado({ fase: 'ok', conteudo: r.conteudo });
      setForm(paraFormulario(r.conteudo));
    } catch (e) {
      setErro(e.message);
      avisar(e.message);
    } finally {
      setPublicando(false);
    }
  }

  return (
    <div className="space-y-6">
      {GRUPOS.map((g) => (
        <Cartao key={g.titulo} titulo={g.titulo}>
          <div className="grid gap-4 md:grid-cols-2">
            {g.campos.map((c) => (
              <Campo key={c.chave} rotulo={c.rotulo} htmlFor={`campo-${c.chave}`} ajuda={c.ajuda}>
                {c.tipo === 'area' ? (
                  <textarea id={`campo-${c.chave}`} className={`${CLASSE_INPUT} min-h-[84px] py-2`} maxLength={c.max} value={form[c.chave]} disabled={desabilitado} onChange={mudar(c.chave)} />
                ) : (
                  <input id={`campo-${c.chave}`} type={c.tipo || 'text'} className={CLASSE_INPUT} maxLength={c.max} value={form[c.chave]} disabled={desabilitado} onChange={mudar(c.chave)} />
                )}
              </Campo>
            ))}
          </div>
        </Cartao>
      ))}

      <Cartao titulo="Missão na página inicial" descricao="Em branco, o site mostra o texto que já tem. Separe os parágrafos com uma linha em branco (até 3).">
        <div className="space-y-4">
          <Campo rotulo="Título da missão" htmlFor="campo-missao-titulo">
            <input id="campo-missao-titulo" className={CLASSE_INPUT} maxLength={80} value={form.missaoTitulo} disabled={desabilitado} onChange={mudar('missaoTitulo')} />
          </Campo>
          <Campo rotulo="Texto da missão" htmlFor="campo-missao-texto">
            <textarea id="campo-missao-texto" className={`${CLASSE_INPUT} min-h-[140px] py-2`} value={form.missaoTexto} disabled={desabilitado} onChange={mudar('missaoTexto')} />
          </Campo>
        </div>
      </Cartao>

      <ListaEditavel
        titulo="Número"
        descricao="Números reais da paróquia, ao lado da missão (até 4). Sem nenhum, a faixa de números não aparece."
        itens={form.numeros}
        vazio="Nenhum número cadastrado: a faixa não aparece no site."
        max={4}
        rotuloAdicionar="Adicionar número"
        novo={() => ({ valor: '', rotulo: '' })}
        onChange={(numeros) => setForm((f) => ({ ...f, numeros }))}
        desabilitado={desabilitado}
      >
        {(n, i, set) => (
          <div className="grid gap-3 md:grid-cols-2">
            <Campo rotulo={`Valor do número ${i + 1}`} htmlFor={`numero-valor-${i}`} ajuda="Ex.: 40+">
              <input id={`numero-valor-${i}`} className={CLASSE_INPUT} maxLength={12} value={n.valor} disabled={desabilitado} onChange={(e) => set('valor', e.target.value)} />
            </Campo>
            <Campo rotulo={`O que o número ${i + 1} conta`} htmlFor={`numero-rotulo-${i}`} ajuda="Ex.: anos de história">
              <input id={`numero-rotulo-${i}`} className={CLASSE_INPUT} maxLength={40} value={n.rotulo} disabled={desabilitado} onChange={(e) => set('rotulo', e.target.value)} />
            </Campo>
          </div>
        )}
      </ListaEditavel>

      <ListaEditavel
        titulo="Depoimento"
        descricao="Só entram depoimentos reais, com a autorização de quem os deu (até 6). Sem nenhum, a seção não aparece no site."
        itens={form.depoimentos}
        vazio="Nenhum depoimento cadastrado: a seção não aparece no site."
        max={6}
        rotuloAdicionar="Adicionar depoimento"
        novo={() => ({ autor: '', funcao: '', texto: '' })}
        onChange={(depoimentos) => setForm((f) => ({ ...f, depoimentos }))}
        desabilitado={desabilitado}
      >
        {(d, i, set) => (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Campo rotulo={`Autor do depoimento ${i + 1}`} htmlFor={`dep-autor-${i}`}>
                <input id={`dep-autor-${i}`} className={CLASSE_INPUT} maxLength={60} value={d.autor} disabled={desabilitado} onChange={(e) => set('autor', e.target.value)} />
              </Campo>
              <Campo rotulo={`Função de quem deu o depoimento ${i + 1} (opcional)`} htmlFor={`dep-funcao-${i}`} ajuda="Ex.: membro do coral">
                <input id={`dep-funcao-${i}`} className={CLASSE_INPUT} maxLength={60} value={d.funcao} disabled={desabilitado} onChange={(e) => set('funcao', e.target.value)} />
              </Campo>
            </div>
            <Campo rotulo={`Texto do depoimento ${i + 1}`} htmlFor={`dep-texto-${i}`}>
              <textarea id={`dep-texto-${i}`} className={`${CLASSE_INPUT} min-h-[84px] py-2`} maxLength={280} value={d.texto} disabled={desabilitado} onChange={(e) => set('texto', e.target.value)} />
            </Campo>
          </div>
        )}
      </ListaEditavel>

      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      {!podeEditar && <Aviso tom="info">Você pode ver o conteúdo, mas não publicar mudanças.</Aviso>}
      {podeEditar && (
        <div className="flex flex-wrap gap-3">
          <Botao variante={sujo ? 'primario' : 'secundario'} disabled={!sujo || publicando} onClick={publicar}>
            {sujo ? 'Publicar conteúdo' : 'Nada a publicar'}
          </Botao>
          <Botao variante="secundario" disabled={!sujo || publicando} onClick={() => { setForm(paraFormulario(estado.conteudo)); setErro(''); }}>Descartar</Botao>
        </div>
      )}
    </div>
  );
}
