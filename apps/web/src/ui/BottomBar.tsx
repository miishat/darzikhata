import type { ReactNode } from 'react';

/** Add to a page's bottom padding when it uses BottomBar, so nothing is hidden behind it. */
export const BOTTOM_BAR_SPACE = 'pb-28 md:pb-0';

/**
 * Action bar fixed to the bottom of a phone screen. It sits on top of the shell's tab bar (the tab bar is
 * 3.875rem plus its 1px border plus the larger of 0.875rem and the safe area), so both stay visible.
 */
export function BottomBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`fixed inset-x-0 bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))] z-20 flex items-center gap-3 border-t border-line bg-panel px-4 py-3 md:static md:border-t-0 md:bg-transparent md:px-0 ${className}`}
    >
      {children}
    </div>
  );
}
