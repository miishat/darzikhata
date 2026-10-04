import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { SEED_SHOPS } from '../../seed/shops';
import { useShell } from '../../shell/ShellPreference';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { currentStep } from './progress';
import { SCENARIOS, type ScenarioId } from './scenarios';
import { usePresenterRun } from './usePresenterRun';

/** Phones keep clear of the tab bar and the New Order button, laptops sit in the corner. */
const PLACE = {
  mobile: 'bottom-36 right-3',
  desktop: 'bottom-4 right-4',
} as const;

/**
 * The presenter's floating guide. Stays mounted while the mode is on, so folding it away keeps the
 * scenario's place. A step whose target is not on the page still shows its text, just no outline.
 */
export function PresenterPanel() {
  const { t, label, number } = useI18n();
  const { kind } = useShell();
  const run = usePresenterRun();
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<ScenarioId | null>(null);

  // Folding or unfolding swaps the button under the pointer, so focus follows to the one that replaced it.
  const toggle = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) toggle.current?.focus();
    mounted.current = true;
  }, [open]);

  const place = PLACE[kind];
  if (!open) {
    return (
      <Button ref={toggle} variant="secondary" className={`fixed z-20 shadow-lg print:hidden ${place}`} onClick={() => setOpen(true)}>
        {t('presenter.expand')}
      </Button>
    );
  }

  const { scenario, progress } = run;
  const step = scenario && progress ? currentStep(scenario, progress) : null;
  const marked = progress ? Object.keys(progress.marks).length : 0;
  const pickedScenario = SCENARIOS.find((s) => s.id === picked);
  const pickedShop = pickedScenario ? SEED_SHOPS.find((s) => s.key === pickedScenario.shop) : undefined;

  return (
    <aside
      aria-label={t('presenter.title')}
      className={`fixed z-20 flex max-h-[60vh] w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-y-auto rounded-xl border border-line bg-panel-raised p-4 shadow-lg print:hidden ${place}`}
    >
      {step?.target && (
        <style data-presenter-highlight>{`[data-tour="${step.target}"]{outline:3px solid var(--color-accent);outline-offset:3px}`}</style>
      )}
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{scenario && progress ? t(scenario.title) : t('presenter.choose')}</h2>
        <Button ref={toggle} variant="secondary" onClick={() => setOpen(false)}>
          {t('presenter.collapse')}
        </Button>
      </div>
      {scenario && progress ? (
        <>
          <p aria-live="polite" className="text-sm text-muted">
            {t('presenter.step', { n: number(step ? marked + 1 : scenario.steps.length), total: number(scenario.steps.length) })}
          </p>
          <ol className="flex flex-col gap-1 text-sm">
            {scenario.steps.map((s) => {
              const mark = progress.marks[s.id];
              const isCurrent = step?.id === s.id;
              return (
                <li key={s.id} aria-current={isCurrent ? 'step' : undefined} className={isCurrent ? 'font-semibold' : undefined}>
                  {mark ? `${t(s.text)} ${t(mark === 'done' ? 'presenter.marked.done' : 'presenter.marked.skipped')}` : t(s.text)}
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            {step ? (
              <>
                <Button onClick={() => run.mark('done')}>{t('presenter.markDone')}</Button>
                <Button variant="secondary" onClick={() => run.mark('skipped')}>
                  {t('presenter.skip')}
                </Button>
              </>
            ) : (
              <p className="font-semibold">{t('presenter.finished')}</p>
            )}
            <Button variant="secondary" onClick={run.stop}>
              {t('presenter.stop')}
            </Button>
          </div>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {SCENARIOS.map((s) => (
            <li key={s.id}>
              <Button variant="secondary" className="w-full justify-start text-left" onClick={() => setPicked(s.id)}>
                {t(s.title)}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={pickedScenario !== undefined}
        title={pickedScenario ? t(pickedScenario.title) : ''}
        onClose={() => setPicked(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setPicked(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!picked) return;
                const id = picked;
                setPicked(null);
                await run.start(id);
              }}
            >
              {t('presenter.start')}
            </Button>
          </>
        }
      >
        {t('presenter.startConfirm', { shop: pickedShop ? label(pickedShop.name) : '' })}
      </Dialog>
    </aside>
  );
}
