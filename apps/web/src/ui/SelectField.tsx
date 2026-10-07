import { useId } from 'react';
import { Select } from './Select';

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
  const labelId = `${selectId}-label`;
  const messageId = `${selectId}-message`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label id={labelId} htmlFor={selectId} className="text-sm font-semibold">
        {label}
      </label>
      <Select
        id={selectId}
        size="lg"
        value={value}
        options={options}
        onChange={onChange}
        labelledBy={labelId}
        invalid={Boolean(error)}
        describedBy={error ? messageId : undefined}
        className="w-full"
      />
      {error && (
        <p id={messageId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
