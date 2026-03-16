import { useMemo, useState } from 'react';
import { KidBehaviorItem } from './types';

type BehaviorMode = 'now' | 'month';
type BehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD';

interface BehaviorEvent {
  kidId: string;
  createdAt: string;
  value: BehaviorValue;
}

interface KidBehaviorRank extends KidBehaviorItem {
  riskScore: number;
  bestScore: number;
  badCount: number;
  goodCount: number;
  eventCount: number;
}

const MIN_EVENTS = 3;
const NOW_WINDOW_DAYS = 7;
const MAX_ROWS = 5;

const getDateRange = (mode: BehaviorMode, now: Date): { start: Date; end: Date } => {
  if (mode === 'now') {
    const start = new Date(now);
    start.setDate(start.getDate() - NOW_WINDOW_DAYS);
    return { start, end: now };
  }

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: now,
  };
};

const hashKid = (input: string): number => {
  return input.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
};

const fallbackEventsForKids = (kids: KidBehaviorItem[]): BehaviorEvent[] => {
  const now = new Date();
  const events: BehaviorEvent[] = [];

  kids.forEach((kid) => {
    const seed = hashKid(kid.id + kid.name);

    for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - dayOffset);
      createdAt.setHours(18 - (seed % 6), (seed + dayOffset) % 59, 0, 0);

      const signal = (seed + dayOffset * 7) % 10;
      let value: BehaviorValue;

      if (seed % 3 === 0) {
        value = signal < 5 ? 'BAD' : signal < 8 ? 'NEUTRAL' : 'GOOD';
      } else if (seed % 3 === 1) {
        value = signal < 2 ? 'BAD' : signal < 7 ? 'NEUTRAL' : 'GOOD';
      } else {
        value = signal < 1 ? 'BAD' : signal < 3 ? 'NEUTRAL' : 'GOOD';
      }

      events.push({ kidId: kid.id, createdAt: createdAt.toISOString(), value });
    }
  });

  return events;
};

const computeRiskScore = (eventsNewestFirst: BehaviorEvent[], now: Date): number => {
  let score = 0;
  let badStreak = 0;

  eventsNewestFirst.forEach((event) => {
    const ageDays = (now.getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const multiplier = Math.max(0.3, 1 - ageDays / NOW_WINDOW_DAYS);
    const base = event.value === 'BAD' ? 3 : event.value === 'NEUTRAL' ? 1 : 0;
    score += base * multiplier;

    if (event.value === 'BAD') {
      badStreak += 1;
      if (badStreak > 1) score += 2;
    } else {
      badStreak = 0;
    }
  });

  return Number(score.toFixed(1));
};

const computeBestScore = (eventsNewestFirst: BehaviorEvent[]): number => {
  let score = 0;
  let goodStreak = 0;

  eventsNewestFirst.forEach((event) => {
    const base = event.value === 'GOOD' ? 2 : event.value === 'NEUTRAL' ? 0 : -2;
    score += base;

    if (event.value === 'GOOD') {
      goodStreak += 1;
      if (goodStreak > 1) score += 1;
    } else {
      goodStreak = 0;
    }
  });

  return Number(score.toFixed(1));
};

export default function KidsBehaviorPanel({
  needsAttention,
  greatBehavior,
  behaviorEvents,
}: {
  needsAttention: KidBehaviorItem[];
  greatBehavior: KidBehaviorItem[];
  behaviorEvents?: BehaviorEvent[];
}) {
  const [mode, setMode] = useState<BehaviorMode>('now');

  const allKids = useMemo(() => {
    const map = new Map<string, KidBehaviorItem>();
    [...needsAttention, ...greatBehavior].forEach((kid) => map.set(kid.id, kid));
    return Array.from(map.values());
  }, [needsAttention, greatBehavior]);

  const ranked = useMemo(() => {
    const now = new Date();
    const { start, end } = getDateRange(mode, now);
    const sourceEvents = behaviorEvents !== undefined ? behaviorEvents : fallbackEventsForKids(allKids);

    const inRange = sourceEvents.filter((event) => {
      const date = new Date(event.createdAt);
      return date >= start && date <= end;
    });

    const grouped = new Map<string, BehaviorEvent[]>();
    inRange.forEach((event) => {
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
          riskScore: computeRiskScore(events, now),
          bestScore: computeBestScore(events),
        };
      })
      .filter((kid) => kid.eventCount >= MIN_EVENTS);

    const needsSorted =
      mode === 'now'
        ? [...candidates].sort((a, b) => b.riskScore - a.riskScore)
        : [...candidates].sort((a, b) => b.badCount - a.badCount);

    const greatSorted =
      mode === 'now'
        ? [...candidates].sort((a, b) => b.bestScore - a.bestScore)
        : [...candidates].sort((a, b) => b.goodCount - a.goodCount);

    const needsTop = needsSorted.slice(0, MAX_ROWS);
    const greatTop = greatSorted.slice(0, MAX_ROWS);

    const allLow =
      mode === 'now'
        ? needsTop.length === 0 || needsTop[0].riskScore <= 1
        : needsTop.length === 0 || needsTop[0].badCount === 0;

    return { needsTop, greatTop, allLow };
  }, [allKids, behaviorEvents, mode]);

  const needsTitle = mode === 'now' ? 'Needs Attention (Now)' : 'Needs Attention (This month)';
  const greatTitle = mode === 'now' ? 'Great Behavior (Now)' : 'Great Behavior (This month)';

  const renderMetric = (kid: KidBehaviorRank, side: 'needs' | 'great') => {
    if (mode === 'now') {
      return side === 'needs' ? `score ${kid.riskScore}` : `score ${kid.bestScore}`;
    }
    return side === 'needs' ? `😡 ${kid.badCount}` : `😀 ${kid.goodCount}`;
  };

  return (
    <section className="rounded-2xl border border-[#252525] bg-[#121212] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="text-[#c81d25]">⌘</span>
          <h3>Kids Behavior</h3>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as BehaviorMode)}
            className="rounded-md border border-[#2a2a2a] bg-[#0f0f0f] px-2 py-1 text-xs text-zinc-200"
          >
            <option value="now">Now (7 days)</option>
            <option value="month">This month</option>
          </select>
          <button onClick={() => console.log('view all kids behavior')} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
            View all
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#ef4444]">{needsTitle}</p>
          {ranked.allLow ? (
            <p className="rounded-lg border border-[#1f2a1f] bg-[#0f1a0f] p-3 text-sm text-[#86efac]">All good ✅</p>
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
        </div>
      </div>
    </section>
  );
}
