import { useState } from 'react';
import { Link } from 'react-router-dom';
import { recuperarPedido } from '../lib/api.js';

export default function RecoverOrderPage() {
  const [form, setForm] = useState({ email: '', pedidoId: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      setResult(await recuperarPedido(form));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <Link to="/buscar">Voltar aos eventos</Link>
        <p className="hero-kicker">Recuperar pedido</p>
        <h1>Acesse novamente suas fotos</h1>
        <p>Informe o e-mail usado na compra e o código do pedido para consultar a entrega.</p>
      </div>
      <div className="checkout-columns">
        <form className="checkout-form" onSubmit={submit}>
          <h2>Dados do pedido</h2>
          <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label>Código do pedido<input value={form.pedidoId} onChange={(event) => setForm({ ...form, pedidoId: event.target.value.toUpperCase() })} placeholder="PED_..." /></label>
          {error && <p className="form-error">{error}</p>}
          <button className="payment-button" type="submit" disabled={loading}>{loading ? 'Consultando...' : 'Recuperar pedido'}</button>
        </form>
        <aside className="order-summary">
          <p className="hero-kicker">Entrega</p>
          {!result ? <p>Os links recuperados são regenerados com validade curta e continuam protegidos por token.</p> : (
            <>
              <h2>{result.pedidoId}</h2>
              <div className="total-row"><span>Status</span><strong>{result.status}</strong></div>
              <div className="total-row"><span>Fotos</span><strong>{result.itemCount}</strong></div>
              {result.downloads?.map((item, index) => <a className="primary-link" key={item.url} href={item.url} target="_blank" rel="noreferrer">Baixar foto {index + 1}</a>)}
              {!result.deliveryReady && <p className="form-error">Pedido ainda não confirmado para entrega.</p>}
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
