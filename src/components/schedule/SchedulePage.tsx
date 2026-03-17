"use client";

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { studentSchedule } from '@/components/student/studentData';

const DAY_ORDER = [
  { key: 'SEG', label: 'Seg' },
  { key: 'TER', label: 'Ter' },
  { key: 'QUA', label: 'Qua' },
  { key: 'QUI', label: 'Qui' },
  { key: 'SEX', label: 'Sex' },
  { key: 'SAB', label: 'Sáb' },
  { key: 'DOM', label: 'Dom' },
] as const;

type DayKey = (typeof DAY_ORDER)[number]['key'];

function dayNumberToKey(n: number): DayKey | null {
  return ([null, 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'] as const)[n] ?? null;
}

function parseStartMinutes(t: string): number {
  const [hh, mm] = t.replace(/\s/g, '').split('-')[0].split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function SchedulePage() {
  const router = useRouter();
  const [scheduleView, setScheduleView] = useState<'image' | 'grid'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const openModal = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsModalOpen(true);
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => clamp(Number((prev + delta).toFixed(2)), 1, 3));
  };

  const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  };

  const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    });
  };

  const onMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const classesByDay = useMemo(() => {
    const byDay: Record<DayKey, typeof studentSchedule> = {
      SEG: [], TER: [], QUA: [], QUI: [], SEX: [], SAB: [], DOM: [],
    };
    for (const item of studentSchedule) {
      const key = typeof item.day === 'number' ? dayNumberToKey(item.day) : null;
      if (key) byDay[key].push(item);
    }
    for (const { key } of DAY_ORDER) {
      byDay[key].sort((a, b) => parseStartMinutes(a.time) - parseStartMinutes(b.time));
    }
    return byDay;
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <TeacherSidebar active="schedule" onLogout={() => router.push('/')} />

      <main className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex w-full max-w-[500px] items-center gap-2 rounded-full border border-[#222] bg-[#121212] px-4 py-2.5 shadow-[0_6px_22px_rgba(0,0,0,0.28)]">
              <span className="text-zinc-500">⌕</span>
              <input
                placeholder="Search class..."
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/schedule.png';
                  link.download = 'schedule.png';
                  link.click();
                }}
                className="rounded-xl border border-[#252525] bg-[#141414] px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#3a3a3a] hover:text-white"
              >
                Download
              </button>
              <button
                type="button"
                onClick={openModal}
                className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(200,29,37,0.28)] transition hover:bg-[#ab1820]"
              >
                Open full screen
              </button>
            </div>
          </div>

          <header className="mb-6">
            <h1 className="text-4xl font-bold text-white">Horário</h1>
            <p className="mt-1 text-lg text-zinc-400">Gracie Barra Carnaxide e Oeiras</p>
          </header>

          <section className="rounded-2xl border border-[#222] bg-[#121212] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.35)] lg:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleView('grid')}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${scheduleView === 'grid' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
                >
                  Grade semanal
                </button>
                <button
                  onClick={() => setScheduleView('image')}
                  className={`rounded-xl border px-3 py-1.5 text-sm ${scheduleView === 'image' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
                >
                  Imagem
                </button>
              </div>
              <select className="rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 text-xs text-zinc-200 outline-none">
                <option>Current schedule</option>
              </select>
            </div>

            {scheduleView === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-7">
                {DAY_ORDER.map(({ key, label }) => {
                  const rows = classesByDay[key] || [];
                  return (
                    <article key={key} className="h-full rounded-2xl border border-[#222] bg-[#161616] shadow-[0_10px_24px_rgba(0,0,0,0.34)]">
                      <div className="sticky top-0 z-10 rounded-t-2xl border-b border-[#262626] bg-[#1a1a1a] px-3 py-2.5">
                        <p className="text-sm font-semibold tracking-wide text-zinc-200">{label}</p>
                      </div>
                      <div className="space-y-2 p-3">
                        {rows.length === 0 ? (
                          <p className="rounded-xl border border-[#262626] bg-[#121212] px-3 py-2 text-sm text-zinc-500">Sem aulas</p>
                        ) : (
                          rows.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-[#262626] bg-[#121212] px-3 py-2 transition hover:bg-white/5"
                              title={`${item.level} • ${item.type}${item.notes ? ` • ${item.notes}` : ''}`}
                            >
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="rounded-full border border-[#333] bg-[#111] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-300">
                                  {item.room}
                                </span>
                                <span className="text-xs font-medium text-zinc-200">{item.time.replace('-', '–')}</span>
                              </div>
                              <p className="text-xs text-zinc-400">
                                {item.level} • {item.type}
                                {item.type === 'Sparring' ? (
                                  <span className="ml-1 rounded-full border border-[#5b1f24] bg-[rgba(91,31,36,0.25)] px-1.5 py-0.5 text-[10px] text-rose-300">
                                    Sparring
                                  </span>
                                ) : null}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-[#232323] bg-[#161616] p-3 lg:p-4">
                  {imageMissing ? (
                    <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-[#333] text-sm text-zinc-500">
                      Schedule image not found at /public/schedule.png
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={openModal}
                      className="w-full overflow-hidden rounded-lg border border-[#222] bg-[#0f0f0f]"
                    >
                      <div className="relative mx-auto aspect-[4/3] w-full max-w-5xl">
                        <Image
                          src="/schedule.png"
                          alt="Academy schedule"
                          fill
                          priority
                          sizes="(max-width: 1024px) 100vw, 900px"
                          className="object-contain"
                          onError={() => setImageMissing(true)}
                        />
                      </div>
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#20303f] bg-[rgba(32,48,63,0.35)] px-2.5 py-1 text-[11px] font-semibold text-sky-300">GBK</span>
                    <span className="rounded-full border border-[#3f2f20] bg-[rgba(63,47,32,0.35)] px-2.5 py-1 text-[11px] font-semibold text-orange-300">GB1</span>
                    <span className="rounded-full border border-[#2f3f20] bg-[rgba(47,63,32,0.35)] px-2.5 py-1 text-[11px] font-semibold text-lime-300">GB2</span>
                  </div>
                  <button type="button" onClick={openModal} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
                    View full size
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-6xl rounded-2xl border border-[#2a2a2a] bg-[#121212] shadow-[0_22px_56px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between border-b border-[#202020] px-4 py-3">
              <p className="text-sm font-semibold text-zinc-200">Horário — Full size</p>
              <div className="flex items-center gap-2">
                <button onClick={() => handleZoom(-0.25)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-xs text-zinc-300">-</button>
                <span className="w-14 text-center text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
                <button onClick={() => handleZoom(0.25)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-xs text-zinc-300">+</button>
                <button
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2 py-1 text-xs text-zinc-300"
                >
                  Reset
                </button>
                <button onClick={() => setIsModalOpen(false)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1 text-xs text-zinc-300">✕</button>
              </div>
            </div>

            <div
              className="relative max-h-[78vh] overflow-hidden bg-[#0f0f0f]"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              {!imageMissing ? (
                <div
                  className="relative h-[78vh] w-full"
                  style={{
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  }}
                >
                  <Image
                    src="/schedule.png"
                    alt="Academy schedule full size"
                    fill
                    priority
                    sizes="100vw"
                    className="object-contain select-none"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: 'center center',
                      transition: isDragging ? 'none' : 'transform 120ms ease',
                    }}
                    draggable={false}
                    onError={() => setImageMissing(true)}
                  />
                </div>
              ) : (
                <div className="grid h-[60vh] place-items-center text-sm text-zinc-500">Schedule image not found at /public/schedule.png</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
