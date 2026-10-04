import type { PresenterContext, Scenario, ScenarioId, ScenarioStep } from './scenarios';

export type StepMark = 'done' | 'skipped';

/** How far the presenter is through one scenario. Steps are marked in order. */
export interface Progress {
  scenarioId: ScenarioId;
  marks: Record<string, StepMark>;
}

export function startProgress(scenarioId: ScenarioId): Progress {
  return { scenarioId, marks: {} };
}

/** The first step not yet marked, or null when the scenario is finished. */
export function currentStep(scenario: Scenario, progress: Progress): ScenarioStep | null {
  return scenario.steps.find((step) => !progress.marks[step.id]) ?? null;
}

/**
 * Ticks off the current step while its check holds, then the next, and so on. Only the current
 * step is checked, so a later step never counts before the ones ahead of it, and a step stays
 * done even if its condition stops holding (going back online after the "go offline" step).
 */
export function advance(scenario: Scenario, progress: Progress, ctx: PresenterContext): Progress {
  let next = progress;
  for (let step = currentStep(scenario, next); step?.done?.(ctx); step = currentStep(scenario, next)) {
    next = { ...next, marks: { ...next.marks, [step.id]: 'done' } };
  }
  return next;
}

/** Marks the current step by hand: done for steps the app cannot see, or skipped. */
export function markCurrent(scenario: Scenario, progress: Progress, mark: StepMark): Progress {
  const step = currentStep(scenario, progress);
  return step ? { ...progress, marks: { ...progress.marks, [step.id]: mark } } : progress;
}
