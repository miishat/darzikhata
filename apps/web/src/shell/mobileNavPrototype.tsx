// PROTOTYPE (throwaway), round 4: variations of "a big search field on Home". Payments is left as it is.
// Switch with ?variant=0|1|2|3|4|5 on a phone.
//   1 the big field on top of Home, and the sync status in the header as a dot without words
//   2 the field sits inside the navy "Today" card, at its top
//   3 the field stays pinned under the header while Home scrolls
//   4 you type right on Home: results drop down under the field, no separate search screen
//   5 the field on Home; once it scrolls out of sight a search icon appears in the header
import type { Role } from '@darzikhata/domain';
import { ArrowLeft, Search } from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLocation } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { GlobalSearch } from './GlobalSearch';

export const NAV_VARIANTS = {
  '0': 'Current',
  '1': 'Home search, sync dot in the header',
  '2': 'Search inside the Today card',
  '3': 'Home search pinned while scrolling',
  '4': 'Type right on Home, results drop down',
  '5': 'Home search, header icon once scrolled past',
} as const;
export const NAV_KEYS = Object.keys(NAV_VARIANTS);

/** Variant 2: the dashboard asks the shell to open search. */
export const OPEN_SEARCH_EVENT = 'prototype-open-search';
export const requestSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

/** Full-screen search over orders and customers. */
export function SearchSheet({ role, onClose }: { role: Role; onClose(): void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const { pathname } = useLocation();
  const opened = useRef(pathname);
  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    if (pathname !== opened.current) onClose();
  }, [pathname, onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={t('search.label')} className="fixed inset-0 z-30 flex flex-col bg-panel">
      <div className="flex h-16 items-center gap-2 border-b border-line px-2">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={22} />
        </button>
        <GlobalSearch role={role} inputRef={input} />
      </div>
    </div>
  );
}

/** A button that looks like a search field and opens the sheet. */
export function SearchField({ onOpen, className = '', buttonRef }: { onOpen(): void; className?: string; buttonRef?: RefObject<HTMLButtonElement | null> }) {
  const { t } = useI18n();
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      className={`flex h-14 w-full min-w-0 items-center gap-2 rounded-xl border border-line bg-panel px-4 text-start text-base text-muted shadow-sm focus-visible:outline-2 focus-visible:outline-focus ${className}`}
    >
      <Search aria-hidden="true" size={20} className="shrink-0" />
      <span className="truncate">{t('search.placeholder')}</span>
    </button>
  );
}

export function SearchIcon({ onOpen }: { onOpen(): void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-label={t('search.label')}
      onClick={onOpen}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-focus"
    >
      <Search aria-hidden="true" size={22} />
    </button>
  );
}

/** Variant 4: the real search box, right on Home. */
export function InlineSearch({ role }: { role: Role }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="mb-4 [&_input]:h-14 [&_input]:bg-panel [&_input]:text-base [&_input]:shadow-sm [&_kbd]:hidden">
      <GlobalSearch role={role} inputRef={input} />
    </div>
  );
}

/** Variant 5: whether an element is still on screen below the header. */
export function useOnScreen(ref: RefObject<Element | null>, active: boolean): boolean {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!active || !ref.current) return setOn(true);
    const observer = new IntersectionObserver(([entry]) => setOn(entry!.isIntersecting), { rootMargin: '-56px 0px 0px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, active]);
  return on;
}
