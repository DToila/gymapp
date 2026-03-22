'use client';

import { useRouter } from 'next/navigation';
import Panel from './Panel';
import { BirthdayItem } from './types';

export default function UpcomingBirthdays({ items }: { items: BirthdayItem[] }) {
  const router = useRouter();

  return (
    <Panel title="Próximos Aniversários" icon={<span className="text-[#f59e0b]">◌</span>} actionText="Ver tudo" onAction={() => router.push('/members')}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 border-b border-[#1f1f1f] pb-2 last:border-b-0">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-700 text-xs text-white">{item.name.charAt(0)}</div>
            <span className="flex-1 text-sm text-zinc-200">{item.name}</span>
            <span className="text-sm text-[#f59e0b]">{item.dateLabel}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
