import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { KidBehaviorItem } from './types';

type BehaviorMode = 'now' | 'month';
type BehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD';

interface BehaviorEvent {
  kidId: string;
  createdAt: string;
  value: BehaviorValue;
}

interface KidBehaviorRank extends KidBehaviorItem {
  badCount: number;
  goodCount: number;
  eventCount: number;
}

const MIN_EVENTS = 1;
const MAX_ROWS = 5;

export default function KidsBehaviorPanel({
  needsAttention,
  greatBehavior,
  behaviorEvents,
  mode,
  onModeChange,
}: {
  needsAttention: KidBehaviorItem[];
  greatBehavior: KidBehaviorItem[];
  behaviorEvents: BehaviorEvent[];
  mode: BehaviorMode;
  onModeChange: (mode: BehaviorMode) => void;
}) {
  const router = useRouter();
  const allKids = useMemo(() => {
    const map = new Map<string, KidBehaviorItem>();
    [...needsAttention, ...greatBehavior].forEach((kid) => map.set(kid.id, kid));
    return Array.from(map.values());
  }, [needsAttention, greatBehavior]);

  const ranked = useMemo(() => {
    const grouped = new Map<string, BehaviorEvent[]>();
    behaviorEvents.forEach((event) => {
      const current = grouped.get(event.kidId) || [];
      current.push(event);
      grouped.set(event.kidId, current);
    });

    const candidates: KidBehaviorRank[] = allKids
      .map((kid) => {
        const events = (grouped.get(kid.id) || []).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const badCount = events.filter((event) => event.value === 'BAD').length;
        const goodCount = events.filter((event) => event.value === 'GOOD').length;

        return {
          ...kid,
          eventCount: events.length,
          badCount,
          goodCount,
        };
      })
      .filter((kid) => kid.eventCount >= MIN_EVENTS);

    const needsSorted = [...candidates].filter((k) => k.badCount > 0).sort((a, b) => b.badCount - a.badCount);
    const greatSorted = [...candidates].filter((k) => k.goodCount > 0).sort((a, b) => b.goodCount - a.goodCount);

    const needsTop = needsSorted.slice(0, MAX_ROWS);
    const greatTop = greatSorted.slice(0, MAX_ROWS);

    return { needsTop, greatTop };
  }, [allKids, behaviorEvents]);

  const needsTitle = mode === 'now' ? 'Needs Attention (Now)' : 'Needs Attention (This month)';
  const greatTitle = mode === 'now' ? 'Great Comportamento (Now)' : 'Great Comportamento (This month)';

  const renderMetric = (kid: KidBehaviorRank, side: 'needs' | 'great') => {
    return side === 'needs' ? `😡 ${kid.badCount}` : `😀 ${kid.goodCount}`;
  };

  return (
    <section className="rounded-2xl border border-[#252525] bg-[#121212] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="text-[#c81d25]">⌘</span>
          <h3>Crianças Comportamento</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(event) => onModeChange(event.target.value as BehaviorMode)}
            className="rounded-md border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1 text-xs text-zinc-200"
          >
            <option value="now">Now (7 days)</option>
            <option value="month">This month</option>
          </select>
          <button onClick={() => router.push('/members')} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
            Ver tudo
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#ef4444]">{needsTitle}</p>
          {ranked.needsTop.length === 0 ? (
            <p className="rounded-lg border border-[#1f2a1f] bg-[#0f1a0f] p-3 text-sm text-[#86efac]">Todos good ✅</p>
          ) : (
            <ul className="space-y-2">
              {ranked.needsTop.map((kid) => (
                <li key={kid.id}>
                  <button
                    onClick={() => console.log('open kid profile', kid.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-[#181818]"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-700 text-[10px] text-white">{kid.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-zinc-200">{kid.name}</div>
                      <div className="text-[11px] text-zinc-500">{renderMetric(kid, 'needs')}</div>
                    </div>
                    <span className="text-zinc-500">{kid.group}</span>
                    <span className="text-[#ef4444]">✖</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-[#22c55e]">{greatTitle}</p>
          {ranked.greatTop.length === 0 ? (
            <p className="rounded-lg border border-[#252525] bg-[#0f0f0f] p-3 text-sm text-zinc-500">Não stars yet</p>
          ) : (
            <ul className="space-y-2">
              {ranked.greatTop.map((kid) => (
                <li key={kid.id}>
                  <button
                    onClick={() => console.log('open kid profile', kid.id)}
                    className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm hover:bg-[#181818]"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-700 text-[10px] text-white">{kid.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-zinc-200">{kid.name}</div>
                      <div className="text-[11px] text-zinc-500">{renderMetric(kid, 'great')}</div>
                    </div>
                    <span className="text-zinc-500">{kid.group}</span>
                    <span className="text-[#22c55e]">✔</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
