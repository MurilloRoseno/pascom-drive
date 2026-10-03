import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Interruptor, Pilula, Segmentado, useToast,
} from '../ui.jsx';

const TIPOS = [
  { valor: 'sacramento', rotulo: 'Sacramento' },
  { valor: 'celebracao', rotulo: 'Celebração' },
];

function rotuloRemocao(c) {
  if (c.padrao) return 'Fixa';
  return c.eventos > 0 ? 'Ocultar' : 'Remover';
}

function Grupo({ titulo, itens, perm, onMover, onAlternar, onRemover }) {
  return (
    <Cartao titulo={titulo} descricao={`${itens.length} ${itens.length === 1 ? 'categoria' : 'categorias'}`}>
      {itens.length === 0 ? (
        <p className="text-painel-texto2">Nenhuma categoria neste grupo.</p>
      ) : (
        <ul className="divide-y divide-painel-divisor">
          {itens.map((c, i) => (
            <li key={c.id} className={`flex flex-wrap items-center gap-2 py-2 ${c.ativo ? '' : 'opacity-60'}`}>
              <div className="min-w-[160px] flex-1">
                <p className="font-semibold">{c.nome}</p>
                <p className="font-mono text-caption text-painel-texto2">
                  /{c.id} · {c.eventos} {c.eventos === 1 ? 'evento' : 'eventos'}{c.padrao ? ' · padrão' : ''}
                </p>
              </div>
              {perm.editar && (
                <>
                  <button type="button" aria-label={`Subir ${c.nome}`} disabled={i === 0} onClick={() => onMover(c, 'subir')} className="h-11 w-11 rounded-lg border border-painel-borda text-lg disabled:opacity-30">↑</button>
                  <button type="button" aria-label={`Descer ${c.nome}`} disabled={i === itens.length - 1} onClick={() => onMover(c, 'descer')} className="h-11 w-11 rounded-lg border border-painel-borda text-lg disabled:opacity-30">↓</button>
                </>
              )}
              <Interruptor
                rotulo={`${c.nome} visível no site`}
                ligado={c.ativo}
                desabilitado={!perm.editar || c.padrao}
                onChange={(v) => onAlternar(c, v)}
              />
              {perm.excluir && (
                <Botao variante="perigo" className="min-w-[100px]" disabled={c.padrao} aria-label={`${rotuloRemocao(c)} ${c.nome}`} onClick={() => onRemover(c)}>
                  {rotuloRemocao(c)}
                </Botao>
              )}
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}

export default function Categorias() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState('sacramento');
  const [erro, setErro] = useState('');

  const perm = {
    criar: membro.permissoes.includes('categorias.criar'),
    editar: membro.permissoes.includes('categorias.editar'),
    excluir: membro.permissoes.includes('categorias.excluir'),
  };

  const carregar = useCallback(async () => {
    try {
      const r = await chamar('/api/pascom/categorias');
      setEstado({ fase: 'ok', categorias: r.categorias });
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  async function agir(fn, mensagemOk) {
    try {
      await fn();
      if (mensagemOk) avisar(mensagemOk);
      await carregar();
    } catch (e) {
      avisar(e.message);
    }
  }

  async function adicionar(ev) {
    ev.preventDefault();
    setErro('');
    if (nome.trim().length < 2) { setErro('Informe o nome da categoria.'); return; }
    try {
      const c = await chamar('/api/pascom/categorias', { method: 'POST', body: { nome: nome.trim(), tipo } });
      setNome('');
      avisar(`“${c.nome}” adicionada.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando categorias…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar as categorias.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const por = (t) => estado.categorias.filter((c) => c.tipo === t).sort((a, b) => a.ordem - b.ordem);
  const visiveis = estado.categorias.filter((c) => c.ativo);
  const acoes = {
    onMover: (c, dir) => agir(() => chamar(`/api/pascom/categorias/${c.id}/mover`, { method: 'POST', body: { direcao: dir } })),
    onAlternar: (c, ativo) => agir(() => chamar(`/api/pascom/categorias/${c.id}`, { method: 'PATCH', body: { ativo } }), ativo ? `“${c.nome}” voltou ao site.` : `“${c.nome}” ficou oculta.`),
    onRemover: async (c) => {
      try {
        const r = await chamar(`/api/pascom/categorias/${c.id}`, { method: 'DELETE' });
        avisar(r.resultado === 'ocultada' ? 'Tem eventos: ficou oculta.' : `“${c.nome}” removida.`);
        await carregar();
      } catch (e) {
        avisar(e.message);
      }
    },
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <Grupo titulo="Sacramentos" itens={por('sacramento')} perm={perm} {...acoes} />
        <Grupo titulo="Celebrações" itens={por('celebracao')} perm={perm} {...acoes} />
      </div>

      <div className="space-y-6">
        {perm.criar && (
          <Cartao titulo="Adicionar categoria" descricao="Nenhuma mudança no código: a lista nova vale para o site, para a validação e para a automação.">
            <form onSubmit={adicionar} className="space-y-4" noValidate>
              <Campo rotulo="Nome" htmlFor="nome-categoria" erro={erro}>
                <input id="nome-categoria" className={CLASSE_INPUT} value={nome} maxLength={60} placeholder="Ex.: Profissão de Fé" onChange={(e) => { setNome(e.target.value); setErro(''); }} />
              </Campo>
              <Segmentado rotulo="Tipo" opcoes={TIPOS} valor={tipo} onChange={setTipo} />
              <Botao type="submit" variante="dourado">Adicionar à lista</Botao>
            </form>
          </Cartao>
        )}

        <Cartao titulo="Como aparece no site">
          <div className="flex flex-wrap gap-2">
            <Pilula tom="lilas">Todos</Pilula>
            {visiveis.map((c) => <Pilula key={c.id} tom="cinza">{c.nome}</Pilula>)}
          </div>
          <div className="mt-4">
            <Aviso tom="info">
              Categoria com eventos não pode ser apagada, só ocultada. A categoria padrão (Celebrações) recebe
              os eventos sem categoria e fica fixa.
            </Aviso>
          </div>
        </Cartao>
      </div>
    </div>
  );
}
