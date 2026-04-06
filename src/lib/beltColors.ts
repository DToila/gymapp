interface BeltStyle {
  borderColor: string;
  backgroundColor: string;
  color: string;
}

/** Returns inline CSS styles for a belt-coloured badge — safe against Tailwind purging */
export function beltStyle(belt: string): BeltStyle {
  const b = (belt || '').toLowerCase();
  if (b.includes('black'))  return { borderColor: '#52525b', backgroundColor: 'rgba(9,9,11,0.9)',   color: '#f4f4f5' };
  if (b.includes('brown'))  return { borderColor: '#92400e', backgroundColor: 'rgba(120,53,15,0.3)', color: '#fbbf24' };
  if (b.includes('purple')) return { borderColor: '#6b21a8', backgroundColor: 'rgba(88,28,135,0.3)', color: '#c084fc' };
  if (b.includes('blue'))   return { borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,0.2)', color: '#60a5fa' };
  if (b.includes('green'))  return { borderColor: '#15803d', backgroundColor: 'rgba(21,128,61,0.2)', color: '#4ade80' };
  if (b.includes('orange')) return { borderColor: '#c2410c', backgroundColor: 'rgba(194,65,12,0.2)', color: '#fb923c' };
  if (b.includes('yellow')) return { borderColor: '#a16207', backgroundColor: 'rgba(161,98,7,0.2)',  color: '#facc15' };
  if (b.includes('grey') || b.includes('gray'))
                            return { borderColor: '#52525b', backgroundColor: 'rgba(63,63,70,0.3)',  color: '#a1a1aa' };
  // white / default
                            return { borderColor: '#52525b', backgroundColor: 'rgba(63,63,70,0.2)',  color: '#d4d4d8' };
}

/** Helper: returns the style object as React CSSProperties */
export function beltInlineStyle(belt: string): React.CSSProperties {
  return beltStyle(belt);
}
