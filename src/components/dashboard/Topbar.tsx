export default function Topbar() {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="max-w-[360px] flex-1">
        <input
          placeholder="Pesquisar..."
          className="w-full rounded-lg border border-[#1e1e1e] bg-[#161616] px-4 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
        />
      </div>

      <div className="flex items-center gap-3 text-zinc-300">
      </div>
    </div>
  );
}
