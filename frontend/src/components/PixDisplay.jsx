import { useState } from 'react';

export function PixDisplay({ qrCodeBase64, qrCode }) {
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(qrCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt="QR Code PIX"
          className="w-48 h-48 rounded-lg"
          style={{ border: '1px solid rgba(109,32,119,0.15)' }}
        />
      )}

      <p className="text-sm text-center" style={{ color: 'var(--photo-grafite)' }}>
        Escaneie o QR Code <span className="font-semibold">ou</span> use o código abaixo
      </p>

      <div
        className="w-full rounded-lg p-3"
        style={{ background: 'var(--photo-paper)', border: '1px solid rgba(109,32,119,0.12)' }}
      >
        <pre
          className="text-xs break-all whitespace-pre-wrap font-mono select-all"
          style={{ color: 'var(--photo-grafite)', margin: 0 }}
          aria-label="Código PIX"
        >
          {qrCode}
        </pre>
      </div>

      <button
        onClick={copiar}
        className="btn w-full"
        style={copiado
          ? { background: 'var(--photo-success)', color: '#fff' }
          : { background: 'var(--photo-primary)', color: '#fff' }
        }
      >
        {copiado ? '✅ Copiado!' : 'Copiar Código PIX'}
      </button>
    </div>
  );
}

export default PixDisplay;
