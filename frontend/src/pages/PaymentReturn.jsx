import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { statusPagamento } from '../lib/api.js';

export default function PaymentReturnPage() {
  const { resultado } = useParams();
  const [params] = useSearchParams();
  const pedidoId = params.get('pedido');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!pedidoId) return;
    statusPagamento(pedidoId).then(setOrder).catch(() => {});
  }, [pedidoId]);

  const approved = resultado === 'sucesso' || order?.status === 'Pagamento Confirmado';
  return (
    <main className="payment-return">
      <div className="return-card">
        <p className="hero-kicker">{approved ? 'Pagamento recebido' : 'Pagamento em acompanhamento'}</p>
        <h1>{approved ? 'Obrigado pela compra' : resultado === 'falha' ? 'Pagamento nao concluido' : 'Aguardando confirmacao'}</h1>
        <p>
          {approved
            ? 'Os links seguros das suas fotos serao enviados ao e-mail informado. A secretaria tambem podera encaminha-los pelo WhatsApp.'
            : 'Assim que o Stripe confirmar a transacao, sua entrega sera preparada com seguranca.'}
        </p>
        {pedidoId && <small>Pedido: {pedidoId}</small>}
        <Link className="primary-link" to="/buscar">Voltar aos eventos</Link>
      </div>
    </main>
  );
}
