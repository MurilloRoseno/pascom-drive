import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrinho } from '../hooks/useCarrinho.js';
import { checkoutSchema } from '../lib/validation.js';

const STEPS = ['Fotos', 'WhatsApp', 'Revisão', 'Pagamento'];

const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

export default function CheckoutPage() {
  const [step, setStep] = useState(0);
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const { fotos, totais, clearCarrinho } = useCarrinho();
  const navigate = useNavigate();

  const handleNextStep = () => {
    if (step === 1) {
      const result = checkoutSchema.safeParse({ whatsapp, fotoIds: fotos.map(f => f.id) });
      if (!result.success) {
        setError(result.error.errors[0].message);
        return;
      }
      setError('');
    }
    setStep(s => s + 1);
  };

  return (
    <main className="container section-spacing max-w-xl mx-auto">
      <div className="flex justify-between mb-8">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex flex-col items-center ${i <= step ? 'text-photo-primary' : 'text-gray-400'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${i < step ? 'bg-photo-primary text-white' : i === step ? 'bg-photo-accent text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className="text-xs mt-1 hidden sm:block">{label}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="h2 mb-4">Fotos selecionadas</h2>
          {fotos.length === 0 ? (
            <p className="body text-gray-500">
              Nenhuma foto selecionada.{' '}
              <button className="text-photo-primary underline" onClick={() => navigate('/')}>
                Voltar à galeria
              </button>
            </p>
          ) : (
            fotos.map(f => (
              <div key={f.id} className="flex items-center gap-3 mb-3 p-3 bg-white rounded-lg shadow-sm">
                <img src={f.url} alt={f.event} className="w-16 h-24 object-cover rounded" />
                <div>
                  <p className="font-semibold">{f.event}</p>
                  <p className="text-sm text-gray-600">{fmt(f.price)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="h2 mb-4">Seu WhatsApp</h2>
          <p className="body text-gray-600 mb-4">Vamos enviar o link das fotos para este número.</p>
          <input
            type="tel"
            placeholder="11999999999"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
            className="w-full border rounded-lg px-4 py-3 text-lg font-mono focus:ring-2 focus:ring-photo-primary focus:outline-none"
            maxLength={11}
          />
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="h2 mb-4">Confirmar pedido</h2>
          <p className="body text-gray-600 mb-2">
            WhatsApp: <strong>{whatsapp}</strong>
          </p>
          <p className="body text-gray-600 mb-4">
            {fotos.length} foto{fotos.length > 1 ? 's' : ''} selecionada{fotos.length > 1 ? 's' : ''}
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Subtotal</span><span>{fmt(totais.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Taxa Pix (2,99% + R$0,30)</span><span>{fmt(totais.taxa)}</span>
            </div>
            <div className="flex justify-between font-bold text-photo-primary text-lg border-t pt-2">
              <span>Total</span><span>{fmt(totais.total)}</span>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <h2 className="h2 mb-4">Pagamento via Pix</h2>
          <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto flex items-center justify-center mb-4 border-2 border-dashed border-gray-300">
            <span className="text-gray-400 text-sm text-center px-4">QR Code disponível na Phase 4</span>
          </div>
          <p className="body text-gray-600 mb-6">Integração com Mercado Pago em desenvolvimento.</p>
          <button
            className="btn btn-outline"
            onClick={() => { clearCarrinho(); navigate('/'); }}
          >
            Voltar à galeria
          </button>
        </div>
      )}

      {step < 3 && (
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button className="btn btn-outline flex-1" onClick={() => setStep(s => s - 1)}>
              ← Voltar
            </button>
          )}
          {!(step === 0 && fotos.length === 0) && (
            <button className="btn btn-primary flex-1" onClick={handleNextStep}>
              {step === 2 ? 'Gerar QR Pix' : 'Continuar →'}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
