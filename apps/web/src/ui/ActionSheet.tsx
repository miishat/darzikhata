import { ChevronRight, type LucideIcon } from 'lucide-react';
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
  /** Extra classes for the opening button. */
  triggerClassName?: string;
  /** The items; call close() before opening something else so two sheets are never stacked. */
  children(close: () => void): ReactNode;
}

/** An overflow menu: an icon button that opens a sheet holding a list of actions. */
export function ActionSheet({ label, icon, title, triggerClassName = '', children }: ActionSheetProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <IconButton label={label} icon={icon} className={triggerClassName} aria-haspopup="dialog" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        title={title}
        hideTitleOnPhone
        actionsDesktopOnly
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

const ITEM = 'flex min-h-14 w-full items-center gap-3 rounded-lg px-1 py-2 text-start text-base hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus';

export type ActionTone = 'brand' | 'ok' | 'warn' | 'neutral';

const CHIP: Record<ActionTone | 'danger', string> = {
  brand: 'bg-brand-soft text-brand-strong',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn-ink',
  neutral: 'bg-surface text-muted',
  danger: 'bg-danger/10 text-danger',
};

/** One row of an ActionSheet: a link when it has `to`, otherwise a button. The icon sits in a tinted chip. */
export function ActionSheetItem({
  to,
  onClick,
  danger,
  icon: Icon,
  tone = 'brand',
  children,
  ...rest
}: {
  to?: string;
  onClick?(): void;
  danger?: boolean;
  icon?: LucideIcon;
  tone?: ActionTone;
  children: ReactNode;
  'data-tour'?: string;
}) {
  const color = danger ? 'text-danger' : 'text-ink';
  const content = (
    <>
      {Icon && (
        <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${CHIP[danger ? 'danger' : tone]}`}>
          <Icon size={19} />
        </span>
      )}
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted rtl:rotate-180" />
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className={`${ITEM} ${color}`} {...rest}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={`${ITEM} ${color}`} {...rest}>
          {content}
        </button>
      )}
    </li>
  );
}
