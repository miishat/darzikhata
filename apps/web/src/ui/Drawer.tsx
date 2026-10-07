import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { useModalFocus } from './Dialog';

export interface DrawerProps {
  title: string;
  onClose(): void;
  children: ReactNode;
  /** The buttons along the bottom, usually Cancel and Save. */
  footer?: ReactNode;
}

/** A desktop editing panel that slides in from the right, over a dimmed page. Modal, like Dialog. */
export function Drawer({ title, onClose, children, footer }: DrawerProps) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(true, panel, onClose);
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-full w-[640px] max-w-full flex-col bg-panel shadow-2xl outline-none"
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
