import type { ReactNode } from 'react';

/** Add to a page's bottom padding when it uses BottomBar, so nothing is hidden behind it. */
export const BOTTOM_BAR_SPACE = 'pb-28 md:pb-0';

/**
 * Action bar fixed to the bottom of a phone screen. By default it sits on top of the shell's tab bar (the tab bar is
 * 3.875rem plus its 1px border plus the larger of 0.875rem and the safe area), so both stay visible.
 * Pages with no tab bar, such as the public status page, pass `tabBar={false}` to sit at the very bottom.
 */
export function BottomBar({ children, className = '', tabBar = true }: { children: ReactNode; className?: string; tabBar?: boolean }) {
  const position = tabBar
    ? 'bottom-[calc(3.875rem+1px+max(0.875rem,env(safe-area-inset-bottom)))]'
    : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]';
  return (
    <div
      className={`fixed inset-x-0 ${position} z-20 flex items-center gap-3 border-t border-line bg-panel px-4 py-3 md:static md:border-t-0 md:bg-transparent md:px-0 ${className}`}
    >
      {children}
    </div>
  );
}
