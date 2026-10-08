import { Check, ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useShellKind } from '../shell/ShellPreference';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange(value: string): void;
  id?: string | undefined;
  /** The control's name when no visible label points at it. */
  label?: string | undefined;
  /** The id of a visible label; the list is named by it too. */
  labelledBy?: string | undefined;
  describedBy?: string | undefined;
  invalid?: boolean | undefined;
  /** sm for toolbars and table rows, md for compact form rows, lg for full form fields. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: 'min-h-9 text-sm font-semibold',
  md: 'min-h-10 text-base',
  lg: 'min-h-12 text-base',
};

const trigger = (size: keyof typeof SIZE, invalid: boolean | undefined) =>
  `inline-flex items-center gap-1.5 rounded-lg border bg-panel ps-3 pe-2 text-start text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${SIZE[size]} ${invalid ? 'border-danger' : 'border-line'}`;

/**
 * A dropdown in the app's own style: on a desktop, a button that opens a raised list with a tick on the chosen
 * option (the select-only combobox pattern: arrows, Home, End and typing move, Enter or Space picks, Escape closes).
 * On a phone it stays the browser's own picker, which suits touch, with the same button look.
 */
export function Select(props: SelectProps) {
  const kind = useShellKind();
  return kind === 'desktop' ? <MenuSelect {...props} /> : <NativeSelect {...props} />;
}

function NativeSelect({ value, options, onChange, id, label, labelledBy, describedBy, invalid, size = 'sm', className = '' }: SelectProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={`${trigger(size, invalid)} w-full min-w-0 appearance-none pe-8`}
      >
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

const MAX_HEIGHT = 288;
const EDGE = 8;
/** Before it is placed: fixed and hidden, so it takes its own width and can be measured. */
const MEASURING: CSSProperties = { position: 'fixed', left: 0, top: 0, visibility: 'hidden' };

function MenuSelect({ value, options, onChange, id, label, labelledBy, describedBy, invalid, size = 'sm', className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [style, setStyle] = useState<CSSProperties>(MEASURING);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const listId = useId();
  const chosen = options.findIndex((o) => o.value === value);
  const current = options[chosen];

  // Below the button, or above it when there is more room there; fixed, so no scroll area can clip it. It lines up
  // with the button's left edge, or with its right edge when it would run off the window (a button near the right).
  const place = useCallback(() => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const viewWidth = document.documentElement.clientWidth || window.innerWidth;
    const below = window.innerHeight - r.bottom - EDGE;
    const above = r.top - EDGE;
    const height = Math.min(MAX_HEIGHT, list.current?.scrollHeight ?? MAX_HEIGHT);
    const width = Math.max(r.width, list.current?.offsetWidth ?? 0);
    const up = below < height && above > below;
    const left = r.left + width > viewWidth - EDGE ? Math.max(EDGE, r.right - width) : r.left;
    setStyle({
      position: 'fixed',
      left,
      minWidth: r.width,
      ...(up ? { bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(MAX_HEIGHT, above) } : { top: r.bottom + 4, maxHeight: Math.min(MAX_HEIGHT, below) }),
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!button.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    const onMove = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) place();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, listId]);

  const show = (at: number) => {
    // Some browsers (Safari) do not focus a clicked button; the keys below need it.
    button.current?.focus();
    setActive(Math.max(0, Math.min(options.length - 1, at)));
    setStyle(MEASURING);
    setOpen(true);
  };
  const choose = (at: number) => {
    const option = options[at];
    setOpen(false);
    if (option && option.value !== value) onChange(option.value);
  };
  /** Jumps to the next option starting with what was typed in the last half second. */
  const seek = (char: string, from: number) => {
    const now = Date.now();
    typed.current = { text: now - typed.current.at < 500 ? typed.current.text + char : char, at: now };
    const text = typed.current.text.toLocaleLowerCase();
    const start = typed.current.text.length > 1 ? from : from + 1;
    for (let i = 0; i < options.length; i++) {
      const at = (start + i) % options.length;
      if (options[at]!.label.toLocaleLowerCase().startsWith(text)) return at;
    }
    return -1;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const printable = e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') show(chosen);
      else if (e.key === 'Home') show(0);
      else if (e.key === 'End') show(options.length - 1);
      else if (printable) {
        const at = seek(e.key, chosen);
        show(at >= 0 ? at : chosen);
      } else return;
      e.preventDefault();
      return;
    }
    if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1));
    else if (e.key === 'ArrowUp' && e.altKey) choose(active);
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(options.length - 1);
    else if (e.key === 'PageDown') setActive((a) => Math.min(options.length - 1, a + 10));
    else if (e.key === 'PageUp') setActive((a) => Math.max(0, a - 10));
    else if (e.key === 'Enter' || e.key === ' ') choose(active);
    else if (e.key === 'Escape') {
      // Close only the list, not a dialog or popover around it.
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
      return;
    } else if (printable) {
      const at = seek(e.key, active);
      if (at >= 0) setActive(at);
    } else return;
    e.preventDefault();
  };

  return (
    <>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : show(chosen))}
        onKeyDown={onKeyDown}
        className={`${trigger(size, invalid)} justify-between ${className}`}
      >
        <span className="truncate">{current?.label ?? ''}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-label={labelledBy ? undefined : label}
            aria-labelledby={labelledBy}
            style={style}
            className="z-[60] m-0 list-none overflow-auto rounded-xl border border-line bg-panel-raised p-1 shadow-xl"
          >
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={selected}
                  // Keep focus on the button, so dialogs and popovers around it stay open.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${i === active ? 'bg-surface' : ''} ${selected ? 'font-semibold text-brand-strong' : 'text-ink'}`}
                >
                  <span className="flex-1">{o.label}</span>
                  <Check aria-hidden="true" className={`size-4 shrink-0 ${selected ? '' : 'invisible'}`} />
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
