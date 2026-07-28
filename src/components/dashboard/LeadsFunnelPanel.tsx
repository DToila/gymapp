'use client';

import { useEffect, useMemo, useState } from 'react';
import Panel from './Panel';
import { FunnelMetrics, getFunnelMetrics, toLocalDateKey } from '@/components/leads/leadAutomation';

type PeriodOption = 'this_month' | 'last_30_days' | 'all_time';

// Ordinal ramp (one hue, monotone lightness) for the four funnel stages —
// validated with scripts/validate_palette.js --ordinal against surface #121212.
const STAGE_COLORS = ['#86b6ef', '#5598e7', '#2a78d6', '#184f95'];

function getRange(period: PeriodOption): { from: string; to: string } {
  const now = new Date();
  const to = toLocalDateKey(now);

  if (period === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toLocalDateKey(from), to };
  }

  if (period === 'last_30_days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: toLocalDateKey(from), to };
  }

  return { from: '2000-01-01', to };
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export default function LeadsFunnelPanel() {
  const [period, setPeriod] = useState<PeriodOption>('this_month');
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => getRange(period), [period]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getFunnelMetrics(from, to)
      .then((result) => {
        if (!cancelled) setMetrics(result);
      })
      .catch((err) => {
        console.error('Erro loading funnel metrics:', err);
        if (!cancelled) setError('Não foi possível carregar o funil de conversão.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const stages = metrics
    ? [
        { label: 'Leads Recebidas', value: metrics.received },
        { label: 'Aulas Agendadas', value: metrics.trialScheduled },
        { label: 'Aulas Realizadas', value: metrics.trialCompleted },
        { label: 'Inscritos', value: metrics.enrolled },
      ]
    : [];

  const maxValue = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <Panel
      title="Funil de Conversão"
      icon={<span className="text-[#c81d25]">▤</span>}
      actionText={period === 'this_month' ? 'Este Mês' : period === 'last_30_days' ? 'Últimos 30 Dias' : 'Sempre'}
      onAction={() => {
        setPeriod((prev) =>
          prev === 'this_month' ? 'last_30_days' : prev === 'last_30_days' ? 'all_time' : 'this_month'
        );
      }}
    >
      {error ? (
        <p className="px-1 py-2 text-sm text-[#fca5a5]">{error}</p>
      ) : loading ? (
        <div className="flex items-center gap-2 px-1 py-4 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
          A carregar...
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const widthPct = Math.max(6, Math.round((stage.value / maxValue) * 100));
            const previous = stages[index - 1];

            return (
              <div key={stage.label}>
                {previous ? (
                  <p className="mb-1 pl-1 text-[11px] text-zinc-500">→ {pct(stage.value, previous.value)} conversão</p>
                ) : null}
                <div className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-zinc-400">{stage.label}</span>
                  <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-[#1a1a1a]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: STAGE_COLORS[index] }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold text-zinc-100">{stage.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
