// PROTOTYPE (throwaway): dropdown styles, switched with ?variant=. Never merged.
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { PrototypeSwitcher, useVariant } from './PrototypeSwitcher';

export const DROPDOWN_VARIANTS = {
  A: 'Current: the browser’s own dropdown',
  B: 'The browser’s list, but the button styled like the app: our chevron, bold text, a hover wash',
  C: 'Our own menu: the same button, and a rounded raised list with a tick on the chosen one',
  D: 'Labelled pills: "Group: By worker" in a rounded pill, and the menu shows icons and stage colours',
  E: 'Group by as a two-way switch like List and Board, stage as our own menu from C',
};

export function useDropdownVariant() {
  return useVariant(Object.keys(DROPDOWN_VARIANTS));
}

export function DropdownSwitcher() {
  return <PrototypeSwitcher variants={DROPDOWN_VARIANTS} />;
}

export interface DropOption {
  value: string;
  label: string;
  /** A colour dot class, e.g. a stage's tone. */
  dot?: string;
  icon?: LucideIcon;
}

export interface ProtoSelectProps {
  variant: string;
  label: string;
  value: string;
  options: DropOption[];
  onChange(value: string): void;
}

const TRIGGER =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line bg-panel ps-3 pe-2 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

export function ProtoSelect(props: ProtoSelectProps) {
  const { variant, label, value, options, onChange } = props;
  if (variant === 'B') {
    return (
      <span className="relative inline-flex">
        <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${TRIGGER} appearance-none pe-8`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-2 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </span>
    );
  }
  if (variant === 'E' && options.length === 2) {
    return (
      <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-surface p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-7 items-center gap-1.5 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-focus ${o.value === value ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {o.icon && <o.icon aria-hidden="true" className="size-4" />}
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  return <Menu {...props} pill={variant === 'D'} rich={variant === 'D'} />;
}

/** Our own listbox: a button that opens a raised list; arrows, Home and End move, Enter picks, Escape closes. */
function Menu({ label, value, options, onChange, pill, rich }: ProtoSelectProps & { pill: boolean; rich: boolean }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0]!;

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i]!.value);
    setOpen(false);
    trigger.current?.focus();
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(options.length - 1);
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') {
      setOpen(false);
      trigger.current?.focus();
    } else if (e.key === 'Tab') setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <div ref={wrap} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={`${label}: ${current.label}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            show();
          }
        }}
        className={pill ? `${TRIGGER} rounded-full! ps-3.5` : TRIGGER}
      >
        {pill && <span className="font-normal text-muted">{label}:</span>}
        {rich && current.dot && <span aria-hidden="true" className={`size-2 rounded-full ${current.dot}`} />}
        {rich && current.icon && <current.icon aria-hidden="true" className="size-4 text-muted" />}
        {current.label}
        <ChevronDown aria-hidden="true" className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${id}-${active}`}
          onKeyDown={onListKey}
          className="absolute start-0 top-full z-30 mt-1 max-h-72 min-w-full overflow-auto rounded-xl border border-line bg-panel-raised p-1 shadow-xl outline-none"
        >
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${i === active ? 'bg-surface' : ''} ${selected ? 'font-semibold text-brand-strong' : ''}`}
              >
                {rich && o.dot && <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${o.dot}`} />}
                {rich && o.icon && <o.icon aria-hidden="true" className="size-4 shrink-0 text-muted" />}
                <span className="flex-1">{o.label}</span>
                <Check aria-hidden="true" className={`size-4 shrink-0 ${selected ? '' : 'invisible'}`} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
