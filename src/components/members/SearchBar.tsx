"use client";

import { useEffect, useState } from 'react';

interface SearchBarProps {
  value: string;
  onDebouncedChange: (value: string) => void;
  delay?: number;
}

export default function SearchBar({ value, onDebouncedChange, delay = 300 }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDebouncedChange(localValue);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [localValue, delay, onDebouncedChange]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder="Pesquisar por nome, email, telemóvel..."
      className="w-full rounded-full border border-[#252525] bg-[#0f0f0f] px-5 py-3 text-sm text-zinc-200 shadow-[0_6px_16px_rgba(0,0,0,0.25)] placeholder:text-zinc-500 focus:border-[#333] focus:outline-none"
    />
  );
}
