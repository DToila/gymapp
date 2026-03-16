export default function Topbar() {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="max-w-[420px] flex-1">
        <input
          placeholder="Search..."
          className="w-full rounded-full border border-[#252525] bg-[#0f0f0f] px-5 py-3 text-sm text-zinc-200 placeholder:text-zinc-500"
        />
      </div>

      <div className="flex items-center gap-3 text-zinc-300">
        <button className="relative grid h-10 w-10 place-items-center rounded-full border border-[#252525] bg-[#121212]">
          🔔
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#c81d25]" />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-[#252525] bg-[#121212]">💬</button>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-[#252525] bg-[#121212]">🔔</button>
        <button className="grid h-10 w-10 place-items-center rounded-full border border-[#252525] bg-[#121212] text-sm font-semibold text-white">
          P
        </button>
      </div>
    </div>
  );
}
