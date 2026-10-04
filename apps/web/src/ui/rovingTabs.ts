import type { KeyboardEvent } from 'react';

/**
 * Arrow, Home and End key handling for a row of tabs with one tab stop.
 * `idOf` gives the DOM id of a tab so focus can follow the selection.
 */
export function rovingTabsKeyDown<T extends string>(
  keys: readonly T[],
  current: T,
  select: (key: T) => void,
  idOf: (key: T) => string,
) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const index = keys.indexOf(current);
    let target = -1;
    if (e.key === 'ArrowRight') target = (index + 1) % keys.length;
    else if (e.key === 'ArrowLeft') target = (index - 1 + keys.length) % keys.length;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = keys.length - 1;
    if (target < 0) return;
    e.preventDefault();
    const next = keys[target]!;
    select(next);
    document.getElementById(idOf(next))?.focus();
  };
}
