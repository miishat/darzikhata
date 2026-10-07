import { ChevronRight, type LucideIcon } from 'lucide-react';
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { useShell } from '../shell/ShellPreference';
import { Button } from './Button';
import { Dialog, useModalFocus } from './Dialog';
import { IconButton } from './IconButton';
import { PrototypeSwitcher, useVariant } from './PrototypeSwitcher';

// PROTOTYPE (throwaway): desktop looks for the overflow menus, switched with ?variant=.
export const MORE_VARIANTS = {
  A: 'Current: the phone sheet in a centred box',
  B: 'Popup like the account menu: header, labelled groups, papers as three tiles',
  C: 'Dropdown under the button: compact rows, plain icons, a line between groups',
  D: 'Popup like the account menu: labelled groups of rows in bordered cards',
  E: 'Dropdown under the button: a header, group labels and tinted icons',
};
type Mode = 'sheet' | 'tiles' | 'plain' | 'cards' | 'chips';
const MODE: Record<string, Mode> = { A: 'sheet', B: 'tiles', C: 'plain', D: 'cards', E: 'chips' };
const ModeContext = createContext<Mode>('sheet');
const GroupContext = createContext<{ cols: number }>({ cols: 1 });

export function MoreSwitcher() {
  const { kind } = useShell();
  return kind === 'desktop' ? <PrototypeSwitcher variants={MORE_VARIANTS} /> : null;
}

function useMode(): Mode {
  const { kind } = useShell();
  const v = useVariant(Object.keys(MORE_VARIANTS));
  return kind === 'desktop' ? MODE[v]! : 'sheet';
}

/** A labelled group of items. On the phone sheet the items simply follow one another. */
export function ActionGroup({ label, cols = 1, children }: { label: string; cols?: number; children: ReactNode }) {
  const mode = useContext(ModeContext);
  if (mode === 'sheet') return <>{children}</>;
  const list =
    mode === 'tiles'
      ? `grid gap-2 ${cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`
      : mode === 'cards'
        ? 'flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line'
        : 'flex flex-col';
  const head =
    mode === 'plain'
      ? 'sr-only'
      : mode === 'chips'
        ? 'px-3 pb-1 pt-2 text-xs font-semibold text-muted'
        : 'mb-2 text-sm font-semibold text-muted';
  return (
    <GroupContext.Provider value={{ cols }}>
      <section aria-label={label} className={mode === 'plain' ? 'border-t border-line py-1 first:border-t-0' : mode === 'chips' ? 'py-1' : ''}>
        <h3 className={head}>{label}</h3>
        <ul className={`m-0 list-none p-0 ${list}`}>{children}</ul>
      </section>
    </GroupContext.Provider>
  );
}

