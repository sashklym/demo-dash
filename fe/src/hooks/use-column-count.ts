import { useSyncExternalStore } from 'react';

/**
 * Column count of the widget grid at the current viewport width. Mirrors the
 * Tailwind breakpoints on the grid (`md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`)
 * so the virtualizer can map a flat widget list onto the same rows the CSS grid
 * would produce.
 */
const BREAKPOINTS = [
  { query: '(min-width: 1536px)', cols: 4 },
  { query: '(min-width: 1024px)', cols: 3 },
  { query: '(min-width: 768px)', cols: 2 },
] as const;

function getColumnCount(): number {
  for (const { query, cols } of BREAKPOINTS) {
    if (window.matchMedia(query).matches) return cols;
  }
  return 1;
}

function subscribe(onChange: () => void): () => void {
  const lists = BREAKPOINTS.map(({ query }) => window.matchMedia(query));
  lists.forEach((list) => list.addEventListener('change', onChange));
  return () => lists.forEach((list) => list.removeEventListener('change', onChange));
}

export function useColumnCount(): number {
  return useSyncExternalStore(subscribe, getColumnCount, () => 1);
}
