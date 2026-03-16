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
        style={{
          width: '28px',
          height: '28px',
          border: '1px solid #2a2a2a',
          background: '#111111',
          color: '#cccccc',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1
        }}
      >
        ⋯
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '34px',
          background: '#101010',
          border: '1px solid #2a2a2a',
          minWidth: '180px',
          zIndex: 30
        }}>
          {options.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                option.onClick();
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '9px 10px',
                border: 'none',
                background: 'transparent',
                color: option.danger ? '#ff7c7c' : '#f0f0f0',
                borderBottom: '1px solid #1b1b1b',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
