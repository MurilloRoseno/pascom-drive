// PixDisplay.jsx — shows PIX QR code image and copia-e-cola code.
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
          className="w-48 h-48 border border-gray-200 rounded-lg"
        />
      )}

      <p className="text-sm text-gray-500 text-center">
        Escaneie o QR Code <span className="font-semibold">ou</span> use o código abaixo
      </p>

      <div className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p
          className="text-xs text-gray-600 break-all font-mono select-all"
          aria-label="Código PIX"
        >
          {qrCode}
        </p>
      </div>

      <button
        onClick={copiar}
        className="w-full py-2 px-4 bg-photo-primary text-white rounded-lg font-medium
                   hover:bg-photo-primary-dark transition-colors"
      >
        {copiado ? '✅ Copiado!' : 'Copiar Código PIX'}
      </button>
    </div>
  );
}

export default PixDisplay;
