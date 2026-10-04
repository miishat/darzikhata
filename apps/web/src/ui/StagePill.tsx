import type { Tone } from './stageTone';

// Full literal class names so Tailwind can see them.
const TONES: Record<Tone, { pill: string; dot: string }> = {
  booked: { pill: 'bg-tone-booked-bg text-tone-booked-fg', dot: 'bg-tone-booked-dot' },
  cutting: { pill: 'bg-tone-cutting-bg text-tone-cutting-fg', dot: 'bg-tone-cutting-dot' },
  working: { pill: 'bg-tone-working-bg text-tone-working-fg', dot: 'bg-tone-working-dot' },
  trial: { pill: 'bg-tone-trial-bg text-tone-trial-fg', dot: 'bg-tone-trial-dot' },
  ready: { pill: 'bg-tone-ready-bg text-tone-ready-fg', dot: 'bg-tone-ready-dot' },
  done: { pill: 'bg-tone-done-bg text-tone-done-fg', dot: 'bg-tone-done-dot' },
  cancelled: { pill: 'bg-tone-cancelled-bg text-tone-cancelled-fg', dot: 'bg-tone-cancelled-dot' },
};

/** A garment stage as a coloured pill with a dot. */
export function StagePill({ label, tone }: { label: string; tone: Tone }) {
  const classes = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${classes.pill}`}>
      <span aria-hidden="true" className={`size-[7px] rounded-full ${classes.dot}`} />
      {label}
    </span>
  );
}
