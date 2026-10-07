import { useLayoutEffect, useRef, type RefObject } from 'react';

const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)';
const DURATION = 340;

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Opening a side panel beside a list on a desktop: the panel opens out from the right edge and the list makes
 * room for it as it goes, instead of the layout jumping. `fixed` names which of the two has its own width in the
 * open layout: the panel (orders) grows from nothing, the list (customers) narrows from its full width while the
 * panel fades in. Only opening moves; going from one record to another inside an open panel stays still. It is
 * off when the person asks for less motion.
 */
export function usePanelGrow(open: boolean, list: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, fixed: 'panel' | 'list') {
  const wasOpen = useRef(open);
  const closedWidth = useRef(0);

  useLayoutEffect(() => {
    const opening = open && !wasOpen.current;
    wasOpen.current = open;
    const l = list.current;
    const p = panel.current;
    // Measured once the closed layout has settled, so the next opening starts from the full width.
    if (!open && l) closedWidth.current = l.getBoundingClientRect().width;
    if (!opening || !l || !p || reducedMotion() || typeof p.animate !== 'function') return;

    // The panel's content keeps its final width while its box grows, so nothing inside reflows.
    const inner = p.firstElementChild as HTMLElement | null;
    const end = p.getBoundingClientRect().width;
    if (inner) inner.style.minWidth = `${end}px`;
    const release = () => inner && (inner.style.minWidth = '');

    const growing =
      fixed === 'panel'
        ? p.animate([{ width: '0px', opacity: 0.4 }, { width: `${end}px`, opacity: 1 }], { duration: DURATION, easing: EASE })
        : l.animate([{ width: `${closedWidth.current || l.parentElement!.getBoundingClientRect().width}px` }, { width: `${l.getBoundingClientRect().width}px` }], {
            duration: DURATION,
            easing: EASE,
          });
    if (fixed === 'list') p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 80, easing: EASE, fill: 'backwards' });
    growing.onfinish = release;
    growing.oncancel = release;
  }, [open, list, panel, fixed]);
}
