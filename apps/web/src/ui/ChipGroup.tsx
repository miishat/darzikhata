export interface ChipOption {
  value: string;
  label: string;
  count?: string | number | undefined;
}

export interface ChipGroupProps {
  /** Accessible name of the group. */
  label: string;
  options: ChipOption[];
  value: string;
  onChange(value: string): void;
}

/** A row of filter chips that scrolls sideways. Each chip is a toggle button. */
export function ChipGroup({ label, options, value, onChange }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              selected ? 'border-navy bg-navy text-on-brand' : 'border-line bg-panel text-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className={selected ? 'text-on-navy-muted' : 'text-muted'}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
