import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Interruptor, Pilula, useToast,
} from '../ui.jsx';

const NOMES_DOS_MODULOS = {
  busca: 'Busca e galerias', checkout: 'Compra de fotos', agenda: 'Agenda paroquial', ajuda: 'Central de ajuda',
};
const SO_NA = { desktop: 'só no computador', mobile: 'só no celular' };
const ONDE_EDITAR = {
  missao: 'O texto vem de Conteúdo do site.',
  depoimentos: 'Os depoimentos vêm de Conteúdo do site; sem nenhum, a seção não aparece.',
  contato: 'Botões de WhatsApp e e-mail, com os dados de Conteúdo do site.',
};

const resumo = (blocos, destaque) => JSON.stringify({
  blocos: blocos.map(({ id, titulo, ligado }) => ({ id, titulo: titulo.trim(), ligado })),
  destaque,
});

export default function PaginaInicial() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [blocos, setBlocos] = useState([]);
  const [destaque, setDestaque] = useState('');
  const [publicando, setPublicando] = useState(false);
  const podeEditar = membro.permissoes.includes('conteudo.editar');

  const carregar = useCallback(async () => {
    try {
      const d = await chamar('/api/pascom/home');
      setEstado({ fase: 'ok', ...d });
      setBlocos(d.blocos);
      setDestaque(d.destaque);
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar a página inicial.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const sujo = resumo(blocos, destaque) !== resumo(estado.blocos, estado.destaque);
  const mudar = (id, campo) => (valor) => setBlocos((b) => b.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));

  function mover(i, delta) {
    setBlocos((b) => {
      const novo = [...b];
      [novo[i], novo[i + delta]] = [novo[i + delta], novo[i]];
      return novo;
    });
  }

  async function publicar() {
    if (blocos.some((b) => !b.titulo.trim())) { avisar('Cada bloco precisa de um título.'); return; }
    setPublicando(true);
    try {
      await chamar('/api/pascom/home', {
        method: 'PUT',
        body: { blocos: blocos.map(({ id, titulo, ligado }) => ({ id, titulo: titulo.trim(), ligado })), destaque },
      });
      avisar('Página inicial publicada.');
      await carregar();
    } catch (e) {
      avisar(e.message);
    } finally {
      setPublicando(false);
    }
  }

  const desabilitado = !podeEditar || publicando;

  return (
    <div className="space-y-6">
      <Cartao titulo="Evento em destaque" descricao="Aparece no bloco “Em destaque”, com a capa e o link da galeria. Só galerias que estão no ar.">
        <Campo rotulo="Evento" htmlFor="home-destaque">
          <select id="home-destaque" className={CLASSE_INPUT} value={destaque} disabled={desabilitado} onChange={(e) => setDestaque(e.target.value)}>
            <option value="">Nenhum</option>
            {estado.eventosNoAr.map((e) => <option key={e.eventoId} value={e.eventoId}>{e.nome}</option>)}
          </select>
        </Campo>
      </Cartao>

      <Cartao titulo="Blocos, na ordem em que aparecem" descricao="O topo com a busca é fixo. Daqui para baixo, mude a ordem, o título e quais blocos aparecem.">
        <ul className="divide-y divide-painel-divisor">
          {blocos.map((b, i) => {
            const info = estado.info[b.id] || {};
            const oculto = info.modulo && !info.noAr;
            return (
              <li key={b.id} className={`flex flex-wrap items-center gap-2 py-3 ${oculto ? 'opacity-60' : ''}`}>
                <button type="button" aria-label={`Subir ${b.titulo}`} disabled={desabilitado || i === 0} onClick={() => mover(i, -1)} className="h-11 w-11 rounded-lg border border-painel-borda text-lg disabled:opacity-30">↑</button>
                <button type="button" aria-label={`Descer ${b.titulo}`} disabled={desabilitado || i === blocos.length - 1} onClick={() => mover(i, 1)} className="h-11 w-11 rounded-lg border border-painel-borda text-lg disabled:opacity-30">↓</button>
                <div className="min-w-[200px] flex-1">
                  <label htmlFor={`titulo-${b.id}`} className="sr-only">Título do bloco {b.id}</label>
                  <input id={`titulo-${b.id}`} className={`${CLASSE_INPUT} mt-0`} maxLength={80} value={b.titulo} disabled={desabilitado} onChange={(e) => mudar(b.id, 'titulo')(e.target.value)} />
                  {ONDE_EDITAR[b.id] && <p className="mt-1 text-caption text-painel-texto2">{ONDE_EDITAR[b.id]}</p>}
                </div>
                {info.so && <Pilula tom="cinza">{SO_NA[info.so]}</Pilula>}
                {oculto && <Pilula tom="amarelo">Oculto: {NOMES_DOS_MODULOS[info.modulo]} desligado</Pilula>}
                <Interruptor rotulo={`Mostrar ${b.titulo}`} ligado={b.ligado} desabilitado={desabilitado} onChange={mudar(b.id, 'ligado')} />
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <Aviso tom="info">Blocos de módulos desligados somem sozinhos da página inicial; ao religar o módulo, voltam ao mesmo lugar.</Aviso>
        </div>
      </Cartao>

      {podeEditar && (
        <div className="flex flex-wrap gap-3">
          <Botao variante={sujo ? 'primario' : 'secundario'} disabled={!sujo || publicando} onClick={publicar}>{sujo ? 'Publicar página inicial' : 'Nada a publicar'}</Botao>
          <Botao variante="secundario" disabled={!sujo || publicando} onClick={() => { setBlocos(estado.blocos); setDestaque(estado.destaque); }}>Descartar</Botao>
        </div>
      )}
    </div>
  );
}
