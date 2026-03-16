import Panel from './Panel';
import { KidBehaviorItem } from './types';

export default function KidsBehaviorPanel({
  needsAttention,
  greatBehavior,
}: {
  needsAttention: KidBehaviorItem[];
  greatBehavior: KidBehaviorItem[];
}) {
  return (
    <Panel title="Kids Behavior" icon={<span className="text-[#c81d25]">⌘</span>} actionText="View all" onAction={() => console.log('view all kids behavior')}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-[#ef4444]">Needs Attention</p>
          <ul className="space-y-2">
            {needsAttention.map((kid) => (
              <li key={kid.id} className="flex items-center gap-2 text-sm">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-700 text-[10px] text-white">{kid.name.charAt(0)}</div>
                <span className="flex-1 text-zinc-200">{kid.name}</span>
                <span className="text-zinc-500">{kid.group}</span>
                <span className="text-[#ef4444]">✖</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-[#22c55e]">Great Behavior</p>
          <ul className="space-y-2">
            {greatBehavior.map((kid) => (
              <li key={kid.id} className="flex items-center gap-2 text-sm">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-zinc-700 text-[10px] text-white">{kid.name.charAt(0)}</div>
                <span className="flex-1 text-zinc-200">{kid.name}</span>
                <span className="text-zinc-500">{kid.group}</span>
                <span className="text-[#22c55e]">✔</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
