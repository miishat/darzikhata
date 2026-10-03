import { useId } from 'react';

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  error?: string | undefined;
}

export function Checkbox({ label, checked, onChange, error }: CheckboxProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-10 cursor-pointer items-center gap-3 text-base">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          className="size-5 accent-brand"
        />
        {label}
      </label>
      {error && (
        <p id={messageId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
