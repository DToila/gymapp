import { ReactNode } from 'react';

interface PanelProps {
  title: string;
  icon?: ReactNode;
  actionText?: string;
  onAction?: () => void;
  children: ReactNode;
}

export default function Panel({ title, icon, actionText, onAction, children }: PanelProps) {
  return (
    <section className="rounded-2xl border border-[#252525] bg-[#121212] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          {icon}
          <h3>{title}</h3>
        </div>
        {actionText ? (
          <button onClick={onAction} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
            {actionText}
          </button>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
