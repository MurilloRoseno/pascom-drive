const limite = (v, max = 200) => String(v ?? '').split('?')[0].slice(0, max);

/**
 * POST /api/csp-report: coletor das violações da CSP em modo Report-Only. Aceita o formato antigo
 * (`report-uri`: { "csp-report": {...} }) e o novo (`report-to`: lista de { body }). Só registra no
 * log do servidor, sem planilha e sem resposta com dados: o corpo é descartado, só alguns campos
 * viram uma linha de log, sem query string (podem ter token) e com tamanho limitado.
 */
module.exports = function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const bruto = req.body;
  const itens = Array.isArray(bruto) ? bruto.map((r) => r && r.body) : [bruto && (bruto['csp-report'] || bruto)];
  for (const r of itens.slice(0, 5)) {
    if (!r || typeof r !== 'object') continue;
    const linha = {
      diretiva: limite(r['effective-directive'] || r.effectiveDirective || r['violated-directive'] || r.violatedDirective, 80),
      bloqueado: limite(r['blocked-uri'] || r.blockedURL || r.blockedUri),
      pagina: limite(r['document-uri'] || r.documentURL || r.documentUri),
      origem: limite(r['source-file'] || r.sourceFile),
    };
    if (Object.values(linha).some(Boolean)) console.warn('[csp-report]', JSON.stringify(linha));
  }
  return res.sendStatus(204);
};
