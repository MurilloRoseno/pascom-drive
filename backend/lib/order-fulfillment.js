// Entrega de pedidos pagos: o unico caminho que emite links e envia o e-mail.
// Tres gatilhos usam estas funcoes: o webhook do Mercado Pago, a conciliacao automatica
// (chamada pelo gatilho de 5 minutos do Apps Script) e os botoes do Painel Pascom.
// Tudo e idempotente: reemitir mantem uma linha por foto e revoga o link anterior.

const {
  rows, atualizarPedidoPagamento, marcarPedidoDivergente, registrarEntrega,
  auditarConsistenciaComercial,
} = require('./google-sheets');
const { criarDownloadsDoPedido, enviarEmailEntrega, criarLinkWhatsApp } = require('./delivery');
const { consultarPagamento, buscarPagamentosDoPedido, listarPagamentosRecentes } = require('./mercado-pago');
const {
  MAX_TENTATIVAS_EMAIL, JANELA_CONCILIACAO_MS,
  classificarEntrega, proximaTentativaEm, resumirProblemas,
} = require('./delivery-health');

// A rota da Vercel tem 30 s (vercel.json): a varredura para antes e o que sobrar fica
// para o proximo ciclo de 5 minutos.
const ORCAMENTO_PADRAO_MS = 20000;
const ORCAMENTO_MINIMO_MS = 2000;
// Teto por ciclo: cada entrega faz varias leituras e escritas na planilha.
const MAX_TAREFAS_POR_CICLO = 8;
const TOLERANCIA_VALOR = 0.01;

const GRAVIDADE_AUDITORIA = { critical: 'erro', high: 'erro', medium: 'aviso', low: 'aviso' };
const MOTIVO_AUDITORIA = {
  download_without_purchased_item: 'Link de download de uma foto que nao esta no pedido',
  paid_order_without_downloads: 'Pago, mas sem nenhum link de download gerado',
  payment_divergent: 'O valor pago nao corresponde ao pedido',
  duplicated_webhook_key: 'Notificacao do Mercado Pago registrada duas vezes',
};

function pedidoEntregaFromRow(row) {
  return {
    id: row.get('PedidoID') || '',
    status: row.get('Status') || '',
    name: row.get('Nome') || '',
    email: row.get('Email') || '',
    whatsapp: row.get('WhatsApp') || '',
    total: Number(row.get('Total') || 0),
    createdAt: row.get('DataCriacao') || '',
    paidAt: row.get('DataPagamento') || '',
    emailStatus: row.get('EmailStatus') || '',
    emailError: row.get('EmailErro') || '',
    deliveryAttempts: Number(row.get('EntregaTentativas') || 0),
    deliveryNextAt: row.get('EntregaProximaEm') || '',
  };
}

/** Moeda e valor do pagamento aprovado contra o total gravado no pedido. */
function conferirValor(payment, pedido) {
  const esperado = Number(pedido.total || 0);
  const pago = Number(payment.transaction_amount || 0);
  const moeda = String(payment.currency_id || '');
  if (moeda !== 'BRL' || Math.abs(pago - esperado) > TOLERANCIA_VALOR) {
    return { ok: false, motivo: 'Valor ou moeda divergente no Mercado Pago', esperado, pago, moeda };
  }
  return { ok: true, esperado, pago, moeda };
}

function mensagem(erro) {
  return String((erro && erro.message) || erro || '');
}

function registrarLog(evento, severidade, dados) {
  console.warn(JSON.stringify({ event: evento, severity: severidade, ...dados, ts: new Date().toISOString() }));
}

/**
 * Emite (ou reemite) os links do pedido e manda o e-mail. Guarda o resultado em Pedidos,
 * junto do contador de tentativas que a conciliacao usa para tentar de novo.
 */
