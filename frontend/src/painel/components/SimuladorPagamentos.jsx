import { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { usePainel } from '../PainelContext.jsx';
import { formatarReaisDeValor as reais } from '../format.js';
import { Botao, Cartao, Segmentado } from '../ui.jsx';

function Linha({ rotulo, valor, destaque = false, tom }) {
  return (
    <div className="flex justify-between gap-4 py-1" style={{ color: tom }}>
      <dt className={destaque ? 'font-semibold' : ''}>{rotulo}</dt>
      <dd className={`font-mono ${destaque ? 'font-bold' : ''}`} style={{ margin: 0 }}>{valor}</dd>
    </div>
  );
}

Linha.propTypes = {
  rotulo: PropTypes.string.isRequired,
  valor: PropTypes.string.isRequired,
  destaque: PropTypes.bool,
  tom: PropTypes.string,
};

/**
 * Simulador de pedido: pergunta ao SERVIDOR (mesma conta do checkout) quanto o
 * comprador paga e quanto fica para a paróquia, com os valores já salvos.
 * `versao` muda quando a configuração é salva, para recalcular.
 */
export default function SimuladorPagamentos({ versao }) {
  const { chamar } = usePainel();
  const [quantidade, setQuantidade] = useState(3);
  const [metodo, setMetodo] = useState('cartao');
  const [estado, setEstado] = useState({ fase: 'carregando' });

  const carregar = useCallback(async () => {
    try {
      setEstado({ fase: 'ok', ...(await chamar(`/api/pascom/pagamentos/simulador?quantidade=${quantidade}`)) });
    } catch (e) {
      setEstado({ fase: 'erro', mensagem: e.message });
    }
  }, [chamar, quantidade]);

  useEffect(() => { carregar(); }, [carregar, versao]);

  if (estado.fase === 'erro') {
    return (
      <Cartao titulo="Simulador de pedido">
        <p role="alert" className="text-painel-perigo">Não foi possível simular: {estado.mensagem}</p>
        <Botao className="mt-3" onClick={carregar}>Tentar de novo</Botao>
      </Cartao>
    );
  }

  const c = estado.fase === 'ok' ? estado.atual[metodo] : null;

  return (
    <div className="space-y-6">
      <section aria-labelledby="titulo-simulador" className="rounded-[14px] bg-photo-primary-dark p-5 text-photo-bone sm:p-6">
        <h2 id="titulo-simulador" className="font-display text-h3 font-semibold">Simulador de pedido</h2>
        <p className="mt-1 text-body-sm text-photo-bone/70">Usa os valores já salvos, com a mesma conta do checkout.</p>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2" role="group" aria-label="Quantidade de fotos">
            <button type="button" aria-label="Menos uma foto" disabled={quantidade <= 1} onClick={() => setQuantidade((q) => q - 1)} className="h-11 w-11 rounded-lg border border-white/30 text-xl disabled:opacity-40">−</button>
            <output aria-live="polite" className="min-w-[4.5rem] text-center font-mono text-lg">{quantidade} {quantidade === 1 ? 'foto' : 'fotos'}</output>
            <button type="button" aria-label="Mais uma foto" disabled={quantidade >= 100} onClick={() => setQuantidade((q) => q + 1)} className="h-11 w-11 rounded-lg border border-white/30 text-xl disabled:opacity-40">+</button>
          </div>
          <div className="rounded-lg bg-white p-1">
            <Segmentado
              rotulo="Forma de pagamento"
              valor={metodo}
              onChange={setMetodo}
              opcoes={[{ valor: 'cartao', rotulo: 'Cartão' }, { valor: 'pix', rotulo: 'Pix' }]}
            />
          </div>
        </div>

        {c ? (
          <dl className="mt-5 text-body" style={{ margin: 0, marginTop: '1.25rem' }}>
            <Linha rotulo={`${c.quantidade} × ${reais(c.precoUnitario)}`} valor={reais(c.subtotal)} />
            {c.taxaServico > 0 && <Linha rotulo="Taxa de serviço" valor={reais(c.taxaServico)} />}
            {c.taxaComodidade > 0 && <Linha rotulo="Taxa de comodidade" valor={reais(c.taxaComodidade)} />}
            <Linha rotulo="Custo estimado do pagamento" valor={reais(c.custoPagamento)} />
            <hr className="my-2 border-white/20" />
            <Linha rotulo="Total do comprador" valor={reais(c.total)} destaque />
            <Linha rotulo="Stripe retém (aprox.)" valor={reais(c.gatewayRetem)} tom="rgba(244,237,224,.7)" />
            <Linha rotulo="Paróquia recebe líquido" valor={reais(c.liquido)} destaque tom="#F7C848" />
          </dl>
        ) : (
          <p role="status" className="mt-5 text-photo-bone/70">Calculando…</p>
        )}
      </section>

      {estado.fase === 'ok' && (
        <Cartao titulo="Quanto o comprador paga, por quantidade de fotos">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-body-sm">
              <thead>
                <tr className="bg-painel-cabecalho font-mono text-caption uppercase text-painel-texto2">
                  <th scope="col" className="px-3 py-2">Fotos</th>
                  <th scope="col" className="px-3 py-2">Só fotos</th>
                  <th scope="col" className="px-3 py-2">Pix</th>
                  <th scope="col" className="px-3 py-2">Cartão</th>
                  <th scope="col" className="px-3 py-2">Acréscimo no cartão</th>
                </tr>
              </thead>
              <tbody>
                {estado.tabela.map((l) => (
                  <tr key={l.quantidade} className="border-t border-painel-divisor">
                    <td className="px-3 py-2 font-semibold">{l.quantidade}</td>
                    <td className="px-3 py-2 font-mono">{reais(l.cartao.subtotal)}</td>
                    <td className="px-3 py-2 font-mono">{reais(l.pix.total)}</td>
                    <td className="px-3 py-2 font-mono">{reais(l.cartao.total)}</td>
                    <td className="px-3 py-2 font-mono">{l.acrescimoCartaoPercentual.toFixed(1).replace('.', ',')} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}
    </div>
  );
}

SimuladorPagamentos.propTypes = { versao: PropTypes.number };
