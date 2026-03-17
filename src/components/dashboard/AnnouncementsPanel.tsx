import { AnnouncementItem } from './types';

const tagChipClass: Record<AnnouncementItem['tag'], string> = {
  URGENT: 'border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] text-[#fda4af]',
  INFO: 'border-[#3f3f46] bg-[rgba(63,63,70,0.28)] text-zinc-300',
  EVENT: 'border-[#581c87] bg-[rgba(88,28,135,0.26)] text-violet-300',
  PAYMENTS: 'border-[#7c2d12] bg-[rgba(124,45,18,0.3)] text-orange-300',
};

export default function AnnouncementsPanel({
  items,
  maxVisible = 3,
  canCreate = true,
}: {
  items: AnnouncementItem[];
  maxVisible?: number;
  canCreate?: boolean;
}) {
  const visible = items.slice(0, maxVisible);

  return (
    <section className="rounded-2xl border border-[#252525] bg-[#121212] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="text-[#c81d25]">📣</span>
          <h3>Announcements</h3>
        </div>

        <div className="flex items-center gap-3">
          {canCreate ? (
            <button
              onClick={() => console.log('new announcement')}
              className="rounded-md border border-[#2d2d2d] bg-[#161616] px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:border-[#c81d25] hover:text-white"
            >
              + New
            </button>
          ) : null}
          <button onClick={() => console.log('view all announcements')} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
            View all
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="min-h-[220px]">
          {visible.length === 0 ? (
            <p className="py-4 text-sm text-zinc-500">No announcements right now.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => (
                <li key={item.id} className="rounded-lg border border-[#222] bg-[#101010] px-3 py-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[item.tag]}`}>
                      {item.tag}
                    </span>
                    {item.pinned ? <span className="text-xs text-zinc-300" title="Pinned">📌</span> : null}
                  </div>

                  <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Audience: {item.audience} <span className="mx-1.5">•</span> Expires: {item.expiresAt}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#1f1f1f] pt-3 text-sm">
          <span className="text-zinc-500">Showing {visible.length} of {items.length}</span>
          <button onClick={() => console.log('manage announcements')} className="font-medium text-[#c81d25] hover:text-[#ef3a43]">
            Manage
          </button>
        </div>
      </div>
    </section>
  );
}
