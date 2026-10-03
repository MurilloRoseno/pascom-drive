const fs = require('fs');
const path = require('path');

// A CSP só vale se a Vercel a entregar. Com `builds` + `routes` (modo legado) os `headers` de topo do
// vercel.json são ignorados: em produção o site respondia sem nenhum cabeçalho de segurança. Estes
// testes travam a forma que funciona: cabeçalhos dentro de uma rota com `continue: true`, antes das demais.
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'vercel.json'), 'utf8'));
const primeira = config.routes[0];
const csp = primeira.headers['Content-Security-Policy-Report-Only'];
const diretiva = (nome) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${nome} `)) || '');

describe('vercel.json: cabeçalhos de segurança', () => {
  it('não usa `headers` de topo (a Vercel os ignora junto de builds/routes)', () => {
    expect(config.builds).toBeDefined();
    expect(config.headers).toBeUndefined();
  });

  it('a primeira rota casa tudo, só acrescenta cabeçalhos e deixa as outras rotas seguirem', () => {
    expect(primeira.src).toBe('/(.*)');
    expect(primeira.continue).toBe(true);
    expect(primeira.dest).toBeUndefined();
    expect(Object.keys(primeira.headers)).toEqual(expect.arrayContaining(['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy']));
    expect(primeira.headers['X-Frame-Options']).toBe('DENY');
  });

  it('a CSP está em modo observação (Report-Only), nunca em modo bloqueio, até alguém decidir ativar', () => {
    expect(primeira.headers['Content-Security-Policy']).toBeUndefined();
    expect(csp).toBeDefined();
    expect(diretiva('report-uri')).toBe('report-uri /api/csp-report');
  });

  it('libera só o que o site usa: fontes do Google, Clerk, imagens dele mesmo', () => {
    expect(diretiva('default-src')).toBe("default-src 'self'");
    expect(diretiva('style-src')).toContain('https://fonts.googleapis.com');
    expect(diretiva('font-src')).toContain('https://fonts.gstatic.com');
    expect(diretiva('script-src')).toContain('https://*.clerk.accounts.dev');
    expect(diretiva('connect-src')).toContain('https://*.clerk.accounts.dev');
    expect(diretiva('img-src')).toContain('https://img.clerk.com');
    expect(diretiva('worker-src')).toContain('blob:');
    expect(diretiva('frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(diretiva('object-src')).toBe("object-src 'none'");
  });

  it('não abre nada para pagamento: o checkout é redirecionamento para fora do site', () => {
    expect(csp).not.toMatch(/stripe|mercadopago/i);
    expect(csp.split(/[\s;]+/)).not.toContain('*'); // nenhum curinga solto (só "*.dominio" e porta ":*")
    expect(diretiva('script-src')).not.toContain("'unsafe-eval'");
  });

  it('as rotas de aplicação continuam depois, na ordem que funciona', () => {
    expect(config.routes.slice(1).map((r) => r.dest)).toEqual([
      '/backend/api/index.js', '/frontend/assets/$1', '/frontend/$1', '/frontend/index.html',
    ]);
  });
});