async function entregarPedidoPago(pedido, opcoes = {}) {
  const downloads = await criarDownloadsDoPedido(pedido);
  const emailResult = await enviarEmailEntrega(pedido, downloads);
  const whatsappLink = criarLinkWhatsApp(pedido, downloads);
  const enviado = emailResult.status === 'enviado';
  const tentativas = enviado ? 0 : Number(pedido.deliveryAttempts || 0) + 1;
  const proximaEm = enviado ? '' : proximaTentativaEm(tentativas);
  await registrarEntrega(pedido.id, { emailResult, whatsappLink, tentativas, proximaEm });
  if (!enviado) {
    registrarLog('delivery_email_failed', tentativas >= MAX_TENTATIVAS_EMAIL ? 'critical' : 'warning', {
      pedidoId: pedido.id,
      motivo: opcoes.motivo || '',
      tentativas,
      emailStatus: emailResult.status,
      erro: emailResult.error || '',
    });
  }
  return { downloads, emailResult, whatsappLink, tentativas, entregue: enviado };
}

/** Pagamento confirmado com a entrega quebrada: entra na fila da conciliacao. */
async function marcarEntregaPendente(pedidoId, erro) {
  await registrarEntrega(pedidoId, {
    emailResult: {
      status: 'pendente',
      error: mensagem(erro).slice(0, 300),
      attemptedAt: new Date().toISOString(),
    },
    tentativas: 0,
    proximaEm: proximaTentativaEm(1),
  });
  registrarLog('delivery_deferred', 'critical', { pedidoId, erro: mensagem(erro) });
}

/**
 * Confere um pedido direto no Mercado Pago e entrega se estiver aprovado. Usado quando o
 * webhook nao chegou (assinatura trocada, limite de notificacoes, indisponibilidade).
 */
async function conciliarPedido(pedido) {
  const pagamentos = await buscarPagamentosDoPedido(pedido.id);
  const aprovado = pagamentos.find((item) => item.status === 'approved');
  if (!aprovado) {
    return { situacao: 'aguardando', statusMp: (pagamentos[0] && pagamentos[0].status) || '' };
  }
  const payment = await consultarPagamento(aprovado.id);
  const conferencia = conferirValor(payment, pedido);
  if (!conferencia.ok) {
    await marcarPedidoDivergente(pedido.id, conferencia.motivo, payment);
    registrarLog('payment_amount_mismatch', 'critical', {
      pedidoId: pedido.id,
      paymentId: String(payment.id || ''),
      expectedTotal: conferencia.esperado,
      paidAmount: conferencia.pago,
      currency: conferencia.moeda,
      origem: 'conciliacao',
    });
    return { situacao: 'divergente', motivo: conferencia.motivo };
  }
  const atualizado = await atualizarPedidoPagamento(pedido.id, payment);
  registrarLog('payment_reconciled', 'warning', {
    pedidoId: pedido.id,
    paymentId: String(payment.id || ''),
    statusAnterior: pedido.status,
  });
  const entrega = await entregarPedidoPago(
    { ...atualizado, deliveryAttempts: pedido.deliveryAttempts },
    { motivo: 'conciliacao' }
  );
  return { situacao: 'entregue', paymentId: String(payment.id || ''), entrega };
}

function problemaDeAuditoria(finding) {
  return {
    tipo: finding.type,
    severidade: GRAVIDADE_AUDITORIA[finding.severity] || 'aviso',
    motivo: MOTIVO_AUDITORIA[finding.type] || finding.type,
    detalhe: finding.fotoId || finding.webhookKey || '',
    pedidoId: finding.pedidoId || '',
  };
}

async function varrerPagamentosOrfaos(idsConhecidos, agora) {
  const pagamentos = await listarPagamentosRecentes({
    desde: new Date(agora - JANELA_CONCILIACAO_MS).toISOString(),
    ate: new Date(agora).toISOString(),
  });
  return pagamentos
    .filter((payment) => payment.status === 'approved')
    .filter((payment) => !idsConhecidos.has(String(payment.external_reference || '')))
    .map((payment) => ({
      tipo: 'pagamento_sem_pedido',
      severidade: 'erro',
      motivo: 'Pagamento aprovado sem pedido na planilha',
      detalhe: [
        'Pagamento ' + String(payment.id || ''),
        (payment.payer && payment.payer.email) || 'comprador sem e-mail no Mercado Pago',
      ].join(' de '),
      pedidoId: String(payment.external_reference || ''),
    }));
}

