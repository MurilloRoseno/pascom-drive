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
    <main className="max-w-lg mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
              ${idx < step ? 'bg-green-500 text-white' : idx === step ? 'bg-photo-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              {idx < step ? '✓' : idx + 1}
            </div>
            {idx < STEPS.length - 1 && <div className="w-6 h-0.5 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 0: Fotos selecionadas */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Fotos Selecionadas</h2>
          {fotos.length === 0 ? (
            <p className="text-gray-500">
              Nenhuma foto selecionada.{' '}
              <button onClick={() => navigate('/')} className="text-photo-primary underline">
                Voltar à galeria
              </button>
            </p>
          ) : (
            <ul className="space-y-2">
              {fotos.map((f) => (
                <li key={f.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                  <img src={f.url} alt={f.event} className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{f.event}</p>
                    <p className="text-xs text-gray-500">{fmt(f.price)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Step 1: WhatsApp */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Seu WhatsApp</h2>
          <p className="text-sm text-gray-500 mb-3">
            Enviaremos o link das fotos para este número após o pagamento.
          </p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={11}
            placeholder="DDD + número (ex: 11999999999)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-photo-primary"
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      )}

      {/* Step 2: Confirmar pedido */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Confirmar Pedido</h2>
          <p className="text-sm text-gray-500 mb-1">WhatsApp: <strong>{whatsapp}</strong></p>
          <p className="text-sm text-gray-500 mb-4">{fotos.length} foto(s) selecionada(s)</p>
          <div className="bg-gray-50 border rounded-lg p-4 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span><span>{fmt(totais.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Taxa Pix (2,99% + R$0,30)</span><span>{fmt(totais.taxa)}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-photo-primary">
              <span>Total</span><span>{fmt(totais.total)}</span>
            </div>
          </div>
          {pagamentoErro && (
            <p className="text-red-500 text-sm mt-3">{pagamentoErro}</p>
          )}
        </div>
      )}

      {/* Step 3: Pagar */}
      {step === 3 && (
        <div>
          {payStatus === 'approved' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-green-600 mb-2">Pagamento confirmado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                Em breve você receberá o link das fotos no WhatsApp.
              </p>
              <button
                onClick={() => { clearCarrinho(); navigate('/'); }}
                className="bg-photo-primary text-white px-6 py-2 rounded-lg font-medium"
              >
                Voltar à galeria
              </button>
            </div>
          ) : payStatus === 'rejected' ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-red-600 mb-2">Pagamento não aprovado</h2>
              <p className="text-gray-500 text-sm mb-6">Tente novamente ou use outro método.</p>
              <button
                onClick={() => { setPagamento(null); setStep(2); }}
                className="bg-photo-primary text-white px-6 py-2 rounded-lg font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : pagamento ? (
            <div>
              <h2 className="text-xl font-bold mb-2">Pague via PIX</h2>
              <p className="text-sm text-gray-500 mb-4">
                Total: <strong>{fmt(totais.total)}</strong> — aguardando confirmação...
              </p>
              <PixDisplay qrCode={pagamento.qrCode} qrCodeBase64={pagamento.qrCodeBase64} />
              <p className="text-center text-xs text-gray-400 mt-4 animate-pulse">
                Verificando pagamento...
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-8">
        {step > 0 && step < 3 && (
          <button
            onClick={voltar}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm"
          >
            Voltar
          </button>
        )}

        {step < 2 && (
          <button
            onClick={avancar}
            disabled={step === 0 && fotos.length === 0}
            className="flex-1 py-2 px-4 bg-photo-primary text-white rounded-lg text-sm font-medium
                       disabled:opacity-40"
          >
            Continuar
          </button>
        )}

        {step === 2 && (
          <button
            onClick={handleGerarPix}
            disabled={pagandoLoading}
            className="flex-1 py-2 px-4 bg-photo-primary text-white rounded-lg text-sm font-medium
                       disabled:opacity-70"
          >
            {pagandoLoading ? 'Gerando...' : 'Gerar QR Pix'}
          </button>
        )}
      </div>
    </main>
  );
}
