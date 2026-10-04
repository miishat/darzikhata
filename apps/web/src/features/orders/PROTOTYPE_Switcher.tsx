// PROTOTYPE (throwaway): floating bottom bar that cycles ?variant= with the arrows.
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { CELL_VARIANTS, type CellVariant } from './PROTOTYPE_StageCellVariants';

const KEYS = Object.keys(CELL_VARIANTS) as CellVariant[];

export function useCellVariant(): CellVariant {
  const [params] = useSearchParams();
  const v = params.get('variant');
  return KEYS.includes(v as CellVariant) ? (v as CellVariant) : 'A';
}

export function PrototypeSwitcher() {
  const current = useCellVariant();
  const [, setParams] = useSearchParams();
  const go = (step: number) => {
    const next = KEYS[(KEYS.indexOf(current) + step + KEYS.length) % KEYS.length]!;
    setParams((p) => {
      const q = new URLSearchParams(p);
      q.set('variant', next);
      return q;
    }, { replace: true });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, [contenteditable], tr[data-order-id]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg">
      <button type="button" aria-label="Previous variant" onClick={() => go(-1)}>←</button>
      <span>{current} ({CELL_VARIANTS[current].name})</span>
      <button type="button" aria-label="Next variant" onClick={() => go(1)}>→</button>
    </div>
  );
}
