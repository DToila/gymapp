'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QRCodeCard() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [registerUrl, setRegisterUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/register`;
    setRegisterUrl(url);

    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
      .then(setDataUrl)
      .catch((err) => {
        console.error('Erro generating QR code:', err);
        setError('Não foi possível gerar o QR code.');
      });
  }, []);

  return (
    <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
      <h2 className="mb-1 text-xl font-semibold text-white">Registo — QR Code</h2>
      <p className="mb-4 text-sm text-zinc-500">
        Aponte a câmara do telemóvel para aceder diretamente ao formulário de registo. Ideal para um tablet de
        receção ou para imprimir como poster.
      </p>

      {error ? (
        <div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]">{error}</div>
      ) : dataUrl ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR code para o formulário de registo" width={320} height={320} />
        </div>
      ) : (
        <div className="grid h-80 place-items-center rounded-xl border border-[#222] text-sm text-zinc-500">
          A gerar QR code...
        </div>
      )}

      <p className="mt-3 break-all text-center text-xs text-zinc-500">{registerUrl}</p>
    </div>
  );
}
