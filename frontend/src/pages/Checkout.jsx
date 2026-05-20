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

  const [step, setStep]                   = useState(0);
  const [whatsapp, setWhatsapp]           = useState('');
  const [error, setError]                 = useState('');
  const [pagamento, setPagamento]         = useState(null);
  const [pagandoLoading, setPagandoLoading] = useState(false);
  const [pagamentoErro, setPagamentoErro] = useState('');

  const { status: payStatus } = usePollingStatus(pagamento?.id || null);

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

  return (
    <section className="py-6" style={{ background: 'var(--photo-paper)', minHeight: '100vh' }}>
      <div className="max-w-lg mx-auto px-4">

        {/* Header da página */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              color: 'var(--photo-primary)',
              background: 'var(--photo-primary-light)',
              minWidth: 'var(--touch-md)',
              minHeight: 'var(--touch-md)',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Voltar para galeria"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1 className="font-display font-bold"
              style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-2xl)' }}>
            Pagamento
          </h1>
        </div>

        {/* Step indicator com rótulos */}
        <div
          className="flex items-start justify-center mb-8"
          role="list"
          aria-label="Etapas do pagamento"
        >
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-start" role="listitem">
              <div className="flex flex-col items-center gap-1">
                {/* Círculo */}
                <div
                  className="rounded-full flex items-center justify-center font-bold"
                  style={{
                    width: 40, height: 40,
                    background: idx < step
                      ? 'var(--photo-success)'
                      : idx === step
                        ? 'var(--photo-primary)'
                        : 'rgba(24,21,15,0.10)',
                    color: idx <= step ? 'white' : 'var(--photo-grafite)',
                    fontSize: 'var(--text-sm)',
                    flexShrink: 0,
                  }}
                  aria-current={idx === step ? 'step' : undefined}
                >
                  {idx < step ? '✓' : idx + 1}
                </div>
                {/* Rótulo */}
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: idx === step ? 'var(--photo-primary)' : 'var(--photo-sepia)',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </span>
              </div>
              {/* Linha */}
              {idx < STEPS.length - 1 && (
                <div style={{
                  width: 28, height: 3, margin: '18px 4px 0',
                  background: idx < step ? 'var(--photo-success)' : 'rgba(24,21,15,0.12)',
                  borderRadius: 2,
                  flexShrink: 0,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 0: Fotos selecionadas ── */}
        {step === 0 && (
          <div className="card">
            <p className="eyebrow mb-4">Fotos Selecionadas</p>
            {fotos.length === 0 ? (
              <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
                Nenhuma foto selecionada.{' '}
                <button
                  onClick={() => navigate('/')}
                  style={{
                    color: 'var(--photo-primary)', textDecoration: 'underline',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 'var(--text-base)',
                  }}
                >
                  Voltar à galeria
                </button>
              </p>
            ) : (
              <ul className="space-y-3">
                {fotos.map((f) => (
                  <li key={f.id}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: 'var(--photo-paper)' }}>
                    <img src={f.url} alt={f.event}
                         className="rounded-lg object-cover flex-shrink-0"
                         style={{ width: 56, height: 72 }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate"
                         style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-base)' }}>
                        {f.event}
                      </p>
                      <p className="font-mono font-bold mt-0.5"
                         style={{ color: 'var(--photo-primary)', fontSize: 'var(--text-base)' }}>
                        {fmt(f.price)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Step 1: WhatsApp ── */}
        {step === 1 && (
          <div className="card">
            <p className="eyebrow mb-3">Seu WhatsApp</p>
            <p className="mb-5" style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
              Enviaremos o link das fotos para este número após o pagamento.
            </p>

            <div>
              <label
                htmlFor="whatsapp"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: 'var(--text-base)' }}
              >
                Número com DDD
              </label>
              <input
                id="whatsapp"
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="Ex: 99 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                className="input-field"
              />
              <p style={{ marginTop: '0.5rem', fontSize: 'var(--text-sm)', color: 'var(--photo-grafite)' }}>
                📱 Você receberá suas fotos pelo WhatsApp
              </p>
            </div>

            {error && (
              <div className="bloco bloco--roxo mt-4">
                <div className="bloco__titulo">Atenção</div>
                <p style={{ fontSize: 'var(--text-base)' }}>{error}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Confirmar pedido ── */}
        {step === 2 && (
          <div className="card">
            <p className="eyebrow mb-4">Confirmar Pedido</p>

            <div className="space-y-2 mb-4">
              <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
                WhatsApp:{' '}
                <strong style={{ color: 'var(--photo-ink)' }}>{whatsapp}</strong>
              </p>
              <p style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
                {fotos.length} foto{fotos.length !== 1 ? 's' : ''} selecionada{fotos.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: 'var(--photo-paper)', border: '1px solid rgba(109,32,119,0.10)' }}
            >
              <div className="flex justify-between"
                   style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-base)' }}>
                <span>Subtotal</span>
                <span className="font-mono font-bold">{fmt(totais.subtotal)}</span>
              </div>
              <div className="flex justify-between"
                   style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-sm)' }}>
                <span>Taxa Pix (2,99% + R$0,30)</span>
                <span className="font-mono">{fmt(totais.taxa)}</span>
              </div>
              <hr style={{ borderColor: 'rgba(109,32,119,0.10)', margin: '0.5rem 0' }} />
              <div className="flex justify-between font-bold"
                   style={{ color: 'var(--photo-primary)' }}>
                <span style={{ fontSize: 'var(--text-lg)' }}>Total</span>
                <span className="font-display" style={{ fontSize: 'var(--text-xl)' }}>
                  {fmt(totais.total)}
                </span>
              </div>
            </div>

            {pagamentoErro && (
              <div className="bloco bloco--roxo mt-4">
                <div className="bloco__titulo">Erro</div>
                <p style={{ fontSize: 'var(--text-base)' }}>{pagamentoErro}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Pagar ── */}
        {step === 3 && (
          <div className="card">
            {payStatus === 'approved' ? (
              <div className="text-center py-8">
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
                <div className="bloco bloco--verde mb-4">
                  <div className="bloco__titulo">Pagamento Confirmado!</div>
                  <p style={{ fontSize: 'var(--text-base)' }}>
                    Em breve você receberá o link das fotos no WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() => { clearCarrinho(); navigate('/'); }}
                  className="btn btn-roxo btn-full"
                  style={{ fontSize: 'var(--text-lg)', minHeight: 'var(--touch-lg)' }}
                >
                  Voltar à galeria
                </button>
              </div>
            ) : payStatus === 'rejected' || payStatus === 'cancelled' ? (
              <div className="text-center py-8">
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>❌</div>
                <div className="bloco bloco--roxo mb-4">
                  <div className="bloco__titulo">Pagamento não aprovado</div>
                  <p style={{ fontSize: 'var(--text-base)' }}>
                    Tente novamente ou use outro método de pagamento.
                  </p>
                </div>
                <button
                  onClick={() => { setPagamento(null); setStep(2); }}
                  className="btn btn-primary btn-full"
                  style={{ fontSize: 'var(--text-lg)', minHeight: 'var(--touch-lg)' }}
                >
                  Tentar novamente
                </button>
              </div>
            ) : pagamento ? (
              <div>
                <p className="eyebrow mb-2">Pague via PIX</p>
                <p className="mb-4" style={{ color: 'var(--photo-grafite)', fontSize: 'var(--text-base)' }}>
                  Total:{' '}
                  <strong style={{ color: 'var(--photo-ink)', fontSize: 'var(--text-lg)' }}>
                    {fmt(totais.total)}
                  </strong>
                </p>
                <PixDisplay qrCode={pagamento.qrCode} qrCodeBase64={pagamento.qrCodeBase64} />
                <p className="text-center mt-4 animate-pulse"
                   style={{ color: 'var(--photo-sepia)', fontSize: 'var(--text-sm)' }}>
                  ⏳ Verificando pagamento...
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Botões de navegação */}
        <div className="flex gap-3 mt-6">
          {step > 0 && step < 3 && (
            <button
              onClick={voltar}
              className="btn btn-outline flex-1"
              style={{ fontSize: 'var(--text-base)' }}
            >
              ← Voltar
            </button>
          )}

          {step < 2 && (
            <button
              onClick={avancar}
              disabled={step === 0 && fotos.length === 0}
              className="btn btn-primary flex-1"
              style={{ fontSize: 'var(--text-lg)', minHeight: 'var(--touch-lg)' }}
            >
              Continuar →
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleGerarPix}
              disabled={pagandoLoading}
              className="btn btn-primary flex-1"
              style={{ fontSize: 'var(--text-lg)', minHeight: 'var(--touch-lg)' }}
            >
              {pagandoLoading ? '⏳ Gerando QR Pix...' : '📲 Gerar QR Pix'}
            </button>
          )}
        </div>

      </div>
    </section>
  );
}
