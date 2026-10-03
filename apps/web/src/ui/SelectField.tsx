import { useId } from 'react';

export interface SelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange(value: string): void;
  error?: string | undefined;
  id?: string | undefined;
  className?: string;
}

export function SelectField({ label, value, options, onChange, error, id, className = '' }: SelectFieldProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const messageId = `${selectId}-message`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={selectId} className="text-sm font-semibold">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        className={`min-h-12 rounded-lg border bg-panel px-3 py-2 text-base focus-visible:outline-2 focus-visible:outline-brand ${error ? 'border-danger' : 'border-line'}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={messageId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
