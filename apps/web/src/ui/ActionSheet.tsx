import type { LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { IconButton } from './IconButton';

export interface ActionSheetProps {
  /** Accessible name of the button that opens the sheet. */
  label: string;
  icon: LucideIcon;
  title: string;
  /** The items; call close() before opening something else so two sheets are never stacked. */
  children(close: () => void): ReactNode;
}

/** An overflow menu: an icon button that opens a sheet holding a list of actions. */
export function ActionSheet({ label, icon, title, children }: ActionSheetProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <IconButton label={label} icon={icon} aria-haspopup="dialog" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        title={title}
        onClose={close}
        actions={
          <Button variant="secondary" onClick={close}>
            {t('common.close')}
          </Button>
        }
      >
        <ul className="m-0 flex list-none flex-col p-0 text-ink">{children(close)}</ul>
      </Dialog>
    </>
  );
}

const ITEM = 'flex min-h-11 w-full items-center rounded-lg px-2 py-2 text-start text-base hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus';

/** One row of an ActionSheet: a link when it has `to`, otherwise a button. */
export function ActionSheetItem({
  to,
  onClick,
  danger,
  children,
  ...rest
}: {
  to?: string;
  onClick?(): void;
  danger?: boolean;
  children: ReactNode;
  'data-tour'?: string;
}) {
  const tone = danger ? 'text-danger' : 'text-ink';
  return (
    <li>
      {to ? (
        <Link to={to} className={`${ITEM} ${tone}`} {...rest}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={`${ITEM} ${tone}`} {...rest}>
          {children}
        </button>
      )}
    </li>
  );
}
