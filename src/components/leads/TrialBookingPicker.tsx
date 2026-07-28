'use client';

import { useEffect, useMemo, useState } from 'react';
import { ScheduleSlotRow } from '../../../lib/database';
import {
  UpcomingSession,
  bookTrialClass,
  getSessionCapacityInfo,
  getUpcomingSessionsForClassTypes,
  resolveScheduleSlotRows,
  suggestClassTypesForAge,
} from './leadAutomation';
import { Lead, LEAD_CLASS_TYPES, LeadClassType } from './types';

interface SessionWithCapacity extends UpcomingSession {
  scheduleSlotRow: ScheduleSlotRow;
  capacity: number | null;
  booked: number;
  full: boolean;
}

interface TrialBookingPickerProps {
  lead: Lead;
  onBooked: (updatedLead: Lead) => void;
  onCancel: () => void;
}

export default function TrialBookingPicker({ lead, onBooked, onCancel }: TrialBookingPickerProps) {
  const suggestedTypes = useMemo(
    () => (typeof lead.age === 'number' ? suggestClassTypesForAge(lead.age) : [lead.class_type]),
    [lead.age, lead.class_type]
  );

  const [showAllTypes, setShowAllTypes] = useState(false);
  const [sessions, setSessions] = useState<SessionWithCapacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingKey, setBookingKey] = useState<string | null>(null);

  const activeTypes: LeadClassType[] = showAllTypes ? LEAD_CLASS_TYPES : suggestedTypes;
  const activeTypesKey = activeTypes.join(',');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const upcoming = getUpcomingSessionsForClassTypes(activeTypes, 4).slice(0, 12);
        const slotRowsByCode = await resolveScheduleSlotRows(upcoming.map((session) => session.slot));

        const withCapacity = await Promise.all(
          upcoming.map(async (session) => {
            const scheduleSlotRow = slotRowsByCode[session.slot.id];
            if (!scheduleSlotRow) return null;
            const capacityInfo = await getSessionCapacityInfo(scheduleSlotRow, session.dateKey, session.slot.program as LeadClassType);
            return {
              ...session,
              scheduleSlotRow,
              capacity: capacityInfo.capacity,
              booked: capacityInfo.booked,
              full: capacityInfo.full,
            } satisfies SessionWithCapacity;
          })
        );

        if (!cancelled) {
          setSessions(withCapacity.filter((session): session is SessionWithCapacity => session !== null));
        }
      } catch (err) {
        console.error('Erro loading trial sessions:', err);
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar sessões disponíveis.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // activeTypes is derived fresh each render from showAllTypes/suggestedTypes;
    // activeTypesKey is the stable primitive that actually identifies a re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypesKey]);

  const handleBook = async (session: SessionWithCapacity) => {
    const key = `${session.slot.id}-${session.dateKey}`;
    setBookingKey(key);
    setError(null);
    try {
      const updated = await bookTrialClass({
        lead,
        scheduleSlotRow: session.scheduleSlotRow,
        dateKey: session.dateKey,
        program: session.slot.program as LeadClassType,
      });
      onBooked(updated);
    } catch (err) {
      console.error('Erro booking trial class:', err);
      setError(err instanceof Error ? err.message : 'Erro ao agendar aula experimental.');
    } finally {
      setBookingKey(null);
    }
  };

  const nextAvailableKey = sessions.find((session) => !session.full)
    ? `${sessions.find((session) => !session.full)!.slot.id}-${sessions.find((session) => !session.full)!.dateKey}`
    : null;

  return (
    <div className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Agendar Aula Experimental</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {typeof lead.age === 'number'
              ? `Idade ${lead.age} anos — a sugerir ${suggestedTypes.join(', ')}`
              : 'Idade não preenchida — a mostrar o tipo de aula selecionado no lead'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAllTypes((prev) => !prev)}
          className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-xs text-zinc-300 hover:border-[#3a3a3a] hover:text-white"
        >
          {showAllTypes ? 'Ver apenas sugeridas' : 'Ver todos os tipos'}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
          A carregar sessões disponíveis...
        </div>
      ) : sessions.length === 0 ? (
        <p className="px-1 py-4 text-sm text-zinc-500">Sem sessões futuras encontradas para este tipo de aula.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const key = `${session.slot.id}-${session.dateKey}`;
            const isBooking = bookingKey === key;
            const isSuggestedNext = key === nextAvailableKey;

            return (
              <button
                key={key}
                type="button"
                disabled={session.full || isBooking}
                onClick={() => handleBook(session)}
                className={`rounded-xl border p-3 text-left transition ${
                  session.full
                    ? 'cursor-not-allowed border-[#262626] bg-[#141414] opacity-50'
                    : isSuggestedNext
                    ? 'border-[#c81d25] bg-[rgba(200,29,37,0.08)] hover:bg-[rgba(200,29,37,0.14)]'
                    : 'border-[#262626] bg-[#161616] hover:border-[#3a3a3a] hover:bg-[#1d1d1d]'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="rounded-full border border-[#333] bg-[#111] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-300">
                    {session.slot.program}
                  </span>
                  <span className="text-xs font-medium text-zinc-200">
                    {session.slot.startTime}–{session.slot.endTime}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 capitalize">{session.dateLabel}</p>
                <p className={`mt-2 text-[11px] font-semibold ${session.full ? 'text-red-400' : 'text-zinc-400'}`}>
                  {session.full
                    ? `Cheia (${session.booked}/${session.capacity})`
                    : session.capacity !== null
                    ? `${session.booked}/${session.capacity} vagas ocupadas`
                    : 'Vagas ilimitadas'}
                </p>
                {isBooking ? <p className="mt-1 text-[11px] text-zinc-500">A agendar...</p> : null}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-3 py-2 text-sm text-zinc-300 hover:border-[#3a3a3a] hover:text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
