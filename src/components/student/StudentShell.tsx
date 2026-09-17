"use client";

import { ReactNode } from 'react';

// The sidebar/auth-gate frame this used to render now lives in
// src/app/student/layout.tsx (a real persistent Next.js layout, so it
// doesn't remount on every navigation). This component is just the
// per-page header + content wrapper now.
export default function StudentShell({
  title,
  subtitle,
  rightActions,
  children,
}: {
  title: string;
  subtitle?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black leading-tight text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>
        {rightActions && <div className="flex gap-2">{rightActions}</div>}
      </header>
      {children}
    </>
  );
}
