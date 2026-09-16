'use client';

import { useEffect, useState } from 'react';
import {
  getNotificationPermissionState,
  isSubscribedToPush,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../../lib/pushNotifications';

export default function NotificationsCard() {
  const [status, setStatus] = useState<'checking' | 'unsupported' | 'off' | 'on' | 'denied'>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    const permission = await getNotificationPermissionState();
    if (permission === 'unsupported') {
      setStatus('unsupported');
      return;
    }
    if (permission === 'denied') {
      setStatus('denied');
      return;
    }
    const subscribed = await isSubscribedToPush();
    setStatus(subscribed ? 'on' : 'off');
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    const result = await subscribeToPush();
    if (!result.success) {
      setError(result.error || 'Não foi possível ativar as notificações.');
    }
    await refreshStatus();
    setBusy(false);
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    await unsubscribeFromPush();
    await refreshStatus();
    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-[#222] bg-[#121212] p-6">
      <h2 className="mb-1 text-xl font-semibold text-white">Notificações</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Recebe um alerta neste dispositivo sempre que chega um lead novo (site ou Wix).
      </p>

      {status === 'unsupported' ? (
        <p className="text-sm text-zinc-400">Este browser não suporta notificações push.</p>
      ) : status === 'denied' ? (
        <p className="text-sm text-amber-400">
          As notificações foram bloqueadas para este site. Ativa-as nas definições do browser/telemóvel para continuar.
        </p>
      ) : status === 'checking' ? (
        <p className="text-sm text-zinc-500">A verificar...</p>
      ) : status === 'on' ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#1f4d33] bg-[#112117] px-3 py-1.5 text-sm text-green-300">
            ● Ativas neste dispositivo
          </span>
          <button
            type="button"
            onClick={handleDisable}
            disabled={busy}
            className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-[#0f0f0f] disabled:opacity-50"
          >
            {busy ? 'A desativar...' : 'Desativar'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="rounded-lg bg-[#c81d25] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b01720] disabled:opacity-50"
        >
          {busy ? 'A ativar...' : 'Ativar notificações neste dispositivo'}
        </button>
      )}

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
