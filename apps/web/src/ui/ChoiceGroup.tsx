import { useId } from 'react';

export interface ChoiceGroupProps<T extends string> {
  legend: string;
  value: T | null;
  options: Array<{ value: NoInfer<T>; label: string }>;
  onChange(value: NoInfer<T>): void;
  error?: string | undefined;
}

/** A named group of radio buttons drawn as chips. */
export function ChoiceGroup<T extends string>({ legend, value, options, onChange, error }: ChoiceGroupProps<T>) {
  const name = useId();
  const messageId = `${name}-message`;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? messageId : undefined}>
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
              value === option.value ? 'border-brand bg-brand-soft text-brand-strong' : error ? 'border-danger bg-panel' : 'border-line bg-panel'
            }`}
          >
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={messageId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
