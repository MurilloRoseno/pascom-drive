import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { obterAgenda } from '../lib/api.js';
import { somarMeses } from '../lib/datas.js';
import CalendarioMes from '../components/agenda/CalendarioMes.jsx';
import FiltroTipos from '../components/agenda/FiltroTipos.jsx';
import { ListaDoMes, PainelDoDia } from '../components/agenda/PainelDoDia.jsx';

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function mesDeHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * /agenda — calendário paroquial. O mês, o dia e o filtro ficam na URL, então o
 * endereço pode ser compartilhado e o botão "voltar" funciona.
 */
export default function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const [estado, setEstado] = useState({ fase: 'carregando' });

  const mes = MES.test(params.get('mes') || '') ? params.get('mes') : mesDeHoje();
  const diaDaUrl = DIA.test(params.get('dia') || '') && params.get('dia').slice(0, 7) === mes ? params.get('dia') : null;
  const tipo = params.get('tipo');

  useEffect(() => {
    let ativo = true;
    setEstado((s) => (s.fase === 'ok' ? s : { fase: 'carregando' }));
    obterAgenda(mes)
      .then((d) => ativo && setEstado({ fase: 'ok', ...d }))
      .catch((e) => ativo && setEstado({ fase: 'erro', mensagem: e.message }));
    return () => { ativo = false; };
  }, [mes]);

  function atualizar(mudancas) {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudancas)) {
      if (v === null || v === undefined) p.delete(k); else p.set(k, v);
    }
    setParams(p, { replace: true });
  }

  const hoje = estado.fase === 'ok' ? estado.hoje : null;
  const dia = diaDaUrl || (hoje && hoje.slice(0, 7) === mes ? hoje : null);
  const tipos = estado.fase === 'ok' ? estado.tipos : [];
  const ocorrencias = estado.fase === 'ok' ? estado.ocorrencias.filter((o) => !tipo || o.tipo === tipo) : [];

  return (
    <section className="py-6" style={{ background: 'var(--photo-paper)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto px-4">
        <h1 className="font-display font-bold" style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-3xl)' }}>Agenda da paróquia</h1>
        <p className="mt-1 mb-5" style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
          Missas, celebrações, reuniões e formações. Toque num dia para ver os detalhes.
        </p>

        {estado.fase === 'erro' && <p role="alert" style={{ fontSize: 'var(--text-base)' }}>Não foi possível carregar a agenda agora. Tente de novo em instantes.</p>}
        {estado.fase === 'carregando' && <p role="status" style={{ fontSize: 'var(--text-base)' }}>Carregando a agenda…</p>}

        {estado.fase === 'ok' && (
          <div className="space-y-5">
            <FiltroTipos tipos={tipos} valor={tipo} onChange={(t) => atualizar({ tipo: t })} />
            <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
              <CalendarioMes
                mes={mes}
                hoje={hoje}
                ocorrencias={ocorrencias}
                diaSelecionado={dia}
                onSelecionarDia={(d) => atualizar({ dia: d })}
                onMudarMes={(n) => atualizar({ mes: somarMeses(mes, n), dia: null })}
                onHoje={() => atualizar({ mes: hoje.slice(0, 7), dia: hoje })}
              />
              <div className="space-y-5">
                <PainelDoDia data={dia} ocorrencias={ocorrencias} tipos={tipos} />
                <ListaDoMes mes={mes} ocorrencias={ocorrencias} tipos={tipos} onSelecionarDia={(d) => atualizar({ dia: d })} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
