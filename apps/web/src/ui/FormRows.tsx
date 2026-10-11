import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';

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

/** The browser's own picker, drawn as a row's value with a chevron. */
export function RowSelect({
  id,
  value,
  options,
  onChange,
  className,
}: {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange(value: string): void;
  className: string;
}) {
  return (
    <span className="relative flex min-w-0 flex-1">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${className} w-full appearance-none pe-6 text-end`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-0 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}
