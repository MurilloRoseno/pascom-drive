import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { usePainel } from '../PainelContext.jsx';
import { formatarReaisDeValor } from '../format.js';

function Indicador({ rotulo, valor, detalhe }) {
  return (
    <div className="rounded-[14px] border border-painel-linha bg-white p-5">
      <p className="font-mono text-eyebrow uppercase tracking-wide text-photo-primary-dark">{rotulo}</p>
      <p className="mt-2 font-display text-[2.125rem] font-semibold leading-none text-photo-primary-dark">{valor}</p>
      <p className="mt-2 text-body-sm text-painel-texto2">{detalhe}</p>
    </div>
  );
}

Indicador.propTypes = {
  rotulo: PropTypes.string.isRequired,
  valor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  detalhe: PropTypes.string.isRequired,
};

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export default function VisaoGeral() {
  const { chamar } = usePainel();
  const [estado, setEstado] = useState({ fase: 'carregando' });

  const carregar = useCallback(async () => {
    setEstado({ fase: 'carregando' });
    try {
      const [resumo, auditoria] = await Promise.all([
        chamar('/api/pascom/dashboard'),
        chamar('/api/pascom/auditoria'),
      ]);
      setEstado({ fase: 'ok', resumo: resumo.dashboard, alteracoes: auditoria.alteracoes });
    } catch (err) {
      setEstado({ fase: 'erro', mensagem: err.message });
    }
  }, [chamar]);

  useEffect(() => { carregar(); }, [carregar]);

  if (estado.fase === 'carregando') {
    return <p role="status" className="text-painel-texto2">Carregando a visão geral…</p>;
  }

  if (estado.fase === 'erro') {
    return (
      <div role="alert" className="rounded-[14px] border border-painel-perigo bg-white p-5">
        <p className="font-semibold text-painel-perigo">Não foi possível carregar a visão geral.</p>
        <p className="mt-1 text-body-sm text-painel-texto2">{estado.mensagem}</p>
        <button
          type="button"
          onClick={carregar}
          className="mt-4 min-h-[44px] rounded-lg bg-photo-primary px-5 font-semibold text-white hover:bg-photo-primary-dark"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const { resumo, alteracoes } = estado;

  return (
    <div className="space-y-8">
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Indicador rotulo="Pedidos hoje" valor={resumo.ordersToday} detalhe={`${formatarReaisDeValor(resumo.revenueToday)} confirmados`} />
        <Indicador rotulo="Pedidos no mês" valor={resumo.ordersMonth} detalhe={`${formatarReaisDeValor(resumo.revenueMonth)} confirmados`} />
        <Indicador rotulo="Aguardando pagamento" valor={resumo.pendingOrders} detalhe="pedidos pendentes" />
        <Indicador
          rotulo="Problemas de entrega"
          valor={resumo.deliveryIssues}
          detalhe={resumo.deliveryIssues === 0 ? 'nada pede atenção' : 'e-mail com erro ou pagamento divergente'}
        />
        <Indicador rotulo="Eventos publicados" valor={resumo.publishedEvents} detalhe="galerias no ar" />
        <Indicador
          rotulo="Downloads ativos"
          valor={resumo.activeDownloads}
          detalhe={plural(resumo.activeDownloads, 'link ainda válido', 'links ainda válidos')}
        />
      </section>

      <section aria-labelledby="titulo-alteracoes" className="rounded-[14px] border border-painel-linha bg-white p-5">
        <h2 id="titulo-alteracoes" className="font-display text-h3 font-semibold text-photo-primary-dark">
          Últimas alterações no painel
        </h2>
        {alteracoes.length === 0 ? (
          <p className="mt-3 text-painel-texto2">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-painel-divisor">
            {alteracoes.map((a, i) => (
              <li key={`${a.quando}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
                <span className="font-mono text-caption text-painel-desligado">{a.quando}</span>
                <span className="rounded-full bg-painel-selecionado px-2 py-0.5 font-mono text-caption text-photo-primary-dark">
                  {a.quem}
                </span>
                <span>{a.mensagem}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
