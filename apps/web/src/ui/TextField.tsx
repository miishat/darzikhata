import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  /** Shown inside the field on the right, e.g. a unit such as "ইঞ্চি". */
  suffix?: ReactNode;
}

export function TextField({ label, error, hint, suffix, id, className = '', ...input }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-lg border bg-panel focus-within:outline-2 focus-within:outline-brand ${error ? 'border-danger' : 'border-line'}`}
      >
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none"
          {...input}
        />
        {suffix && <span className="pr-3 text-sm text-muted">{suffix}</span>}
      </div>
      {message && (
        <p id={messageId} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
