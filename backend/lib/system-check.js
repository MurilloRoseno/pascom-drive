// Checklist de producao do Painel Pascom (funcoes puras).
// So verifica se cada configuracao existe: nenhum valor de segredo entra na resposta.

const GRUPOS = [
  ['pagamentos', 'Pagamentos'],
  ['planilha', 'Planilha e Drive'],
  ['envio', 'Envio pelo painel'],
  ['automacao', 'Automação'],
  ['entregas', 'Entregas'],
  ['galerias', 'Galerias'],
  ['site', 'Site'],
];

const ABAS_OBRIGATORIAS = ['Eventos', 'Fotos', 'Pedidos', 'ItensPedido', 'Webhooks', 'Downloads', 'RegrasPagamento', 'EquipePascom'];
const ABAS_OPCIONAIS = ['Cupons', 'Pacotes'];

const LIMITE_EXECUCAO_ATRASADA_MS = 20 * 60 * 1000;
const LIMITE_CONCILIACAO_ATRASADA_MS = 20 * 60 * 1000;
const LIMITE_LOCK_PRESO_MS = 15 * 60 * 1000;
const LIMITE_ENVIO_ESQUECIDO_MS = 24 * 60 * 60 * 1000;
const ESPACO_AVISO = 0.8;
const ESPACO_ERRO = 0.95;

const DOC_VERCEL = 'Configure na Vercel (Settings > Environment Variables) e faça um novo deploy. Veja docs/setup-environment.md.';
const DOC_SCRIPT = 'No editor do Apps Script: Configurações do projeto > Propriedades do script. Veja google-apps-script/DEPLOY.md.';

function item(grupo, id, estado, titulo, orientacao = '') {
  return { id, grupo, estado, titulo, orientacao: estado === 'ok' ? '' : orientacao };
}

function presente(env, ...nomes) {
  return nomes.some((nome) => Boolean(String(env[nome] || '').trim()));
}

function exige(env, grupo, id, titulo, nomes, orientacao, estadoFaltando = 'erro') {
  const ok = presente(env, ...nomes);
  return item(grupo, id, ok ? 'ok' : estadoFaltando, titulo, `${orientacao} ${DOC_VERCEL}`.trim());
}

