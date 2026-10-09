// PROTOTYPE (throwaway): floating bar that cycles ?variant= for UI prototypes. Never shown in production builds.
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

export function useVariant(keys: readonly string[]): string {
  const [params] = useSearchParams();
  const v = params.get('variant') ?? keys[0]!;
  return keys.includes(v) ? v : keys[0]!;
}

export function PrototypeSwitcher({ variants, top }: { variants: Record<string, string>; top?: boolean }) {
  const keys = Object.keys(variants);
  const current = useVariant(keys);
  const [, setParams] = useSearchParams();
  const go = (step: number) => {
    const next = keys[(keys.indexOf(current) + step + keys.length) % keys.length]!;
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('variant', next);
        return p;
      },
      { replace: true },
    );
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.matches('input,textarea,select,[contenteditable]') || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (import.meta.env.PROD) return null;
  return (
    <div className={`fixed ${top ? 'top-2' : 'bottom-6'} left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1 text-sm font-semibold text-white shadow-2xl ring-2 ring-fuchsia-400`}>
      <button type="button" aria-label="Previous variant" onClick={() => go(-1)} className="size-9 rounded-full hover:bg-white/15">
        ‹
      </button>
      <span className="min-w-48 text-center">
        PROTOTYPE {current}: {variants[current]}
      </span>
      <button type="button" aria-label="Next variant" onClick={() => go(1)} className="size-9 rounded-full hover:bg-white/15">
        ›
      </button>
    </div>
  );
}
