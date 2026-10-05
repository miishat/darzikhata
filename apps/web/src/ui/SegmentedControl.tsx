export interface SegmentedControlProps<T extends string> {
  legend: string;
  value: T;
  options: Array<{ value: NoInfer<T>; label: string }>;
  onChange(value: NoInfer<T>): void;
}

/** A named group of mutually exclusive choices drawn as one rounded track with a raised active segment. */
export function SegmentedControl<T extends string>({ legend, value, options, onChange }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={legend} className="flex rounded-xl bg-line/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 flex-1 rounded-lg px-2 text-sm focus-visible:outline-2 focus-visible:outline-focus ${value === o.value ? 'bg-panel font-semibold text-brand-strong shadow-sm' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