/** Variaveis da Vercel. So olha presenca, nunca o valor. */
function verificarAmbiente(env = process.env) {
  const sandbox = String(env.MP_USE_SANDBOX || '').toLowerCase() === 'true';
  const itens = [
    exige(env, 'pagamentos', 'mp_token', 'Token do Mercado Pago', ['MP_ACCESS_TOKEN'],
      'Sem MP_ACCESS_TOKEN o checkout não abre.'),
    exige(env, 'pagamentos', 'mp_webhook', 'Assinatura do webhook do Mercado Pago', ['MP_WEBHOOK_SECRET'],
      'Sem MP_WEBHOOK_SECRET os pagamentos aprovados não são confirmados e as fotos não são entregues.'),
    item('pagamentos', 'mp_producao', sandbox ? 'aviso' : 'ok',
      sandbox ? 'Mercado Pago em modo de teste' : 'Mercado Pago em modo de produção',
      'MP_USE_SANDBOX=true: os pagamentos são de teste e ninguém é cobrado. Remova a variável para vender de verdade.'),
    exige(env, 'planilha', 'conta_servico', 'Conta de serviço do Google', ['GOOGLE_SERVICE_ACCOUNT_EMAIL'],
      'Defina GOOGLE_SERVICE_ACCOUNT_EMAIL.'),
    exige(env, 'planilha', 'chave_servico', 'Chave da conta de serviço', ['GOOGLE_PRIVATE_KEY', 'GOOGLE_PRIVATE_KEY_B64'],
      'Defina GOOGLE_PRIVATE_KEY (ou GOOGLE_PRIVATE_KEY_B64).'),
    exige(env, 'planilha', 'planilha_id', 'Planilha configurada', ['SPREADSHEET_ID'], 'Defina SPREADSHEET_ID.'),
    exige(env, 'envio', 'webapp_url', 'Endereço do Web App do Apps Script', ['UPLOAD_WEBAPP_URL'],
      'Defina UPLOAD_WEBAPP_URL com a URL /exec da implantação do Web App.'),
    exige(env, 'envio', 'hmac', 'Segredo compartilhado com o Apps Script', ['APPS_SCRIPT_HMAC_SECRET'],
      'Defina APPS_SCRIPT_HMAC_SECRET com o mesmo valor da propriedade do Apps Script.'),
    exige(env, 'entregas', 'download_jwt', 'Assinatura dos links de download', ['DOWNLOAD_JWT_SECRET'],
      'Sem DOWNLOAD_JWT_SECRET os links de download das fotos compradas não funcionam.'),
    exige(env, 'entregas', 'forense', 'Marca forense dos downloads', ['FORENSIC_WATERMARK_SECRET'],
      'Sem FORENSIC_WATERMARK_SECRET os downloads falham.'),
    item('entregas', 'smtp', presente(env, 'SMTP_USER') && presente(env, 'SMTP_APP_PASSWORD') ? 'ok' : 'aviso',
      'E-mail de entrega',
      `Sem SMTP_USER e SMTP_APP_PASSWORD o comprador não recebe o e-mail; a entrega fica só pelo link de WhatsApp. ${DOC_VERCEL}`),
    exige(env, 'galerias', 'midia', 'Assinatura das prévias', ['MEDIA_TOKEN_SECRET', 'GALLERY_SESSION_SECRET', 'DOWNLOAD_JWT_SECRET'],
      'Defina MEDIA_TOKEN_SECRET para assinar as prévias das galerias.'),
    exige(env, 'galerias', 'codigo_sal', 'Proteção dos códigos de acesso', ['GALLERY_CODE_SALT'],
      'Defina GALLERY_CODE_SALT com o mesmo valor da propriedade do Apps Script; sem ele os códigos não conferem.'),
    exige(env, 'site', 'endereco', 'Endereço público do site', ['PUBLIC_APP_URL', 'FRONTEND_URL'],
      'Defina PUBLIC_APP_URL; ele entra nos links de compartilhamento e de download.', 'aviso'),
    exige(env, 'site', 'cache', 'Atualização do site após mudanças', ['CACHE_INVALIDATION_SECRET'],
      'Sem CACHE_INVALIDATION_SECRET o site demora a mostrar eventos publicados.', 'aviso'),
  ];
  return itens;
}

/** Abas da planilha: `abas` e o conjunto de titulos existentes (null = planilha inacessivel). */
function verificarPlanilha(abas, eventosComErro = 0) {
  if (!abas) {
    return [item('planilha', 'planilha_acesso', 'erro', 'Acesso à planilha',
      'O backend não conseguiu abrir a planilha. Confira SPREADSHEET_ID e se a planilha foi compartilhada com a conta de serviço como Editor.')];
  }
  const faltando = ABAS_OBRIGATORIAS.filter((aba) => !abas.has(aba));
  const opcionais = ABAS_OPCIONAIS.filter((aba) => !abas.has(aba));
  const itens = [
    item('planilha', 'planilha_acesso', 'ok', 'Acesso à planilha'),
    item('planilha', 'abas', faltando.length ? 'erro' : (opcionais.length ? 'aviso' : 'ok'), 'Abas da planilha',
      faltando.length
        ? `Faltam as abas ${faltando.join(', ')}. Rode "Preparar estrutura segura" no menu Pascom Drive da planilha.`
        : `As abas ${opcionais.join(', ')} ainda não existem; cupons e pacotes ficam desativados.`),
  ];
  if (eventosComErro > 0) {
    itens.push(item('automacao', 'eventos_erro', 'aviso', 'Eventos com fotos que falharam',
      `${eventosComErro} evento(s) terminaram com erro de processamento. Abra a aba Eventos para ver quais.`));
  }
  return itens;
}

