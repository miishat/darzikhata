import { X } from 'lucide-react';
import { useId, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { useModalFocus } from './Dialog';

/** Matches the drawer-out animation in index.css. */
const LEAVE_MS = 180;

export interface DrawerHandle {
  /** Slides the drawer out, then runs `then` (which usually unmounts it). If it is still open afterwards, it slides back in. */
  close(then: () => void): void;
}

export interface DrawerProps {
  title: string;
  /** Escape, the dimmed page and the X call this. Close through the handle to slide out first. */
  onClose(): void;
  children: ReactNode;
  /** The buttons along the bottom, usually Cancel and Save. */
  footer?: ReactNode;
  ref?: Ref<DrawerHandle>;
}

const animates = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

/**
 * A desktop editing panel that slides in from the right while the page dims, and slides out again when
 * closed through its handle. Modal, like Dialog. Without motion (reduced motion, tests) it opens and closes at once.
 */
export function Drawer({ title, onClose, children, footer, ref }: DrawerProps) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  useModalFocus(true, panel, onClose);

  useImperativeHandle(ref, () => ({
    close(then) {
      if (busy.current) return;
      if (!animates()) {
        then();
        return;
      }
      busy.current = true;
      setLeaving(true);
      window.setTimeout(() => {
        then();
        busy.current = false;
        setLeaving(false);
      }, LEAVE_MS);
    },
  }));

  return createPortal(
    <div
      data-leaving={leaving || undefined}
      className={`drawer-scrim fixed inset-0 z-50 flex justify-end bg-scrim ${leaving ? 'pointer-events-none' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="drawer-panel flex h-full w-[640px] max-w-full flex-col bg-panel shadow-2xl outline-none"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="min-w-0 flex-1 truncate font-display text-xl font-bold">
            {title}
          </h2>
          <Button variant="ghost" aria-label={t('common.close')} onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </Button>
        </div>
        {/* `relative` keeps screen-reader-only text inside the scrolling area. */}
        <div className="relative min-h-0 flex-1 overflow-auto p-5">{children}</div>
        {footer && <div className="flex gap-3 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
