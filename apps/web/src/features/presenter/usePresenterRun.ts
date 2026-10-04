import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { advance, markCurrent, startProgress, type Progress, type StepMark } from './progress';
import { scenarioById, type PresenterContext, type Scenario, type ScenarioId } from './scenarios';

interface Run {
  progress: Progress;
  start: PresenterContext['start'];
}

export interface PresenterRun {
  scenario: Scenario | null;
  progress: Progress | null;
  /** Resets the scenario's shop, signed in as its owner, and starts at its first step. */
  start(id: ScenarioId): Promise<void>;
  /** Marks the current step done or skipped by hand. */
  mark(mark: StepMark): void;
  stop(): void;
}

/**
 * Runs one scenario at a time and ticks its steps off as the app changes. Keep it in a component
 * that stays mounted while presenter mode is on, so folding the panel away keeps the place.
 */
export function usePresenterRun(): PresenterRun {
  const store = useStore();
  const snapshot = useSnapshot();
  const location = useLocation();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const scenario = run ? scenarioById(run.progress.scenarioId) : null;
  const path = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!run || !scenario || !snapshot.config) return;
    const ctx: PresenterContext = {
      path,
      state: snapshot.state,
      config: snapshot.config,
      staffId: snapshot.session?.staffId ?? null,
      sync: snapshot.sync,
      start: run.start,
    };
    const next = advance(scenario, run.progress, ctx);
    if (next !== run.progress) setRun({ ...run, progress: next });
  }, [run, scenario, path, snapshot]);

  return {
    scenario,
    progress: run?.progress ?? null,
    async start(id) {
      await store.startDemo(scenarioById(id).shop);
      const fresh = store.getSnapshot();
      if (!fresh.config) return;
      setRun({
        progress: startProgress(id),
        start: { state: fresh.state, config: fresh.config, reviewIds: fresh.sync.review.map((r) => r.event.id) },
      });
      navigate('/app');
    },
    mark(mark) {
      if (run && scenario) setRun({ ...run, progress: markCurrent(scenario, run.progress, mark) });
    },
    stop() {
      setRun(null);
    },
  };
}