function falhaAppsScript(erro) {
  const codigo = erro?.codigo || '';
  if (codigo === 'nao_configurado') {
    return item('envio', 'webapp', 'erro', 'Web App do Apps Script',
      'Defina UPLOAD_WEBAPP_URL e APPS_SCRIPT_HMAC_SECRET na Vercel para o painel falar com o Apps Script.');
  }
  if (codigo === 'assinatura_invalida') {
    return item('envio', 'webapp', 'erro', 'Web App do Apps Script',
      'O Apps Script recusou a assinatura: o APPS_SCRIPT_HMAC_SECRET da Vercel é diferente do configurado nas propriedades do Apps Script (ou os relógios estão muito diferentes).');
  }
  if (codigo === 'acao_invalida') {
    return item('envio', 'webapp', 'erro', 'Web App do Apps Script',
      'O Web App publicado é de uma versão antiga. No editor do Apps Script: Implantar > Gerenciar implantações > editar > Nova versão.');
  }
  return item('envio', 'webapp', 'erro', 'Web App do Apps Script',
    `Não foi possível falar com o Apps Script (${erro?.message || 'sem resposta'}). Confira a URL /exec e se a implantação dá acesso a "Qualquer pessoa".`);
}

function idade(iso, agora) {
  const t = Date.parse(iso || '');
  return Number.isFinite(t) ? agora - t : Infinity;
}

