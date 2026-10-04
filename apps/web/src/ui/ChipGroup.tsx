import type { ReactNode } from 'react';

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
  /** Extra content after the chips, scrolling with them (such as an add button). */
  trailing?: ReactNode;
  /** Share the row's width equally between the chips; they still scroll when they do not fit. */
  fill?: boolean;
}

/** A row of filter chips that scrolls sideways. Each chip is a toggle button. */
export function ChipGroup({ label, options, value, onChange, trailing, fill = false }: ChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 -my-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex min-h-11 min-w-11 shrink-0 ${fill ? 'flex-1' : ''} items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              selected ? 'border-chip-selected bg-chip-selected text-on-chip-selected' : 'border-line bg-panel text-ink'
            }`}
          >
            {option.label}
            {option.count !== undefined && <span className={selected ? 'text-on-chip-selected-muted' : 'text-muted'}>{option.count}</span>}
          </button>
        );
      })}
      {trailing}
    </div>
  );
}
