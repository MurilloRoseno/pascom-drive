/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  pascomConferirMercadoPago, pascomDashboard, pascomPedidoDetalhe, pascomPedidos,
  pascomRegenerarDownloads, pascomReenviarEntrega,
} from '../../lib/api.js';

export const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

const EMAIL_ROTULO = {
  enviado: 'E-mail enviado',
  falhou: 'E-mail falhou',
  pendente: 'E-mail ainda não saiu',
  nao_configurado: 'E-mail não configurado',
};

// A planilha guarda o status cru do Mercado Pago; a equipe le a versao em portugues.
const STATUS_ROTULO = {
  'Pagamento Confirmado': 'Pagamento confirmado',
  'Pagamento Pendente': 'Aguardando pagamento',
  PagamentoDivergente: 'Valor pago divergente',
};

function rotuloStatus(status) {
  return STATUS_ROTULO[status] || status || 'sem status';
}

const SITUACAO_CONFERENCIA = {
  entregue: 'Pagamento aprovado no Mercado Pago: fotos entregues agora.',
  aguardando: 'O Mercado Pago ainda não aprovou este pagamento.',
  divergente: 'O valor pago não corresponde ao pedido. Confira no Mercado Pago antes de entregar.',
};

function quando(valor) {
  const data = new Date(valor || 0);
  return Number.isNaN(data.getTime()) || !valor ? '' : dataHora.format(data);
}

function expirado(download) {
  const data = new Date(download.expiresAt || 0);
  return !Number.isNaN(data.getTime()) && Boolean(download.expiresAt) && data.getTime() < Date.now();
}

