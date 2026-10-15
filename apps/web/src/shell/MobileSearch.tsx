import { can, type Role } from '@darzikhata/domain';
import { ArrowLeft, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useModalFocus } from '../ui/Dialog';
import { GlobalSearch } from './GlobalSearch';

/** The phone header's search button and the full-screen search it opens: orders by number, customers by name or phone. */
export function MobileSearch({ role }: { role: Role }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!can(role, 'orders.view') && !can(role, 'customers.view')) return null;
  return (
    <>
      <button
        type="button"
        aria-label={t('search.label')}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink focus-visible:outline-2 focus-visible:outline-focus"
      >
        <Search aria-hidden="true" size={22} />
      </button>
      {open && <SearchSheet role={role} onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchSheet({ role, onClose }: { role: Role; onClose(): void }) {
  const { t } = useI18n();
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useModalFocus(true, panel, onClose);

  return createPortal(
    <div ref={panel} role="dialog" aria-modal="true" aria-label={t('search.label')} tabIndex={-1} className="fixed inset-0 z-30 flex flex-col bg-panel outline-none">
      <div className="flex h-16 items-center gap-2 border-b border-line px-2">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted focus-visible:outline-2 focus-visible:outline-focus"
        >
          <ArrowLeft aria-hidden="true" size={22} className="rtl:rotate-180" />
        </button>
        <GlobalSearch role={role} inputRef={input} sheet onPick={onClose} />
      </div>
    </div>,
    document.body,
  );
}
