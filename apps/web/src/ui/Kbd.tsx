import type { ReactNode } from 'react';

/**
 * An inline keyboard hint. It is hidden from assistive tech because the key is
 * already in the control's accessible description (aria-keyshortcuts or its name).
 */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd aria-hidden="true" className="rounded border border-line bg-surface px-1.5 font-sans text-xs font-semibold text-muted">
      {children}
    </kbd>
  );
}
