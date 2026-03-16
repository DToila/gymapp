import { KpiItem } from './types';

const accentClass: Record<NonNullable<KpiItem['accent']>, string> = {
  neutral: 'text-white',
  warning: 'text-[#f59e0b]',
  danger: 'text-[#ef4444]',
  success: 'text-[#22c55e]',
};

export default function KpiCard({ item }: { item: KpiItem }) {
  const accent = accentClass[item.accent || 'neutral'];

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#1f1f1f] text-[#c81d25]">
        <span className="text-sm">●</span>
      </div>
      <div>
        <p className="text-3xl font-bold leading-none text-white">{item.value}</p>
        <p className={`mt-1 text-sm ${accent}`}>{item.label}</p>
      </div>
    </article>
  );
}