/** Transforma a resposta de `diagnostico` do Apps Script em itens do checklist. */
function interpretarDiagnostico(diag, versaoEsperada, agora = Date.now()) {
  const itens = [];
  const versaoOk = Number(diag.versao) === Number(versaoEsperada);
  itens.push(item('envio', 'webapp', versaoOk ? 'ok' : 'erro', 'Web App do Apps Script',
    'O Web App publicado é de uma versão antiga. Rode "npm run push:production" e publique uma nova versão da implantação.'));

  const propriedades = diag.propriedades || {};
  const faltando = Object.keys(propriedades).filter((nome) => propriedades[nome].obrigatoria && !propriedades[nome].presente);
  itens.push(item('automacao', 'propriedades', faltando.length ? 'erro' : 'ok', 'Propriedades do Apps Script',
    `Faltam as propriedades ${faltando.join(', ')}. ${DOC_SCRIPT}`));
  if (propriedades.ADMIN_EMAIL && !propriedades.ADMIN_EMAIL.presente) {
    itens.push(item('automacao', 'admin_email', 'aviso', 'E-mail do administrador',
      `Sem ADMIN_EMAIL ninguém recebe os avisos de erro e de espaço no Drive. ${DOC_SCRIPT}`));
  }

  const pastas = diag.pastas || {};
  const nomesPastas = { origem: 'Fotos_Origem', originais: 'originais', previas: 'prévias', miniaturas: 'miniaturas' };
  const problemas = Object.keys(pastas)
    .filter((nome) => pastas[nome] !== 'ok' && !(nome === 'miniaturas' && pastas[nome] === 'ausente'))
    .map((nome) => `${nomesPastas[nome] || nome} (${pastas[nome].replace('_', ' ')})`);
  itens.push(item('planilha', 'pastas', problemas.length ? 'erro' : 'ok', 'Pastas do Drive',
    `Problema nas pastas: ${problemas.join(', ')}. Confira os IDs nas propriedades do Apps Script e se as pastas não foram apagadas.`));

  itens.push(item('automacao', 'gatilho', diag.gatilho ? 'ok' : 'erro', 'Processamento automático a cada 5 minutos',
    'O gatilho não está instalado: fotos enviadas nunca serão processadas. No editor do Apps Script, rode a função criarTriggers uma vez.'));

  const execucao = diag.ultimaExecucao;
  const atraso = idade(execucao?.fim, agora);
  let execucaoEstado = 'ok';
  let execucaoTexto = '';
  if (!execucao) {
    execucaoEstado = 'aviso';
    execucaoTexto = 'Ainda não há registro de execução. Ele aparece alguns minutos depois de publicar esta versão.';
  } else if (atraso > LIMITE_EXECUCAO_ATRASADA_MS) {
    execucaoEstado = diag.gatilho ? 'erro' : 'aviso';
    execucaoTexto = 'A última execução foi há mais de 20 minutos. Veja Execuções no editor do Apps Script; pode ser falta de autorização ou cota esgotada.';
  } else if (execucao.resultado === 'erro') {
    execucaoEstado = 'aviso';
    execucaoTexto = `A última execução terminou com erro${execucao.erro ? `: ${execucao.erro}` : '.'}`;
  }
  itens.push(item('automacao', 'execucao', execucaoEstado, 'Última execução do processamento', execucaoTexto));

  if (diag.lock && idade(diag.lock.desde, agora) > LIMITE_LOCK_PRESO_MS) {
    itens.push(item('automacao', 'lock', 'aviso', 'Processamento travado',
      'Um evento está marcado como "em processamento" há mais de 15 minutos. A trava se solta sozinha; se continuar, veja Execuções no Apps Script.'));
  }

  const quarentena = diag.quarentena || [];
  itens.push(item('automacao', 'quarentena', quarentena.length ? 'aviso' : 'ok', 'Pastas em quarentena',
    `${quarentena.length} pasta(s) com erro em Fotos_Origem. Corrija o nome ou as fotos no Drive e tire o prefixo _ERRO_ para processar de novo.`));

  const enviando = diag.enviando || {};
  if (enviando.quantidade > 0 && idade(enviando.maisAntigo, agora) > LIMITE_ENVIO_ESQUECIDO_MS) {
    itens.push(item('envio', 'envios_abertos', 'aviso', 'Envios esquecidos',
      'Há envios de fotos abertos há mais de 24 horas. Eles vão para a lixeira em 48 horas; conclua ou cancele pela aba Enviar fotos.'));
  }

  const conciliacao = diag.conciliacao;
  const atrasoConciliacao = idade(conciliacao && conciliacao.quando, agora);
  if (!conciliacao) {
    itens.push(item('entregas', 'conciliacao', 'aviso', 'Conferência dos pagamentos',
      'A conferência com o Mercado Pago ainda não rodou. Ela roda junto do gatilho de 5 minutos; aparece aqui depois de publicar esta versão.'));
  } else if (atrasoConciliacao > LIMITE_CONCILIACAO_ATRASADA_MS) {
    itens.push(item('entregas', 'conciliacao', 'erro', 'Conferência dos pagamentos',
      'A conferência com o Mercado Pago não roda há mais de 20 minutos: um pagamento aprovado pode ficar sem entrega. Confira BACKEND_URL nas propriedades do Apps Script e as Execuções no editor.'));
  } else if (conciliacao.erro) {
    itens.push(item('entregas', 'conciliacao', 'erro', 'Conferência dos pagamentos',
      `A última conferência falhou: ${conciliacao.erro}`));
  } else {
    itens.push(item('entregas', 'conciliacao', 'ok', 'Conferência dos pagamentos'));
  }
  const pedidosComProblema = (conciliacao && conciliacao.resumo) || {};
  if (pedidosComProblema.erros > 0 || pedidosComProblema.avisos > 0) {
    itens.push(item('entregas', 'entregas_atencao', pedidosComProblema.erros > 0 ? 'erro' : 'aviso',
      'Pedidos que precisam de atenção',
      `${pedidosComProblema.erros || 0} pedido(s) com problema e ${pedidosComProblema.avisos || 0} em espera. Abra a aba Pedidos: lá dá para reenviar a entrega e conferir no Mercado Pago.`));
  }

  const armazenamento = diag.armazenamento || {};
  if (armazenamento.limite > 0) {
    const uso = armazenamento.usado / armazenamento.limite;
    let estado = 'ok';
    if (uso >= ESPACO_ERRO) estado = 'erro';
    else if (uso >= ESPACO_AVISO) estado = 'aviso';
    itens.push(item('planilha', 'espaco', estado, 'Espaço no Drive',
      `O Drive está com ${Math.round(uso * 100)}% de uso. Libere espaço de eventos arquivados na seção abaixo.`));
  }
  return itens;
}

function resumir(itens) {
  return {
    erros: itens.filter((i) => i.estado === 'erro').length,
    avisos: itens.filter((i) => i.estado === 'aviso').length,
  };
}

/** Um item por id: o diagnostico do Apps Script tem precedencia sobre a checagem local. */
function consolidar(...listas) {
  const porId = new Map();
  listas.flat().forEach((entrada) => porId.set(entrada.id, entrada));
  const ordem = new Map(GRUPOS.map(([id], index) => [id, index]));
  return [...porId.values()].sort((a, b) => (ordem.get(a.grupo) ?? 99) - (ordem.get(b.grupo) ?? 99));
}

module.exports = {
  GRUPOS, ABAS_OBRIGATORIAS, verificarAmbiente, verificarPlanilha, interpretarDiagnostico, falhaAppsScript,
  resumir, consolidar,
};
