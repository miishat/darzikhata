import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose(): void;
  children?: ReactNode;
  actions?: ReactNode;
  /** On a phone the sheet is announced by its title but shows none, as for a menu whose rows speak for themselves. */
  hideTitleOnPhone?: boolean;
  /** The action buttons show only on larger screens; on a phone the sheet closes by tapping outside it. */
  actionsDesktopOnly?: boolean;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Open dialogs, oldest first; only the last one answers Escape. */
const openStack: symbol[] = [];

/**
 * What every modal shares: it takes focus (an element marked `data-autofocus` if there is one, else the panel),
 * keeps Tab inside, closes on Escape when it is the top one, and returns focus afterwards.
 */
export function useModalFocus(open: boolean, panel: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('dialog');
    openStack.push(id);
    const previous = document.activeElement as HTMLElement | null;
    (panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current)?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openStack[openStack.length - 1] !== id) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        e.preventDefault();
        panel.current.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel.current || !panel.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const at = openStack.indexOf(id);
      if (at >= 0) openStack.splice(at, 1);
      previous?.focus();
    };
  }, [open, panel]);
}

/** A modal that takes focus, closes on Escape or a backdrop click, and returns focus afterwards. */
export function Dialog({ open, title, onClose, children, actions, hideTitleOnPhone = false, actionsDesktopOnly = false }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(open, panel, onClose);

  if (!open) return null;
  // Portalled to the body so a header's or panel's stacking context cannot put the page's fixed bars over it.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-panel max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-panel-raised px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl outline-1 -outline-offset-1 outline-raised-line sm:max-h-[calc(100dvh-2rem)] sm:max-w-md sm:rounded-xl sm:p-5"
      >
        <div aria-hidden="true" className="sticky top-0 z-10 -mx-5 mb-1 bg-panel-raised pb-2 pt-2 sm:hidden">
          <div className="mx-auto h-1 w-9 rounded-full bg-muted/40" />
        </div>
        <h2 id={titleId} className={`text-lg font-semibold ${hideTitleOnPhone ? 'max-sm:sr-only' : ''}`}>
          {title}
        </h2>
        {children && <div className={`text-muted ${hideTitleOnPhone ? 'sm:mt-2' : 'mt-2'}`}>{children}</div>}
        {actions && <div className={`mt-5 flex flex-wrap justify-end gap-2 max-sm:[&>*]:flex-1 ${actionsDesktopOnly ? 'max-sm:hidden' : ''}`}>{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
