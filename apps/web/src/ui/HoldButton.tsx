import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

/** How long the press must last before the button acts. */
export const HOLD_MS = 900;

export interface HoldButtonProps {
  /** What the button says at rest, e.g. "চেপে ধরে বাদ". */
  label: string;
  /** What it says while being held. */
  holdingLabel: string;
  /** Full name for screen readers, naming what is removed. */
  accessibleLabel: string;
  onConfirm(): void;
  className?: string;
}

/**
 * A danger button that acts only after a press held for HOLD_MS, so a stray tap cannot remove anything.
 * A red fill grows across it while held; letting go or sliding off early cancels. Space or Enter held works too.
 */
export function HoldButton({ label, holdingLabel, accessibleLabel, onConfirm, className = '' }: HoldButtonProps) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
  };
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const isHoldKey = (e: KeyboardEvent) => e.key === ' ' || e.key === 'Enter';

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => {
        if (!isHoldKey(e)) return;
        e.preventDefault();
        if (!e.repeat) start();
      }}
      onKeyUp={(e) => isHoldKey(e) && stop()}
      onBlur={stop}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative inline-flex min-h-11 select-none items-center justify-center overflow-hidden whitespace-nowrap rounded-lg border border-danger/50 px-3 text-sm font-semibold text-danger [touch-action:manipulation] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 start-0 bg-danger/20"
        style={{ width: holding ? '100%' : '0%', transition: holding ? `width ${HOLD_MS}ms linear` : 'none' }}
      />
      <span className="relative inline-flex items-center gap-2">
        <Trash2 aria-hidden="true" size={16} />
        {holding ? holdingLabel : label}
      </span>
    </button>
  );
}
