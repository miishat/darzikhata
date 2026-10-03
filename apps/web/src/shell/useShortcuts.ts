import { useEffect, useRef } from 'react';
import { shortcutFor } from './shortcuts';

export interface ShortcutHandlers {
  /** Return true when the shortcut was acted on; only then is the key swallowed. */
  onSearch(): boolean;
  onNewOrder(): boolean;
}

/** Listens for the desktop shortcuts on the document; the handlers decide whether they apply. */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcutFor(event);
      const acted =
        shortcut === 'search' ? latest.current.onSearch() : shortcut === 'newOrder' ? latest.current.onNewOrder() : false;
      if (acted) event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
