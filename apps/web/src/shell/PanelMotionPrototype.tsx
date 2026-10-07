// PROTOTYPE (throwaway): how the side panel arrives beside the orders and customers lists, switched with ?variant=.
import { useEffect, useLayoutEffect, useRef, type MouseEvent, type RefObject } from 'react';
import { useNavigate, useSearchParams, type NavigateOptions, type To } from 'react-router';
import { PrototypeSwitcher, useVariant } from '../ui/PrototypeSwitcher';

export const MOTION_VARIANTS = {
  A: 'Current: the panel appears at once',
  B: 'Slide: the panel slides in from the right and fades in; the list narrows at once',
  C: 'Morph: the list card shrinks smoothly while the panel moves in (closing too)',
  D: 'Grow: the panel opens out from the right edge, pushing the list narrower',
  E: 'Fade through: the new layout fades in softly',
};

export function useMotionVariant() {
  return useVariant(Object.keys(MOTION_VARIANTS));
}

const STORED = 'prototype-panel-motion';

/** The chosen variant also lives in this tab's session, so moving between pages (which drops ?variant=) keeps it. */
export function MotionSwitcher() {
  const [params, setParams] = useSearchParams();
  const v = params.get('variant');
  useEffect(() => {
    try {
      if (v) sessionStorage.setItem(STORED, v);
      else {
        const stored = sessionStorage.getItem(STORED);
        if (stored) setParams((prev) => { const p = new URLSearchParams(prev); p.set('variant', stored); return p; }, { replace: true });
      }
    } catch {
      // Storage can be off; the address still carries the variant.
    }
  }, [v, setParams]);
  return <PrototypeSwitcher variants={MOTION_VARIANTS} />;
}

/**
 * Navigates, and for C wraps the change in the browser's view transition: the page is pictured before,
 * the router commits at once (flushSync), and the browser morphs the named cards into place.
 */
export function useMotionNavigate() {
  const navigate = useNavigate();
  const variant = useMotionVariant();
  // `opens`: whether this navigation opens (true) or closes (false) the panel; moving within an open panel is left alone.
  return (to: To, opts: NavigateOptions = {}, opens?: boolean) => {
    const isOpen = () => document.querySelector('[style*="vt-panel"]') !== null;
    if (variant !== 'C' || opens === undefined || isOpen() === opens || typeof document.startViewTransition !== 'function' || reduced()) return void navigate(to, opts);
    document.startViewTransition(async () => {
      void navigate(to, opts);
      // The router commits a moment later; picture the new layout only once the panel has come or gone.
      for (let waited = 0; isOpen() !== opens && waited < 600; waited += 10) await new Promise((r) => setTimeout(r, 10));
    });
  };
}

/** For a link: the same, taking over its click when C is on. */
export function useMotionLink() {
  const go = useMotionNavigate();
  const variant = useMotionVariant();
  return (to: To, opts: NavigateOptions = {}, opens?: boolean, also?: (event: MouseEvent) => void) => ({
    onClick: (event: MouseEvent) => {
      also?.(event);
      if (variant !== 'C' || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      go(to, opts, opens);
    },
  });
}

/** Keeps ?variant= on links that would otherwise drop it. */
export function useKeepVariant() {
  const [params] = useSearchParams();
  const v = params.get('variant');
  return (path: string) => (v ? `${path}?variant=${v}` : path);
}

/** Names the two cards for C, so the browser can morph them between the closed and open layouts. */
export function vtName(variant: string, name: 'vt-list' | 'vt-panel') {
  return variant === 'C' ? { style: { viewTransitionName: name } } : {};
}

const EASE = 'cubic-bezier(0.2, 0.9, 0.3, 1)';
const reduced = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays the chosen arrival when the panel goes from closed to open. `list` is the list's column,
 * `panel` the panel's card. `grows` names which one has the fixed width in this page's open layout.
 */
export function usePanelMotion(open: boolean, list: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>, grows: 'panel' | 'list') {
  const variant = useMotionVariant();
  const was = useRef(open);
  const before = useRef<number>(0);
  useLayoutEffect(() => {
    const opening = open && !was.current;
    was.current = open;
    // The list's width once the closed layout has settled, for D on the customers page.
    if (!open && list.current) before.current = list.current.getBoundingClientRect().width;
    if (!opening || reduced() || typeof Element.prototype.animate !== 'function') return;
    const l = list.current;
    const p = panel.current;
    if (!l || !p) return;
    if (variant === 'B') {
      p.animate([{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: EASE });
    }
    if (variant === 'D') {
      const inner = p.firstElementChild as HTMLElement | null;
      const end = p.getBoundingClientRect().width;
      if (grows === 'panel') {
        if (inner) inner.style.minWidth = `${end}px`;
        const a = p.animate([{ width: '0px', opacity: 0.4 }, { width: `${end}px`, opacity: 1 }], { duration: 340, easing: EASE });
        a.onfinish = () => inner && (inner.style.minWidth = '');
      } else {
        const start = before.current || l.parentElement!.getBoundingClientRect().width;
        const listEnd = l.getBoundingClientRect().width;
        if (inner) inner.style.minWidth = `${end}px`;
        const a = l.animate([{ width: `${start}px` }, { width: `${listEnd}px` }], { duration: 340, easing: EASE });
        p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 80, easing: EASE, fill: 'backwards' });
        a.onfinish = () => inner && (inner.style.minWidth = '');
      }
    }
    if (variant === 'E') {
      l.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      p.animate([{ opacity: 0, transform: 'scale(0.985)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 60, easing: 'ease-out', fill: 'backwards' });
    }
  }, [open, variant, list, panel, grows]);
  return variant;
}
