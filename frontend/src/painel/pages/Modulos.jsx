import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import {
  Aviso, Botao, Campo, CLASSE_INPUT, Cartao, Interruptor, Pilula, useToast,
} from '../ui.jsx';

const RECADO_PADRAO = 'Esta área está em manutenção. Volte em breve.';

function situacao(m) {
  if (m.ligado && m.efetivo) return { rotulo: 'No ar', tom: 'verde' };
  if (m.ligado && !m.efetivo) return { rotulo: `Cai com ${m.caiCom}`, tom: 'amarelo' };
  return { rotulo: 'Desligado', tom: 'cinza' };
}

export default function Modulos() {
  const { chamar } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [selecionado, setSelecionado] = useState(null);
  const [recado, setRecado] = useState('');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const d = await chamar('/api/pascom/modulos');
      setEstado({ fase: 'ok', modulos: d.modulos });
      return d.modulos;
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
      return null;
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar os módulos.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const { modulos } = estado;
  const atual = modulos.find((m) => m.chave === selecionado);
  const grupos = [...new Set(modulos.map((m) => m.grupo))];

  async function salvar(chave, corpo, mensagem) {
    try {
      await chamar(`/api/pascom/modulos/${chave}`, { method: 'PUT', body: corpo });
      setErro('');
      avisar(mensagem);
      await carregar();
    } catch (e) {
      avisar(e.message);
      if (corpo.recado !== undefined) setErro(e.message);
    }
  }

  function escolher(m) {
    setSelecionado(m.chave);
    setRecado(m.recado === RECADO_PADRAO ? '' : m.recado);
    setErro('');
  }

  function alternar(m, ligar) {
    const aviso = !ligar && m.derruba.length > 0 ? ` Também cai: ${m.derruba.join(', ')}.` : '';
    salvar(m.chave, { ligado: ligar }, ligar ? `${m.nome} ligado.` : `${m.nome} desligado.${aviso}`);
  }

  return (
    <div className="space-y-6">
      {grupos.map((grupo) => (
        <Cartao key={grupo} titulo={grupo}>
          <ul className="divide-y divide-painel-divisor">
            {modulos.filter((m) => m.grupo === grupo).map((m) => {
              const s = situacao(m);
              return (
                <li key={m.chave} className={`flex flex-wrap items-center gap-3 py-3 ${selecionado === m.chave ? 'bg-painel-selecionado' : ''}`}>
                  <Interruptor rotulo={m.nome} ligado={m.ligado} onChange={(v) => alternar(m, v)} />
                  <button type="button" onClick={() => escolher(m)} aria-pressed={selecionado === m.chave} className="min-h-[44px] flex-1 text-left">
                    <span className="block font-semibold">{m.nome}</span>
                    <span className="block text-body-sm text-painel-texto2">
                      {m.descricao}{m.dependeDe ? ` · depende de ${modulos.find((x) => x.chave === m.dependeDe).nome}` : ' · raiz'}
                    </span>
                  </button>
                  <Pilula tom={s.tom}>{s.rotulo}</Pilula>
                </li>
              );
            })}
          </ul>
        </Cartao>
      ))}

      {atual && (
        <Cartao titulo={atual.nome} destaque>
          {atual.derruba.length > 0 && (
            <div className="mb-4">
              <Aviso tom="amarelo">Desligar este módulo também derruba: {atual.derruba.join(', ')}.</Aviso>
            </div>
          )}
          <Campo rotulo="Recado para o visitante quando estiver fora do ar" htmlFor="recado" erro={erro} ajuda={`Em branco usa: “${RECADO_PADRAO}”`}>
            <textarea id="recado" className={`${CLASSE_INPUT} min-h-[84px] py-2`} maxLength={200} value={recado} onChange={(e) => { setRecado(e.target.value); setErro(''); }} />
          </Campo>
          <Botao className="mt-3" variante="secundario" onClick={() => salvar(atual.chave, { recado }, 'Recado salvo.')}>Salvar recado</Botao>

          <h3 className="mt-6 font-semibold">O visitante vê</h3>
          {atual.efetivo ? (
            <p className="mt-2 rounded-[10px] bg-[#D5EBDD] p-4 text-[#1F5A3B]">No ar: o visitante usa normalmente.</p>
          ) : (
            <div className="mt-2 rounded-[10px] bg-photo-primary p-4 text-center text-white">
              <p className="font-display text-h3 font-semibold">Em manutenção</p>
              <p className="mt-1">{recado.trim() || atual.recado || RECADO_PADRAO}</p>
            </div>
          )}
        </Cartao>
      )}

      <Aviso tom="info">
        Nunca saem do ar: a página inicial, o acompanhamento e o download de pedidos já pagos, o pagamento em andamento, o painel e o
        login da equipe. Só o estado (ligado ou desligado) e o recado ficam na planilha; módulo sem linha nasce ligado.
      </Aviso>
    </div>
  );
}
