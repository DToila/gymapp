"use client";

import { useEffect, useRef, useState } from 'react';

interface RowActionsMenuProps {
  options: Array<{ key: string; label: string; danger?: boolean; onClick: () => void }>;
}

export default function RowActionsMenu({ options }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={rootRef} style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="grid h-9 w-9 place-items-center rounded-lg border border-[#252525] bg-[#141414] text-lg leading-none text-zinc-300 transition hover:bg-[#1a1a1a]"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[190px] overflow-hidden rounded-xl border border-[#252525] bg-[#111111] shadow-[0_10px_22px_rgba(0,0,0,0.45)]">
          {options.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                option.onClick();
                setOpen(false);
              }}
              className={`w-full border-b border-[#1f1f1f] px-3 py-2.5 text-left text-xs transition last:border-b-0 ${
                option.danger
                  ? 'text-red-300 hover:bg-[rgba(239,68,68,0.12)]'
                  : 'text-zinc-100 hover:bg-[#1a1a1a]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
