/** Returns Tailwind classes for a belt-coloured badge */
export function beltBadgeClass(belt: string): string {
  const b = (belt || '').toLowerCase();
  if (b.includes('black'))  return 'border-zinc-500 bg-zinc-900 text-zinc-100';
  if (b.includes('brown'))  return 'border-amber-700 bg-amber-900/30 text-amber-400';
  if (b.includes('purple')) return 'border-purple-700 bg-purple-900/30 text-purple-400';
  if (b.includes('blue'))   return 'border-blue-700 bg-blue-900/30 text-blue-400';
  if (b.includes('green'))  return 'border-green-700 bg-green-900/30 text-green-400';
  if (b.includes('orange')) return 'border-orange-600 bg-orange-900/30 text-orange-400';
  if (b.includes('yellow')) return 'border-yellow-600 bg-yellow-900/30 text-yellow-400';
  if (b.includes('grey') || b.includes('gray')) return 'border-zinc-600 bg-zinc-800/50 text-zinc-400';
  // white / default
  return 'border-zinc-600 bg-zinc-800/40 text-zinc-300';
}
