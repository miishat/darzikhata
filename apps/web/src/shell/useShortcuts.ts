import { useEffect, useRef } from 'react';
import { shortcutFor } from './shortcuts';

export interface ShortcutHandlers {
  onSearch(): void;
  onNewOrder(): void;
}

/** Listens for the desktop shortcuts on the document; the handlers decide whether they apply. */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutFor(event);
      if (shortcut === 'search') {
        event.preventDefault();
        latest.current.onSearch();
      } else if (shortcut === 'newOrder') {
        event.preventDefault();
        latest.current.onNewOrder();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
