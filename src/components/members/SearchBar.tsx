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
      placeholder="Search by name, email, phone..."
      style={{
        width: '100%',
        background: '#121212',
        border: '1px solid #2a2a2a',
        color: '#f0f0f0',
        padding: '12px 14px',
        fontSize: '14px',
        outline: 'none'
      }}
    />
  );
}
