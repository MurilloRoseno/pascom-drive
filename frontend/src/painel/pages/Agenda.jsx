import { useCallback, useEffect, useState } from 'react';
import { usePainel } from '../PainelContext.jsx';
import { somarMeses } from '../../lib/datas.js';
import { Botao, useToast } from '../ui.jsx';
import CalendarioMes from '../../components/agenda/CalendarioMes.jsx';
import FiltroTipos from '../../components/agenda/FiltroTipos.jsx';
import { PainelDoDia } from '../../components/agenda/PainelDoDia.jsx';
import FormularioCompromisso from '../components/FormularioCompromisso.jsx';

function mesDeHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Agenda() {
  const { chamar, membro } = usePainel();
  const avisar = useToast();
  const [mes, setMes] = useState(mesDeHoje);
  const [dia, setDia] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const [editando, setEditando] = useState(null);
  const [confirmando, setConfirmando] = useState(null);

  const perm = {
    criar: membro.permissoes.includes('agenda.criar'),
    editar: membro.permissoes.includes('agenda.editar'),
    excluir: membro.permissoes.includes('agenda.excluir'),
  };

  const carregar = useCallback(async () => {
    try {
      const d = await chamar(`/api/pascom/agenda?mes=${mes}`);
      setEstado({ fase: 'ok', ...d });
      setDia((atual) => atual || (d.hoje.slice(0, 7) === mes ? d.hoje : null));
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar, mes]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') return <p role="status" className="text-painel-texto2">Carregando a agenda…</p>;
  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar a agenda.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <Botao className="mt-4" onClick={carregar}>Tentar de novo</Botao>
      </div>
    );
  }

  const { tipos, hoje, compromissos } = estado;
  const ocorrencias = estado.ocorrencias.filter((o) => !tipo || o.tipo === tipo);
  const emEdicao = editando && compromissos.find((c) => c.id === editando);

  async function criar(dados) {
    await chamar('/api/pascom/agenda', { method: 'POST', body: dados });
    avisar('Compromisso adicionado à agenda.');
    await carregar();
  }

  async function salvar(dados) {
    await chamar(`/api/pascom/agenda/${editando}`, { method: 'PATCH', body: dados });
    avisar('Compromisso atualizado.');
    setEditando(null);
    await carregar();
  }

  async function remover(o) {
    if (confirmando !== o.id) { setConfirmando(o.id); return; }
    try {
      await chamar(`/api/pascom/agenda/${o.id}`, { method: 'DELETE' });
      avisar('Compromisso removido.');
      setConfirmando(null);
      if (editando === o.id) setEditando(null);
      await carregar();
    } catch (e) {
      avisar(e.message);
    }
  }

  const acoes = (o) => (
    <div className="flex flex-wrap gap-2">
      {perm.editar && <Botao variante="secundario" aria-label={`Editar ${o.titulo}`} onClick={() => { setEditando(o.id); setConfirmando(null); }}>Editar</Botao>}
      {perm.excluir && (
        <Botao variante="perigo" aria-label={`Remover ${o.titulo}`} onClick={() => remover(o)}>
          {confirmando === o.id ? (o.recorrencia !== 'nenhuma' ? 'Confirmar: remove a série toda' : 'Confirmar remoção') : 'Remover'}
        </Botao>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <FiltroTipos tipos={tipos} valor={tipo} onChange={setTipo} />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <CalendarioMes
          mes={mes}
          hoje={hoje}
          ocorrencias={ocorrencias}
          diaSelecionado={dia}
          onSelecionarDia={(d) => { setDia(d); setEditando(null); setConfirmando(null); }}
          onMudarMes={(n) => { setMes(somarMeses(mes, n)); setDia(null); setEditando(null); }}
          onHoje={() => { setMes(hoje.slice(0, 7)); setDia(hoje); }}
        />
        <div className="space-y-6">
          <PainelDoDia data={dia} ocorrencias={ocorrencias} tipos={tipos} acao={acoes} />
          {emEdicao ? (
            <FormularioCompromisso key={emEdicao.id} data={dia} compromisso={emEdicao} tipos={tipos} podeSalvar={perm.editar} onEnviar={salvar} onCancelar={() => setEditando(null)} />
          ) : (
            <FormularioCompromisso key={dia || 'sem-dia'} data={dia} tipos={tipos} podeSalvar={perm.criar} onEnviar={criar} />
          )}
        </div>
      </div>
      <p className="text-body-sm text-painel-texto2">
        A página inicial do site mostra o que ainda vai acontecer. Compromissos que se repetem aparecem em todas as datas; editar ou remover vale para a série inteira.
      </p>
    </div>
  );
}
