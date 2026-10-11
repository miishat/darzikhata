import { Check, ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';

/** A settings-style group for a phone form: full-bleed rows with hairlines between them. */
export function FormGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-line border-y border-line bg-panel">{children}</div>;
}

const CONTROL = 'min-w-0 flex-1 bg-transparent py-3 text-base outline-none';

/**
 * One row of a FormGroup: the label on the left, the control on the right, and a problem under the control.
 * `children` receives the props that tie the control to its label and message.
 */
export function FormRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children(props: { id: string; className: string; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined }): ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div>
      <div className="flex min-h-14 items-center gap-3 px-4">
        <label htmlFor={id} className="w-24 shrink-0 text-sm text-muted">
          {label}
        </label>
        {children({ id, className: CONTROL, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? messageId : undefined })}
      </div>
      {error && (
        <p id={messageId} className="px-4 pb-2 ps-[7.75rem] text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** A row's value with a chevron; tapping opens a bottom sheet listing the options, with a tick on the chosen one. */
export function RowSelect({
  id,
  label,
  value,
  options,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange(value: string): void;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <>
      <button type="button" id={id} aria-haspopup="listbox" onClick={() => setOpen(true)} className={`${className} flex items-center justify-end gap-1.5 text-end`}>
        <span className="truncate">{current}</span>
        <ChevronDown aria-hidden="true" size={16} className="shrink-0 text-muted" />
      </button>
      <Dialog open={open} title={label} hideTitle onClose={() => setOpen(false)}>
        <ul role="listbox" aria-label={label} className="m-0 flex list-none flex-col p-0">
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg px-1 text-start text-base hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="min-w-0 flex-1">{o.label}</span>
                {o.value === value && <Check aria-hidden="true" size={20} className="text-brand-strong" />}
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
