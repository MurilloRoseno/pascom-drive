// Saude da entrega: a partir da linha do pedido, decide o que ainda falta fazer e o que
// precisa aparecer para a equipe. Funcoes puras, usadas pela conciliacao automatica
// (lib/order-fulfillment.js) e pela lista do Painel Pascom (lib/google-sheets.pascom.js).

const STATUS_CONFIRMADO = 'Pagamento Confirmado';
const STATUS_DIVERGENTE = 'PagamentoDivergente';

const MAX_TENTATIVAS_EMAIL = 3;
// Espera antes de cada nova tentativa de e-mail (1a, 2a e 3a).
const ESPERAS_MS = [5 * 60 * 1000, 20 * 60 * 1000, 60 * 60 * 1000];

// Um pedido recem-criado ainda esta com o comprador no Mercado Pago: nao vale conferir.
const IDADE_MINIMA_PENDENTE_MS = 10 * 60 * 1000;
// Depois de 72 h um Pix pendente expirou; o pedido deixa de ser conferido e de ser cobrado.
const JANELA_CONCILIACAO_MS = 72 * 60 * 60 * 1000;
const PENDENTE_PREOCUPANTE_MS = 60 * 60 * 1000;

// Reenvio automatico so para quem pagou agora: reemitir um link revoga o anterior, e um
// pedido antigo pode ter sido entregue pelo WhatsApp com o link que ainda esta nas maos do
// comprador.
const JANELA_REENVIO_MS = 72 * 60 * 60 * 1000;
const EMAIL_PARA_TENTAR = ['falhou', 'pendente'];

function idadeMs(iso, agora) {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? agora - t : Infinity;
}

function ehPendente(status) {
  return /pendente|pending|in_process|authorized/i.test(String(status || ''));
}

function esperaCumprida(pedido, agora) {
  const proxima = Date.parse(pedido.deliveryNextAt || '');
  return !Number.isFinite(proxima) || proxima <= agora;
}

function problema(tipo, severidade, motivo, detalhe = '') {
  return { tipo, severidade, motivo, detalhe };
}

/**
 * @param {object} pedido linha de Pedidos normalizada (ver pedidoEntregaFromRow)
 * @param {{agora?: number, temDownload?: boolean}} contexto
 * @returns {{tarefa: string, problema: object|null}} tarefa: '', 'conciliar', 'entregar' ou 'reenviar'
 */
function classificarEntrega(pedido, contexto = {}) {
  const agora = Number(contexto.agora) || Date.now();
  const temDownload = Boolean(contexto.temDownload);
  const status = String(pedido.status || '');
  const emailStatus = String(pedido.emailStatus || '');
  const tentativas = Number(pedido.deliveryAttempts || 0);

  if (status === STATUS_DIVERGENTE) {
    return {
      tarefa: '',
      problema: problema('pagamento_divergente', 'erro', 'O valor pago nao corresponde ao pedido',
        pedido.emailError || 'Confira o pagamento no Mercado Pago antes de entregar.'),
    };
  }

  if (status === STATUS_CONFIRMADO) {
    if (!temDownload) {
      return {
        tarefa: 'entregar',
        problema: problema('pago_sem_entrega', 'erro', 'Pago, mas sem nenhum link de download gerado'),
      };
    }
    if (emailStatus === 'nao_configurado') {
      return {
        tarefa: '',
        problema: problema('email_nao_configurado', 'aviso', 'E-mail nao configurado quando este pedido foi pago',
          'Envie os links pelo WhatsApp ou use "Reenviar entrega" depois de configurar o SMTP.'),
      };
    }
    if (EMAIL_PARA_TENTAR.includes(emailStatus)) {
      const recente = idadeMs(pedido.paidAt || pedido.createdAt, agora) < JANELA_REENVIO_MS;
      if (tentativas >= MAX_TENTATIVAS_EMAIL || !recente) {
        return {
          tarefa: '',
          problema: problema('email_falhou', 'erro', 'O e-mail com as fotos nao foi entregue',
            pedido.emailError || ''),
        };
      }
      return {
        tarefa: esperaCumprida(pedido, agora) ? 'reenviar' : '',
        problema: problema('email_pendente', 'aviso', 'O e-mail com as fotos ainda nao saiu',
          pedido.emailError || ''),
      };
    }
    return { tarefa: '', problema: null };
  }

  if (ehPendente(status)) {
    const idade = idadeMs(pedido.createdAt, agora);
    if (idade < IDADE_MINIMA_PENDENTE_MS || idade > JANELA_CONCILIACAO_MS) {
      return { tarefa: '', problema: null };
    }
    return {
      tarefa: 'conciliar',
      problema: idade > PENDENTE_PREOCUPANTE_MS
        ? problema('pendente_sem_confirmacao', 'aviso', 'Pendente ha mais de uma hora',
          'A conferencia com o Mercado Pago roda a cada 5 minutos.')
        : null,
    };
  }

  return { tarefa: '', problema: null };
}

/** Espera antes da proxima tentativa de e-mail; string vazia quando nao havera outra. */
function proximaTentativaEm(tentativas, agora = Date.now()) {
  if (tentativas < 1 || tentativas >= MAX_TENTATIVAS_EMAIL) return '';
  return new Date(agora + ESPERAS_MS[tentativas - 1]).toISOString();
}

function resumirProblemas(problemas) {
  return {
    erros: problemas.filter((item) => item.severidade === 'erro').length,
    avisos: problemas.filter((item) => item.severidade === 'aviso').length,
  };
}

module.exports = {
  STATUS_CONFIRMADO,
  STATUS_DIVERGENTE,
  MAX_TENTATIVAS_EMAIL,
  ESPERAS_MS,
  IDADE_MINIMA_PENDENTE_MS,
  JANELA_CONCILIACAO_MS,
  classificarEntrega,
  proximaTentativaEm,
  resumirProblemas,
  ehPendente,
  idadeMs,
};