/**
 * Varredura chamada a cada 5 minutos: confere pendentes no Mercado Pago, entrega pedidos
 * pagos que ficaram sem link, tenta o e-mail de novo e roda a auditoria comercial.
 */
async function conciliarEntregas(opcoes = {}) {
  const inicio = Date.now();
  const agora = Number(opcoes.agora) || inicio;
  const orcamento = Math.max(Number(opcoes.limiteMs) || ORCAMENTO_PADRAO_MS, ORCAMENTO_MINIMO_MS);
  const resultado = {
    verificados: 0,
    conciliados: 0,
    entregues: 0,
    reenviados: 0,
    problemas: [],
    parcial: false,
    verificadoEm: new Date(agora).toISOString(),
  };

  const [pedidoRows, downloadRows] = await Promise.all([rows('Pedidos'), rows('Downloads')]);
  const comDownload = new Set(downloadRows.map((row) => row.get('PedidoID')));
  const pedidos = pedidoRows
    .map(pedidoEntregaFromRow)
    .filter((pedido) => pedido.id)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  resultado.verificados = pedidos.length;

  const fila = [];
  pedidos.forEach((pedido) => {
    const { tarefa, problema } = classificarEntrega(pedido, { agora, temDownload: comDownload.has(pedido.id) });
    if (problema) resultado.problemas.push({ ...problema, pedidoId: pedido.id });
    if (tarefa) fila.push({ pedido, tarefa });
  });

  if (fila.length > MAX_TAREFAS_POR_CICLO) resultado.parcial = true;

  for (const { pedido, tarefa } of fila.slice(0, MAX_TAREFAS_POR_CICLO)) {
    if (Date.now() - inicio > orcamento) {
      resultado.parcial = true;
      break;
    }
    try {
      if (tarefa === 'conciliar') {
        const conciliacao = await conciliarPedido(pedido);
        if (conciliacao.situacao === 'entregue') {
          resultado.conciliados += 1;
          resultado.entregues += 1;
        }
      } else if (tarefa === 'entregar') {
        await entregarPedidoPago(pedido, { motivo: tarefa });
        resultado.entregues += 1;
      } else {
        await entregarPedidoPago(pedido, { motivo: tarefa });
        resultado.reenviados += 1;
      }
    } catch (error) {
      resultado.problemas.push({
        tipo: 'falha_na_conciliacao',
        severidade: 'erro',
        motivo: 'Nao foi possivel concluir a entrega automatica',
        detalhe: mensagem(error).slice(0, 200),
        pedidoId: pedido.id,
      });
      registrarLog('reconciliation_failed', 'critical', { pedidoId: pedido.id, tarefa, erro: mensagem(error) });
    }
  }

  if (opcoes.auditoria !== false) {
    try {
      const findings = await auditarConsistenciaComercial();
      findings
        // Estes dois ja saem da classificacao acima, com o motivo em portugues.
        .filter((finding) => finding.type !== 'paid_order_without_downloads' && finding.type !== 'payment_divergent')
        .forEach((finding) => resultado.problemas.push(problemaDeAuditoria(finding)));
    } catch (error) {
      registrarLog('commercial_audit_failed', 'warning', { erro: mensagem(error) });
    }
  }

  if (opcoes.varredura) {
    try {
      const conhecidos = new Set(pedidos.map((pedido) => pedido.id));
      (await varrerPagamentosOrfaos(conhecidos, agora)).forEach((problema) => resultado.problemas.push(problema));
    } catch (error) {
      registrarLog('orphan_payment_sweep_failed', 'warning', { erro: mensagem(error) });
    }
  }

  resultado.resumo = resumirProblemas(resultado.problemas);
  return resultado;
}

module.exports = {
  ORCAMENTO_PADRAO_MS,
  MAX_TAREFAS_POR_CICLO,
  conferirValor,
  pedidoEntregaFromRow,
  entregarPedidoPago,
  marcarEntregaPendente,
  conciliarPedido,
  conciliarEntregas,
};
