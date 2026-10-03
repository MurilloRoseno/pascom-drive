import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import { MENU, menuVisivel } from '../menuPainel.js';
import {
  Aviso, Botao, Cartao, Pilula, useToast,
} from '../ui.jsx';
import EquipePainel from '../components/EquipePainel.jsx';
import BackupConfiguracoes from '../components/BackupConfiguracoes.jsx';

const ACOES = ['ver', 'criar', 'editar', 'excluir', 'gerenciar'];
const ROTULO_ACAO = {
  ver: 'Ver', criar: 'Criar', editar: 'Editar', excluir: 'Excluir', gerenciar: 'Gerir',
};

/**
 * Regras da matriz (as mesmas que o servidor aplica): tirar o "ver" tira a área
 * inteira; criar, editar ou excluir marcam o "ver" junto.
 */
export function alternar(permissoes, area, acao, marcado) {
  const atual = new Set(permissoes);
  const chave = `${area}.${acao}`;
  if (marcado) {
    atual.add(chave);
    if (acao !== 'ver' && acao !== 'gerenciar') atual.add(`${area}.ver`);
  } else {
    atual.delete(chave);
    if (acao === 'ver') for (const p of [...atual]) if (p.startsWith(`${area}.`)) atual.delete(p);
  }
  return [...atual];
}

export default function Acessos() {
  const { chamar } = usePainel();
  const avisar = useToast();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [papel, setPapel] = useState('coord');
  const [rascunho, setRascunho] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const d = await chamar('/api/pascom/acessos');
      setEstado({ fase: 'ok', ...d });
      return d;
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
      return null;
    }
  }, [chamar]);

  useEffect(() => { carregar().then((d) => d && setRascunho(d.matriz.coord)); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar os acessos.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const { papeis, areas, matriz, protegidas, equipe } = estado;
  const info = papeis.find((p) => p.id === papel);
  const fixo = papel === 'admin';
  const salvo = matriz[papel];
  const sujo = !fixo && (rascunho.length !== salvo.length || rascunho.some((p) => !salvo.includes(p)));

  function escolherPapel(id) {
    setPapel(id);
    setRascunho(matriz[id]);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await chamar(`/api/pascom/acessos/papeis/${papel}`, { method: 'PUT', body: { permissoes: rascunho } });
      avisar(`Permissões de ${info.nome} salvas.`);
      const d = await carregar();
      if (d) setRascunho(d.matriz[papel]);
    } catch (e) {
      avisar(e.message);
    } finally {
      setSalvando(false);
    }
  }

  const efetivas = fixo ? matriz.admin : rascunho;
  const menu = menuVisivel(efetivas, MENU);

  return (
    <div className="space-y-6">
      <Cartao titulo="Papéis e permissões">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Papel">
          {papeis.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={papel === p.id}
              onClick={() => escolherPapel(p.id)}
              className={`min-h-[44px] rounded-full border px-4 text-body-sm font-semibold ${papel === p.id ? 'border-photo-primary bg-photo-primary text-white' : 'border-painel-borda bg-white'}`}
            >
              {p.nome}
            </button>
          ))}
        </div>
        <p className="mt-3 text-body-sm text-painel-texto2">{info.descricao}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead>
              <tr className="bg-painel-cabecalho font-mono text-caption uppercase text-painel-texto2">
                <th scope="col" className="px-3 py-2">Área</th>
                {ACOES.map((a) => <th key={a} scope="col" className="px-3 py-2 text-center">{ROTULO_ACAO[a]}</th>)}
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.chave} className="border-t border-painel-divisor">
                  <th scope="row" className="px-3 py-2 font-semibold">{area.rotulo}</th>
                  {ACOES.map((acao) => {
                    if (!area.acoes.includes(acao)) return <td key={acao} className="px-3 py-2 text-center text-painel-pontilhado">—</td>;
                    const chave = `${area.chave}.${acao}`;
                    const reservada = protegidas.includes(chave) && !fixo;
                    return (
                      <td key={acao} className="px-3 py-1 text-center">
                        <input
                          type="checkbox"
                          aria-label={`${ROTULO_ACAO[acao]} ${area.rotulo}`}
                          checked={efetivas.includes(chave)}
                          disabled={fixo || reservada}
                          onChange={(e) => setRascunho((r) => alternar(r, area.chave, acao, e.target.checked))}
                          className="h-6 w-6 accent-photo-primary"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3">
          <Aviso tom="info">
            Tirar “Ver” tira a área inteira; marcar Criar, Editar ou Excluir marca “Ver” junto. Módulos e Acessos são só do
            Administrador, que nunca fica sem acesso.
          </Aviso>
          {!fixo && (
            <div className="flex flex-wrap gap-3">
              <Botao variante="dourado" disabled={!sujo || salvando} onClick={salvar}>{sujo ? `Salvar permissões de ${info.nome}` : 'Nada para salvar'}</Botao>
              <Botao variante="secundario" disabled={!sujo || salvando} onClick={() => setRascunho(salvo)}>Descartar</Botao>
            </div>
          )}
        </div>
      </Cartao>

      <Cartao titulo="Menu que este papel enxerga" descricao="O menu esconde o que o papel não abriria; a proteção de verdade é a mesma regra, conferida no servidor a cada chamada.">
        <div className="flex flex-wrap gap-2">
          {MENU.map((item) => {
            const vê = menu.some((m) => m.chave === item.chave);
            return <Pilula key={item.chave} tom={vê ? 'verde' : 'cinza'}>{vê ? '✓ ' : '✗ '}{item.rotulo}</Pilula>;
          })}
        </div>
      </Cartao>

      <EquipePainel equipe={equipe} papeis={papeis} onMudou={carregar} />
      <BackupConfiguracoes />
    </div>
  );
}
