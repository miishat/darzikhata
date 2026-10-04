import { useId, type TextareaHTMLAttributes } from 'react';

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}

export function TextAreaField({ label, error, hint, id, className = '', rows = 3, ...textarea }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const messageId = `${fieldId}-message`;
  const message = error ?? hint;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={fieldId} className="text-sm font-semibold">
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`min-h-12 rounded-lg border bg-panel px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-focus ${error ? 'border-danger' : 'border-line'}`}
        {...textarea}
      />
      {message && (
        <p id={messageId} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
