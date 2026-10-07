import { ChevronRight, type LucideIcon } from 'lucide-react';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { useShell } from '../shell/ShellPreference';
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
  /** On a desktop, what the popup's header shows; the title when left out. */
  heading?: { title: string; sub?: string };
}

/** The desktop draws the items as rows in bordered cards; the phone as a plain list. */
const DesktopContext = createContext(false);

/**
 * An overflow menu: an icon button that opens a list of actions. On a phone it is a sheet; on a desktop a popup
 * that grows out of the button, with a header and the actions in labelled cards, like the account menu.
 */
export function ActionSheet({ label, icon, title, triggerClassName = '', children, heading }: ActionSheetProps) {
  const { t } = useI18n();
  const { kind } = useShell();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const trigger = <IconButton label={label} icon={icon} className={triggerClassName} aria-haspopup="dialog" onClick={() => setOpen(true)} />;
  if (kind === 'desktop') {
    const head = heading ?? { title };
    return (
      <DesktopContext.Provider value>
        {trigger}
        <Dialog open={open} title={title} onClose={close} hideTitle animated>
          <div className="-mx-5 -mt-5 mb-4 border-b border-line px-5 py-4">
            <p className="truncate font-display text-lg font-bold">{head.title}</p>
            {head.sub && <p className="truncate text-sm text-muted">{head.sub}</p>}
          </div>
          <div className="flex flex-col gap-4 text-ink">{children(close)}</div>
        </Dialog>
      </DesktopContext.Provider>
    );
  }
  return (
    <>
      {trigger}
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

/** A group of items: on a desktop a card of rows under its label; on a phone the items just follow one another. */
export function ActionGroup({ label, children }: { label?: string; children: ReactNode }) {
  const desktop = useContext(DesktopContext);
  if (!desktop) return <>{children}</>;
  return (
    <section {...(label ? { 'aria-label': label } : {})}>
      {label && <h3 className="mb-2 text-sm font-semibold text-muted">{label}</h3>}
      <ul className="m-0 flex list-none flex-col divide-y divide-line overflow-hidden rounded-xl border border-line p-0">{children}</ul>
    </section>
  );
}

const ITEM = 'flex min-h-14 w-full items-center gap-3 rounded-lg px-1 py-2 text-start text-base hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus';

const DESKTOP_ITEM =
  'flex min-h-12 w-full items-center gap-3 px-3 text-start text-sm hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus';

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
  const desktop = useContext(DesktopContext);
  const row = desktop ? DESKTOP_ITEM : ITEM;
  const content = (
    <>
      {Icon && (
        <span aria-hidden="true" className={`flex shrink-0 items-center justify-center ${desktop ? 'size-8 rounded-lg' : 'size-9 rounded-xl'} ${CHIP[danger ? 'danger' : tone]}`}>
          <Icon size={desktop ? 16 : 19} />
        </span>
      )}
      <span className={`min-w-0 flex-1 ${desktop ? 'font-semibold' : ''}`}>{children}</span>
      <ChevronRight aria-hidden="true" size={desktop ? 16 : 18} className="shrink-0 text-muted rtl:rotate-180" />
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className={`${row} ${color}`} {...rest}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={`${row} ${color}`} {...rest}>
          {content}
        </button>
      )}
    </li>
  );
}
