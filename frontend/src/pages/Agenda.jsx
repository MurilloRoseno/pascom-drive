import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { obterAgenda } from '../lib/api.js';
import { somarMeses } from '../lib/datas.js';
import CalendarioMes from '../components/agenda/CalendarioMes.jsx';
import FiltroTipos from '../components/agenda/FiltroTipos.jsx';
import { ListaDoMes, PainelDoDia } from '../components/agenda/PainelDoDia.jsx';
import '../shared/ajuda-agenda.css';

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

function mesDeHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * /agenda: calendário paroquial. O mês, o dia e o filtro ficam na URL, então o endereço
 * pode ser compartilhado e o botão "voltar" funciona. Em tela estreita a lista do mês
 * vem primeiro (leitura natural no celular) e a grade logo abaixo.
 */
export default function AgendaPage({ mobile = false }) {
  const [params, setParams] = useSearchParams();
  const [estado, setEstado] = useState({ fase: 'carregando' });
  const painelRef = useRef(null);

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

  /** Em tela estreita o painel do dia fica abaixo da grade: leva a pessoa até ele. */
  function escolherDia(d) {
    atualizar({ dia: d });
    setTimeout(() => painelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 0);
  }

  const hoje = estado.fase === 'ok' ? estado.hoje : null;
  const dia = diaDaUrl || (hoje && hoje.slice(0, 7) === mes ? hoje : null);
  const tipos = estado.fase === 'ok' ? estado.tipos : [];
  const ocorrencias = estado.fase === 'ok' ? estado.ocorrencias.filter((o) => !tipo || o.tipo === tipo) : [];

  const conteudo = (
    <section className={`aa aa-pagina${mobile ? '' : ' aa-pagina--solta'}`}>
      <div className="aa-conteudo aa-conteudo--largo">
        <h1 className="aa-h1">Agenda da paróquia</h1>
        <p className="aa-lead">Missas, celebrações, reuniões e formações. Toque num dia para ver os detalhes.</p>

        {estado.fase === 'erro' && <p role="alert" className="aa-estado">Não foi possível carregar a agenda agora. Tente de novo em instantes.</p>}
        {estado.fase === 'carregando' && <p role="status" className="aa-estado">Carregando a agenda…</p>}

        {estado.fase === 'ok' && (
          <div className="aa-pilha">
            <FiltroTipos tipos={tipos} valor={tipo} onChange={(t) => atualizar({ tipo: t })} />
            <ListaDoMes mes={mes} ocorrencias={ocorrencias} tipos={tipos} onSelecionarDia={escolherDia} />
            <div className="aa-agenda-grade">
              <CalendarioMes
                mes={mes}
                hoje={hoje}
                ocorrencias={ocorrencias}
                diaSelecionado={dia}
                onSelecionarDia={escolherDia}
                onMudarMes={(n) => atualizar({ mes: somarMeses(mes, n), dia: null })}
                onHoje={() => atualizar({ mes: hoje.slice(0, 7), dia: hoje })}
              />
              <div className="aa-agenda-lado" ref={painelRef}>
                <PainelDoDia data={dia} ocorrencias={ocorrencias} tipos={tipos} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return mobile ? <div className="scroll">{conteudo}</div> : conteudo;
}

AgendaPage.propTypes = { mobile: PropTypes.bool };
