import { KpiItem } from './types';

const accentStyles: Record<NonNullable<KpiItem['accent']>, { value: string; bar: string; dot: string }> = {
  neutral: { value: 'text-white',        bar: 'bg-blue-500',  dot: 'bg-blue-500'  },
  warning: { value: 'text-[#f59e0b]',   bar: 'bg-amber-500', dot: 'bg-amber-500' },
  danger:  { value: 'text-[#ef4444]',   bar: 'bg-red-500',   dot: 'bg-red-500'   },
  success: { value: 'text-[#22c55e]',   bar: 'bg-green-500', dot: 'bg-green-500' },
};

export default function KpiCard({ item }: { item: KpiItem }) {
  const style = accentStyles[item.accent || 'neutral'];

  return (
    <article className="relative overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#161616] p-4 sm:p-5">
      <div className={`absolute left-0 top-0 h-full w-[3px] ${style.bar}`} />
      <p className={`text-4xl font-black leading-none ${style.value}`}>{item.value}</p>
      <p className="mt-2 text-sm text-zinc-400 leading-snug">{item.label}</p>
    </article>
  );
}
