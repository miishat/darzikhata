export type Shortcut = 'search' | 'newOrder';

export interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

/**
 * Desktop shortcuts: "/" focuses search, "N" opens a new order. They never fire while typing,
 * with Ctrl, Cmd or Alt held (so browser and OS shortcuts keep working), or while a dialog is open.
 */
export function shortcutFor(event: ShortcutEvent): Shortcut | null {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTyping(event.target)) return null;
  if (document.querySelector('[role="dialog"]')) return null;
  if (event.key === '/') return 'search';
  if (event.key === 'n' || event.key === 'N') return 'newOrder';
  return null;
}
