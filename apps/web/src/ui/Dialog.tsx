import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose(): void;
  children?: ReactNode;
  actions?: ReactNode;
}

/** A modal that takes focus, closes on Escape or a backdrop click, and returns focus afterwards. */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
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
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        className="w-full max-w-md rounded-xl bg-panel p-5 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-muted">{children}</div>}
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}