/** The dropdown: sits under the button that opened it, right edges lined up, with no dimming behind it. */
function Dropdown({ anchor, title, onClose, children }: { anchor: HTMLElement | null; title: string; onClose(): void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  useModalFocus(true, panel, onClose);
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setAt({ top: r.bottom + 6, right: window.innerWidth - r.right });
  }, [anchor]);
  return createPortal(
    <div className="fixed inset-0 z-50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={at ? { top: at.top, right: at.right } : { visibility: 'hidden' }}
        className="fixed w-72 overflow-hidden rounded-xl border border-line bg-panel-raised py-1 shadow-xl outline-none"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export interface ActionSheetProps {
  /** Accessible name of the button that opens the sheet. */
  label: string;
  icon: LucideIcon;
  title: string;
  /** Extra classes for the opening button. */
  triggerClassName?: string;
  /** The items; call close() before opening something else so two sheets are never stacked. */
  children(close: () => void): ReactNode;
  /** PROTOTYPE: what the desktop popups show at the top. */
  heading?: { title: string; sub?: string };
}

/** An overflow menu: an icon button that opens a sheet holding a list of actions. */
export function ActionSheet({ label, icon, title, triggerClassName = '', children, heading }: ActionSheetProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setOpen(false);
  const mode = useMode();
  const head = heading ?? { title };
  const trigger = (
    <IconButton
      label={label}
      icon={icon}
      className={`${triggerClassName} ${open && (mode === 'plain' || mode === 'chips') ? 'bg-surface' : ''}`}
      aria-haspopup="dialog"
      aria-expanded={mode === 'sheet' ? undefined : open}
      onClick={(e) => {
        setAnchor(e.currentTarget);
        setOpen(true);
      }}
    />
  );
  if (mode === 'plain' || mode === 'chips')
    return (
      <ModeContext.Provider value={mode}>
        {trigger}
        {open && (
          <Dropdown anchor={anchor} title={title} onClose={close}>
            {mode === 'chips' && (
              <div className="border-b border-line px-4 pb-2.5 pt-2">
                <p className="truncate font-display font-bold">{head.title}</p>
                {head.sub && <p className="truncate text-xs text-muted">{head.sub}</p>}
              </div>
            )}
            {children(close)}
          </Dropdown>
        )}
      </ModeContext.Provider>
    );
  if (mode === 'tiles' || mode === 'cards')
    return (
      <ModeContext.Provider value={mode}>
        {trigger}
        <Dialog open={open} title={title} onClose={close} hideTitle animated>
          <div className="-mx-5 -mt-5 mb-4 border-b border-line px-5 py-4">
            <p className="truncate font-display text-lg font-bold">{head.title}</p>
            {head.sub && <p className="truncate text-sm text-muted">{head.sub}</p>}
          </div>
          <div className="flex flex-col gap-4 text-ink">{children(close)}</div>
        </Dialog>
      </ModeContext.Provider>
    );
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
  const mode = useContext(ModeContext);
  const { cols } = useContext(GroupContext);
  if (mode !== 'sheet') {
    const chip = (size: string, icon: number) =>
      Icon && (
        <span aria-hidden="true" className={`flex ${size} shrink-0 items-center justify-center rounded-lg ${CHIP[danger ? 'danger' : tone]}`}>
          <Icon size={icon} />
        </span>
      );
    let cls = '';
    let body: ReactNode = null;
    if (mode === 'tiles' && cols === 3) {
      cls = `flex h-full w-full flex-col items-center gap-2 rounded-xl border border-line px-2 py-3 text-center text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus ${color}`;
      body = (
        <>
          {chip('size-10', 20)}
          <span>{children}</span>
        </>
      );
    } else if (mode === 'tiles') {
      cls = `flex min-h-11 w-full items-center gap-2.5 rounded-lg border px-3 text-start text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus ${danger ? 'border-danger/40 text-danger' : 'border-line text-ink'}`;
      body = (
        <>
          {Icon && <Icon size={16} aria-hidden="true" />}
          <span className="min-w-0 flex-1">{children}</span>
        </>
      );
    } else if (mode === 'cards') {
      cls = `flex min-h-12 w-full items-center gap-3 px-3 text-start text-sm hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${color}`;
      body = (
        <>
          {chip('size-8', 16)}
          <span className="min-w-0 flex-1 font-semibold">{children}</span>
          <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-muted rtl:rotate-180" />
        </>
      );
    } else if (mode === 'plain') {
      cls = `flex min-h-10 w-full items-center gap-3 px-4 text-start text-sm hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${color}`;
      body = (
        <>
          {Icon && <Icon size={16} aria-hidden="true" className={danger ? '' : 'text-muted'} />}
          <span className="min-w-0 flex-1">{children}</span>
        </>
      );
    } else {
      cls = `flex min-h-11 w-full items-center gap-3 px-3 text-start text-sm hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${color}`;
      body = (
        <>
          {chip('size-7', 15)}
          <span className="min-w-0 flex-1 font-semibold">{children}</span>
        </>
      );
    }
    return (
      <li>
        {to ? (
          <Link to={to} className={cls} {...rest}>
            {body}
          </Link>
        ) : (
          <button type="button" onClick={onClick} className={cls} {...rest}>
            {body}
          </button>
        )}
      </li>
    );
  }
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
