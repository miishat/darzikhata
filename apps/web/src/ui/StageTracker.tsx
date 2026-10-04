import { Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export interface TrackerStage {
  key: string;
  /** Already translated. */
  label: string;
  /** An optional stage that was passed over. */
  skipped?: boolean | undefined;
}

export interface StageTrackerProps {
  stages: TrackerStage[];
  currentKey: string;
}

const MAX_STEPS = 6;

type State = 'done' | 'skipped' | 'current' | 'upcoming';
type Step = { kind: 'stage'; stage: TrackerStage; state: State } | { kind: 'more'; hidden: number };

function buildSteps(stages: TrackerStage[], currentKey: string): Step[] {
  const currentIndex = stages.findIndex((s) => s.key === currentKey);
  const stateOf = (stage: TrackerStage, index: number): State => {
    if (index === currentIndex) return 'current';
    if (currentIndex >= 0 && index < currentIndex) return stage.skipped ? 'skipped' : 'done';
    return 'upcoming';
  };
  const all = stages.map((stage, index): Step => ({ kind: 'stage', stage, state: stateOf(stage, index) }));
  if (stages.length <= MAX_STEPS) return all;
  // Collapse earlier steps into one "+n" step, with the current step first among those shown.
  const start = Math.min(stages.length - (MAX_STEPS - 1), Math.max(currentIndex, 0));
  if (start <= 0) return all.slice(0, MAX_STEPS);
  return [{ kind: 'more', hidden: start }, ...all.slice(start, start + MAX_STEPS - 1)];
}

const DOT: Record<State | 'more', string> = {
  done: 'bg-brand text-on-brand',
  skipped: 'border-2 border-dashed border-muted bg-panel',
  current: 'border-2 border-brand bg-panel ring-4 ring-brand-soft',
  upcoming: 'border-2 border-line bg-panel',
  more: 'bg-surface text-xs font-semibold text-muted',
};

/** Order progress as a row of steps. */
export function StageTracker({ stages, currentKey }: StageTrackerProps) {
  const { t, number } = useI18n();
  const steps = buildSteps(stages, currentKey);
  return (
    <ol
      aria-label={t('ui.stages')}
      className="m-0 grid list-none p-0"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const state = step.kind === 'more' ? 'more' : step.state;
        return (
          <li
            key={step.kind === 'more' ? 'more' : step.stage.key}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex flex-col items-center gap-1.5"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute top-[11px] right-1/2 h-0.5 w-full ${state === 'upcoming' ? 'bg-line' : 'bg-brand'}`}
              />
            )}
            <span className={`relative z-10 flex size-[22px] items-center justify-center rounded-full ${DOT[state]}`}>
              {state === 'done' && <Check aria-hidden="true" size={14} strokeWidth={3} />}
              {step.kind === 'more' && <span aria-hidden="true">{`+${number(step.hidden)}`}</span>}
            </span>
            <span
              className={`text-center text-xs ${state === 'current' ? 'font-semibold text-ink' : state === 'upcoming' ? 'text-muted' : 'text-ink'}`}
            >
              {step.kind === 'more' ? (
                <span className="sr-only">{t('ui.stageEarlier', { n: number(step.hidden) })}</span>
              ) : (
                <>
                  {step.stage.label}
                  {step.state === 'skipped' && <span className="sr-only">{` ${t('ui.stageSkipped')}`}</span>}
                  {step.state === 'done' && <span className="sr-only">{` ${t('ui.stageDone')}`}</span>}
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
