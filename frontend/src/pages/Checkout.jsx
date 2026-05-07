import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { checkoutSchema } from '../lib/validation.js';
import { criarPagamento } from '../lib/api';
import { usePollingStatus } from '../hooks/usePollingStatus';
import PixDisplay from '../components/PixDisplay';

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const STEPS = ['Fotos', 'WhatsApp', 'Confirmar', 'Pagar'];


export default function CheckoutPage() {
  const navigate = useNavigate();
  const { fotos, clearCarrinho, totais } = useCarrinho();

  // Navigation state
  const [step, setStep] = useState(0);
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');

  // Payment state
  const [pagamento, setPagamento] = useState(null);   // { id, qrCode, qrCodeBase64 }
  const [pagandoLoading, setPagandoLoading] = useState(false);
  const [pagamentoErro, setPagamentoErro] = useState('');

  // Polling — only starts after pagamento.id is set
  const { status: payStatus } = usePollingStatus(pagamento?.id || null);

  // ─── Step navigation ──────────────────────────────────────────────────────

  function avancar() {
    if (step === 1) {
      const result = checkoutSchema.safeParse({ whatsapp, fotoIds: fotos.map((f) => f.id) });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      setError('');
    }
    setStep((s) => s + 1);
  }

  function voltar() {
    setStep((s) => s - 1);
    setError('');
  }

  // ─── Criar pagamento PIX ──────────────────────────────────────────────────

  async function handleGerarPix() {
    setPagandoLoading(true);
    setPagamentoErro('');
    try {
      const resultado = await criarPagamento({
        whatsapp,
        fotoIds: fotos.map((f) => f.id),
        total: totais.total,
      });
      setPagamento(resultado);
      setStep(3);
    } catch (err) {
      setPagamentoErro(err.message || 'Erro ao gerar pagamento');
    } finally {
      setPagandoLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="py-6" style={{ background: 'var(--photo-paper)', minHeight: '100vh' }}>
      <div className="container">
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--photo-primary)', background: 'var(--photo-primary-light)' }}
            aria-label="Voltar para galeria"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--photo-ink)' }}>
            Pagamento
          </h1>
        </div>

        <div className="max-w-lg mx-auto">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((label, idx) => (
              <div key={label} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={idx < step
                    ? { background: 'var(--photo-success)', color: '#fff' }
                    : idx === step
                      ? { background: 'var(--photo-primary)', color: '#fff' }
                      : { background: 'rgba(24,21,15,0.08)', color: 'var(--photo-grafite)' }
                  }
                >
                  {idx < step ? '✓' : idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="w-6 h-0.5 mx-1" style={{ background: 'rgba(24,21,15,0.12)' }} />
                )}
              </div>
            ))}
          </div>

          {/* Step 0: Fotos selecionadas */}
          {step === 0 && (
            <div className="card">
              <div className="eyebrow mb-4">Fotos Selecionadas</div>
              {fotos.length === 0 ? (
                <p style={{ color: 'var(--photo-grafite)' }}>
                  Nenhuma foto selecionada.{' '}
                  <button
                    onClick={() => navigate('/')}
                    style={{ color: 'var(--photo-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Voltar à galeria
                  </button>
                </p>
              ) : (
                <ul className="space-y-2">
                  {fotos.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-lg p-2" style={{ background: 'var(--photo-paper)' }}>
                      <img src={f.url} alt={f.event} className="w-12 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--photo-ink)' }}>{f.event}</p>
                        <p className="font-mono text-xs mt-0.5" style={{ color: 'var(--photo-grafite)' }}>{fmt(f.price)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Step 1: WhatsApp */}
          {step === 1 && (
            <div className="card">
              <div className="eyebrow mb-3">Seu WhatsApp</div>
              <p className="text-sm mb-4" style={{ color: 'var(--photo-grafite)' }}>
                Enviaremos o link das fotos para este número após o pagamento.
              </p>
              <div className="field">
                <label htmlFor="whatsapp">Número (DDD + número)</label>
                <input
                  id="whatsapp"
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="DDD + número (ex: 11999999999)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  className="input"
                />
              </div>
              {error && (
                <div className="bloco bloco--roxo mt-3">
                  <div className="bloco__titulo">Atenção</div>
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Confirmar pedido */}
          {step === 2 && (
            <div className="card">
              <div className="eyebrow mb-4">Confirmar Pedido</div>
              <p className="text-sm mb-1" style={{ color: 'var(--photo-grafite)' }}>
                WhatsApp: <strong style={{ color: 'var(--photo-ink)' }}>{whatsapp}</strong>
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--photo-grafite)' }}>
                {fotos.length} foto(s) selecionada(s)
              </p>
              <div className="rounded-lg p-4 space-y-1" style={{ background: 'var(--photo-paper)', border: '1px solid rgba(109,32,119,0.10)' }}>
                <div className="flex justify-between text-sm" style={{ color: 'var(--photo-ink)' }}>
                  <span>Subtotal</span>
                  <span className="font-mono">{fmt(totais.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'var(--photo-grafite)' }}>
                  <span>Taxa Pix (2,99% + R$0,30)</span>
                  <span className="font-mono">{fmt(totais.taxa)}</span>
                </div>
                <hr className="my-2" style={{ borderColor: 'rgba(109,32,119,0.10)' }} />
                <div className="flex justify-between font-bold" style={{ color: 'var(--photo-primary)' }}>
                  <span>Total</span>
                  <span className="font-display text-lg">{fmt(totais.total)}</span>
                </div>
              </div>
              {pagamentoErro && (
                <div className="bloco bloco--roxo mt-3">
                  <div className="bloco__titulo">Erro</div>
                  <p className="text-sm">{pagamentoErro}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pagar */}
          {step === 3 && (
            <div className="card">
              {payStatus === 'approved' ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <div className="bloco bloco--verde">
                    <div className="bloco__titulo">Pagamento Confirmado</div>
                    <p>Em breve você receberá o link das fotos no WhatsApp.</p>
                  </div>
                  <button
                    onClick={() => { clearCarrinho(); navigate('/'); }}
                    className="btn btn-secondary mt-6"
                  >
                    Voltar à galeria
                  </button>
                </div>
              ) : payStatus === 'rejected' ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">❌</div>
                  <div className="bloco bloco--roxo">
                    <div className="bloco__titulo">Pagamento não aprovado</div>
                    <p>Tente novamente ou use outro método de pagamento.</p>
                  </div>
                  <button
                    onClick={() => { setPagamento(null); setStep(2); }}
                    className="btn btn-primary mt-6"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : pagamento ? (
                <div>
                  <div className="eyebrow mb-2">Pague via PIX</div>
                  <p className="text-sm mb-4" style={{ color: 'var(--photo-grafite)' }}>
                    Total: <strong style={{ color: 'var(--photo-ink)' }}>{fmt(totais.total)}</strong> — aguardando confirmação...
                  </p>
                  <PixDisplay qrCode={pagamento.qrCode} qrCodeBase64={pagamento.qrCodeBase64} />
                  <p className="text-center text-xs mt-4 animate-pulse" style={{ color: 'var(--photo-sepia)' }}>
                    Verificando pagamento...
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && step < 3 && (
              <button onClick={voltar} className="btn btn-outline flex-1">
                Voltar
              </button>
            )}

            {step < 2 && (
              <button
                onClick={avancar}
                disabled={step === 0 && fotos.length === 0}
                className="btn btn-primary flex-1 disabled:opacity-40"
              >
                Continuar
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleGerarPix}
                disabled={pagandoLoading}
                className="btn btn-primary btn-lg flex-1 disabled:opacity-70"
              >
                {pagandoLoading ? 'Gerando...' : 'Gerar QR Pix'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
