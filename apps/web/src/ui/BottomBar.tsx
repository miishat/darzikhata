import type { ReactNode } from 'react';

/** Add to a page's bottom padding when it uses BottomBar, so nothing is hidden behind it. */
export const BOTTOM_BAR_SPACE = 'pb-28 md:pb-0';

/** Action bar fixed to the bottom of a phone screen, above the safe area. */
export function BottomBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 border-t border-line bg-panel px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-t-0 md:bg-transparent md:px-0 ${className}`}
    >
      {children}
    </div>
  );
}
