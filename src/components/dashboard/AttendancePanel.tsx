import Panel from './Panel';
import { AttendanceRecentItem } from './types';
import { useRouter } from 'next/navigation';
import { toDateKey } from '@/lib/attendanceState';

export default function AttendancePanel({ checkedIn, total, recent }: { checkedIn: number; total: number; recent: AttendanceRecentItem[] }) {
  const router = useRouter();
  const progress = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  return (
    <Panel title="Hoje's Presenças" icon={<span className="text-[#f59e0b]">◔</span>}>
      <div className="flex flex-col items-center">
        <div
          className="mb-4 grid h-32 w-32 place-items-center rounded-full"
          style={{ background: `conic-gradient(#c81d25 ${progress}%, #2b2b2b ${progress}% 100%)` }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-[#111] text-center">
            <p className="text-3xl font-bold text-white">{checkedIn} / {total}</p>
            <p className="text-xs text-zinc-500">Entrou</p>
          </div>
        </div>

        <button
          onClick={() => {
            const todayKey = toDateKey(new Date());
            router.push(`/attendance?date=${todayKey}`);
          }}
          className="mb-4 w-full rounded-xl bg-[#c81d25] px-4 py-3 text-sm font-semibold text-white hover:bg-[#ad1920]"
        >
          Start Presenças
        </button>

        <div className="w-full">
          <p className="mb-2 text-sm text-zinc-400">Recente</p>
          <ul className="space-y-2 text-sm">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center justify-between border-b border-[#1f1f1f] pb-1.5 text-zinc-200 last:border-b-0">
                <span>{item.name}</span>
                <span className="text-zinc-500">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}
