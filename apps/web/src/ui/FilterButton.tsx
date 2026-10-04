import { Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface FilterButtonProps {
  label: string;
  children: ReactNode;
}

/** A dashed "add filter" button that opens a small, non-modal popover holding the filter's options. */
export function FilterButton({ label, children }: FilterButtonProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div
      ref={wrap}
      className="relative inline-block"
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-line px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <Plus aria-hidden="true" size={16} />
        {label}
      </button>
      {open && (
        <div
          id={popId}
          role="group"
          tabIndex={-1}
          aria-label={t('desk.filter.options', { label })}
          className="absolute left-0 top-full z-30 mt-1 flex min-w-48 flex-col gap-1 rounded-xl border border-line bg-panel p-2 shadow-xl outline-none"
        >
          {children}
        </div>
      )}
    </div>
  );
}
