"use client";

import { useEffect, useState } from "react";

interface TrialSession {
  slotCode: string;
  program: string;
  kidsGroup: string | null;
  dayOfWeek: string;
  dateKey: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  capacity: number | null;
  booked: number;
  full: boolean;
}

interface PublicTrialPickerProps {
  leadId: string;
  age: number;
  onBooked: (session: { dateKey: string; startTime: string; endTime: string }) => void;
  onSkip: () => void;
}

const inputClass =
  "w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-[#c81d25]";

export default function PublicTrialPicker({ leadId, age, onBooked, onSkip }: PublicTrialPickerProps) {
  const [sessions, setSessions] = useState<TrialSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingKey, setBookingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/public/trial-availability?age=${age}`);
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Não foi possível carregar as sessões.");
        if (!cancelled) setSessions(data.sessions || []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Não foi possível carregar as sessões.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [age]);

  const handleBook = async (session: TrialSession) => {
    const key = `${session.slotCode}-${session.dateKey}`;
    setBookingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/public/book-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, slotCode: session.slotCode, dateKey: session.dateKey }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Não foi possível marcar a sessão.");
      onBooked({ dateKey: session.dateKey, startTime: session.startTime, endTime: session.endTime });
    } catch (err: any) {
      setError(err?.message || "Não foi possível marcar a sessão.");
    } finally {
      setBookingKey(null);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">Aluno Novo</p>
        <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl">Marca a Aula Experimental</h2>
        <p className="mt-1 text-sm text-zinc-400">Escolhe o dia e hora que preferes — só aparecem sessões com vaga.</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-[#5b1f24] bg-[#2a1214] px-4 py-3 text-sm text-rose-300">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
          A carregar sessões disponíveis...
        </div>
      ) : sessions.length === 0 ? (
        <p className={`${inputClass} text-zinc-500`}>Sem sessões futuras encontradas para esta idade.</p>
      ) : (
        <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          {sessions.map((session) => {
            const key = `${session.slotCode}-${session.dateKey}`;
            const isBooking = bookingKey === key;

            return (
              <button
                key={key}
                type="button"
                disabled={session.full || isBooking}
                onClick={() => handleBook(session)}
                className={`rounded-xl border p-3 text-left transition ${
                  session.full
                    ? "cursor-not-allowed border-[#262626] bg-[#141414] opacity-50"
                    : "border-[#2a2a2a] bg-[#161616] hover:border-[#c81d25]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-[#333] bg-[#111] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-300">
                    {session.program}
                  </span>
                  <span className="text-xs font-medium text-zinc-200">
                    {session.startTime}–{session.endTime}
                  </span>
                </div>
                <p className="text-sm capitalize text-zinc-300">{session.dateLabel}</p>
                <p className={`mt-2 text-[11px] font-semibold ${session.full ? "text-red-400" : "text-zinc-500"}`}>
                  {session.full
                    ? `Cheia (${session.booked}/${session.capacity})`
                    : session.capacity !== null
                    ? `${session.booked}/${session.capacity} vagas ocupadas`
                    : "Vagas disponíveis"}
                </p>
                {isBooking ? <p className="mt-1 text-[11px] text-zinc-500">A marcar...</p> : null}
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onSkip}
        className="mt-6 text-sm font-medium text-zinc-400 underline-offset-2 hover:text-white hover:underline"
      >
        Marcar mais tarde
      </button>
    </div>
  );
}