function Atencao({ itens, onSelecionar }) {
  if (!itens.length) return null;
  return (
    <section className="pascom-card pascom-atencao" aria-labelledby="pascom-atencao-titulo">
      <div className="pascom-toolbar">
        <div>
          <span className="pascom-eyebrow">Atendimento</span>
          <h2 id="pascom-atencao-titulo">Precisam de atenção</h2>
        </div>
      </div>
      <ul className="pascom-atencao-list">
        {itens.map((item) => (
          <li key={`${item.pedidoId}-${item.tipo}`} className={item.severidade === 'erro' ? 'is-erro' : 'is-aviso'}>
            <button type="button" onClick={() => onSelecionar(item.pedidoId)}>
              <strong>{item.severidade === 'erro' ? 'Resolver: ' : 'Aguardando: '}{item.motivo}</strong>
              <span>
                {item.pedidoId}
                {item.email ? ` · ${item.email}` : ''}
                {item.total ? ` · ${currency.format(item.total)}` : ''}
              </span>
              {item.detalhe && <small>{item.detalhe}</small>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function OrdersTab({ getToken }) {
  const [dashboard, setDashboard] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ q: '', status: '', atencao: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [working, setWorking] = useState('');

  const withToken = useCallback(async (fn) => {
    const token = await getToken();
    return fn(token);
  }, [getToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const [dashboardResult, pedidosResult] = await Promise.all([
        pascomDashboard(token),
        pascomPedidos(token, filters),
      ]);
      setDashboard(dashboardResult.dashboard);
      setPedidos(pedidosResult.pedidos);
      setSelectedId((current) => current || pedidosResult.pedidos[0]?.id || '');
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, [filters, getToken]);

  useEffect(() => { load(); }, [load]);

  const recarregarDetalhe = useCallback(async () => {
    if (!selectedId) return;
    setDetail(await withToken((token) => pascomPedidoDetalhe(token, selectedId)));
  }, [selectedId, withToken]);

  useEffect(() => {
    let alive = true;
    if (!selectedId) {
      setDetail(null);
      return undefined;
    }
    withToken((token) => pascomPedidoDetalhe(token, selectedId))
      .then((result) => alive && setDetail(result))
      .catch((cause) => alive && setError(cause.message));
    return () => { alive = false; };
  }, [selectedId, withToken]);

  const executar = useCallback(async (nome, trabalho, mensagem) => {
    if (!selectedId) return;
    setWorking(nome);
    setAction('');
    setError('');
    try {
      const result = await withToken((token) => trabalho(token, selectedId));
      setAction(mensagem(result));
      await recarregarDetalhe();
      const token = await getToken();
      const [dashboardResult, pedidosResult] = await Promise.all([
        pascomDashboard(token),
        pascomPedidos(token, filters),
      ]);
      setDashboard(dashboardResult.dashboard);
      setPedidos(pedidosResult.pedidos);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setWorking('');
    }
  }, [filters, getToken, recarregarDetalhe, selectedId, withToken]);

  const reenviar = () => {
    const confirmado = window.confirm(
      'O comprador vai receber um novo e-mail com links novos. Os links enviados antes deixam de funcionar. Reenviar a entrega?'
    );
    if (!confirmado) return;
    executar('reenviar', pascomReenviarEntrega, (result) => (
      result.emailStatus === 'enviado'
        ? 'Entrega reenviada: o e-mail com os links novos saiu agora.'
        : `Links novos gerados, mas o e-mail não saiu (${result.emailError || result.emailStatus}). Use o link do WhatsApp abaixo.`
    ));
  };

  const conferir = () => executar('conferir', pascomConferirMercadoPago, (result) => (
    SITUACAO_CONFERENCIA[result.situacao] || 'Conferência concluída.'
  ));

  const regenerar = () => {
    const confirmado = window.confirm(
      'Isso gera links novos sem enviar e-mail. Os links que o comprador já tem deixam de funcionar. Continuar?'
    );
    if (!confirmado) return;
    executar('regenerar', pascomRegenerarDownloads, (result) => `${result.downloads.length} link(s) gerado(s), sem enviar e-mail.`);
  };

  const stats = useMemo(() => [
    ['Vendas hoje', currency.format(dashboard?.revenueToday || 0)],
    ['Pedidos hoje', dashboard?.ordersToday ?? 0],
    ['Mês atual', currency.format(dashboard?.revenueMonth || 0)],
    ['Downloads ativos', dashboard?.activeDownloads ?? 0],
    ['Pedidos pendentes', dashboard?.pendingOrders ?? 0],
    ['Entregas com problema', dashboard?.deliveryIssues ?? 0],
  ], [dashboard]);

  const atencao = dashboard?.atencao || [];
  const pedido = detail?.pedido;
  const aprovado = pedido?.status === 'Pagamento Confirmado';
  const emailRotulo = pedido ? (EMAIL_ROTULO[pedido.emailStatus] || 'Entrega não registrada') : '';

  return (
    <>
      {error && <div className="pascom-alert">{error}</div>}
      {action && <div className="pascom-alert success">{action}</div>}

      {/* O que precisa de alguem vem antes dos numeros: no celular, seis blocos empurrariam o resto para fora da tela. */}
      <Atencao itens={atencao} onSelecionar={setSelectedId} />

      <section className="pascom-stat-grid is-seis">
        {stats.map(([label, value]) => <article className="pascom-stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </section>

      <section className="pascom-grid">
        <div className="pascom-card">
          <div className="pascom-toolbar">
            <div>
              <span className="pascom-eyebrow">Pedidos</span>
              <h2>Atendimento e suporte</h2>
            </div>
            <button className="pascom-secondary" onClick={load} disabled={loading}>{loading ? 'Carregando...' : 'Atualizar'}</button>
          </div>
          <div className="pascom-filters">
            <input value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} placeholder="Buscar por pedido, e-mail ou WhatsApp" />
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">Todos os status</option>
              <option value="Pagamento Confirmado">Pagamento confirmado</option>
              <option value="Pagamento Pendente">Aguardando pagamento</option>
              <option value="PagamentoDivergente">Valor pago divergente</option>
            </select>
            <label className="pascom-check">
              <input
                type="checkbox"
                checked={filters.atencao === 'true'}
                onChange={(event) => setFilters({ ...filters, atencao: event.target.checked ? 'true' : '' })}
              />
              Só os que precisam de atenção
            </label>
          </div>
          <div className="pascom-order-list">
            {pedidos.map((item) => (
              <button key={item.id} className={item.id === selectedId ? 'active' : ''} onClick={() => setSelectedId(item.id)}>
                <strong>{item.id}</strong>
                <span>{item.email || item.whatsapp || item.name}</span>
                <small>{rotuloStatus(item.status)} · {currency.format(item.total || 0)}</small>
              </button>
            ))}
            {!loading && pedidos.length === 0 && <p className="pascom-empty">Nenhum pedido encontrado.</p>}
          </div>
        </div>

        <div className="pascom-card pascom-detail">
          <span className="pascom-eyebrow">Detalhe</span>
          {!detail && <p className="pascom-empty">Selecione um pedido para ver itens, downloads e entrega.</p>}
          {detail && (
            <>
              <h2>{pedido.id}</h2>
              <dl className="pascom-definition">
                <div><dt>Status</dt><dd>{rotuloStatus(pedido.status)}{pedido.paidAt ? ` · ${quando(pedido.paidAt)}` : ''}</dd></div>
                <div><dt>Comprador</dt><dd>{pedido.name || pedido.email}</dd></div>
                <div><dt>Contato</dt><dd>{pedido.email}<br />{pedido.whatsapp}</dd></div>
                <div><dt>Total</dt><dd>{currency.format(pedido.total || 0)}</dd></div>
                <div>
                  <dt>Pagamento</dt>
                  <dd>
                    {pedido.paymentMethod || 'não informado'}
                    {pedido.paymentId ? <><br /><span className="pascom-break">{pedido.paymentId}</span></> : ''}
                  </dd>
                </div>
                <div>
                  <dt>Desconto</dt>
                  <dd>
                    {pedido.discountTotal > 0
                      ? `${currency.format(pedido.discountTotal)}${pedido.couponCode ? ` · cupom ${pedido.couponCode}` : ''}${pedido.packageId ? ` · pacote ${pedido.packageId}` : ''}`
                      : 'sem desconto'}
                  </dd>
                </div>
                <div>
                  <dt>Entrega</dt>
                  <dd>
                    {emailRotulo}
                    {pedido.emailSentAt ? <><br />{quando(pedido.emailSentAt)}</> : ''}
                    {!pedido.emailSentAt && pedido.emailAttemptedAt ? <><br />tentativa em {quando(pedido.emailAttemptedAt)}</> : ''}
                    {pedido.deliveryAttempts > 0 ? <><br />{pedido.deliveryAttempts} tentativa(s)</> : ''}
                  </dd>
                </div>
                <div><dt>Criado em</dt><dd>{quando(pedido.createdAt) || '—'}</dd></div>
              </dl>

              {pedido.emailError && (
                <ul className="pascom-falhas-list">
                  <li>{pedido.emailError}</li>
                </ul>
              )}

              <h3>Fotos compradas</h3>
              <ul className="pascom-lines">
                {detail.itens.map((item) => (
                  <li key={`${item.fotoId}-${item.eventoId}`}><span>{item.eventTitle}</span><strong>{item.fotoId}</strong></li>
                ))}
              </ul>

              <h3>Downloads</h3>
              <ul className="pascom-lines">
                {detail.downloads.map((download) => (
                  <li key={download.downloadId}>
                    <span>
                      {download.fotoId}
                      <br />
                      <small>
                        {expirado(download)
                          ? `expirou em ${quando(download.expiresAt)}`
                          : `vale até ${quando(download.expiresAt) || 'sem data'}`}
                      </small>
                    </span>
                    <strong>{download.uses}/{download.maxUses}</strong>
                  </li>
                ))}
                {detail.downloads.length === 0 && <li><span>Nenhum link gerado ainda.</span></li>}
              </ul>

              {pedido.whatsappLink && (
                <p className="pascom-whatsapp-link">
                  <a href={pedido.whatsappLink} target="_blank" rel="noreferrer">Abrir conversa no WhatsApp com os links</a>
                </p>
              )}

              <div className="pascom-order-actions">
                <button className="pascom-primary" onClick={reenviar} disabled={!aprovado || Boolean(working)}>
                  {working === 'reenviar' ? 'Reenviando...' : 'Reenviar entrega'}
                </button>
                <button className="pascom-secondary" onClick={conferir} disabled={Boolean(working)}>
                  {working === 'conferir' ? 'Conferindo...' : 'Conferir no Mercado Pago'}
                </button>
                <button className="pascom-secondary" onClick={regenerar} disabled={!aprovado || Boolean(working)}>
                  {working === 'regenerar' ? 'Gerando...' : 'Gerar links sem e-mail'}
                </button>
              </div>
              {!aprovado && (
                <p className="pascom-empty">
                  Reenviar a entrega só vale para pedido aprovado. Use &quot;Conferir no Mercado Pago&quot; para saber se o pagamento saiu.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
