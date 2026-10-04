import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { ChipGroup } from '../../ui/ChipGroup';
import { SelectField } from '../../ui/SelectField';
import { DRAFT_STEPS, errorsForStep, type DraftErrors, type DraftStep } from './draft';
import { CustomerPicker } from './entry/CustomerPicker';
import { DraftSummary } from './entry/DraftSummary';
import { ItemDetails } from './entry/ItemDetails';
import { ItemHeader } from './entry/ItemHeader';
import { ItemMeasurements } from './entry/ItemMeasurements';
import { ItemMoney, MoneyFields } from './entry/MoneyFields';
import { useErrorText, useItemTitle } from './entry/shared';
import type { OrderEntry } from './useOrderEntry';

const STEP_TITLES = {
  customer: 'entry.step.customer',
  garments: 'entry.step.garments',
  details: 'entry.step.details',
  money: 'entry.step.money',
  review: 'entry.step.review',
} as const;

interface Props {
  entry: OrderEntry;
  /** Called with the new order's id once it is saved. */
  onSaved(orderId: string): void;
}

/** Order entry one step at a time, for a phone. */
export function MobileOrderSteps({ entry, onSaved }: Props) {
  const { t, number } = useI18n();
  const [step, setStep] = useState<DraftStep>('customer');
  const [showErrors, setShowErrors] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);
  const [keypadSpace, setKeypadSpace] = useState(0);
  const onKeypadSpace = useCallback((h: number) => setKeypadSpace(h), []);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  const index = DRAFT_STEPS.indexOf(step);
  const errors = showErrors ? errorsForStep(entry.errors, step) : {};
  const hasErrors = Object.keys(errors).length > 0;
  const stepText = t('entry.stepOf', { n: number(index + 1), total: number(DRAFT_STEPS.length) });

  useEffect(() => {
    if (focusTick === 0) return;
    body.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusTick]);

  // Starting over replaces these steps, so the button that was pressed is gone: land on the step heading.
  useEffect(() => {
    if (entry.generation > 0) heading.current?.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [step]);

  const goTo = (target: DraftStep) => {
    moved.current = true;
    setShowErrors(false);
    setProblem(null);
    setStep(target);
  };

  const next = () => {
    if (Object.keys(errorsForStep(entry.errors, step)).length > 0) {
      setShowErrors(true);
      setFocusTick((n) => n + 1);
      return;
    }
    goTo(DRAFT_STEPS[index + 1]!);
  };

  const save = async () => {
    setProblem(null);
    const result = await entry.save();
    if (result.ok) {
      onSaved(result.orderId);
      return;
    }
    if (result.problem) {
      setProblem(result.problem);
      return;
    }
    const failing = DRAFT_STEPS.find((s) => s !== 'review' && Object.keys(errorsForStep(entry.errors, s)).length > 0);
    if (failing) {
      setStep(failing);
      setShowErrors(true);
      setFocusTick((n) => n + 1);
      return;
    }
    setProblem(t('entry.saveFailed'));
  };

  return (
    <div className="flex flex-col gap-4" ref={body}>
      <h1 className="text-xl font-semibold">{t('nav.newOrder')}</h1>
      {entry.restored && step === 'customer' && (
        <p role="status" className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
          {t('entry.draftRestored')}
          <Button variant="ghost" className="min-h-11" onClick={entry.discard}>
            {t('entry.startFresh')}
          </Button>
        </p>
      )}
      <div
        role="progressbar"
        aria-label={stepText}
        aria-valuemin={1}
        aria-valuemax={DRAFT_STEPS.length}
        aria-valuenow={index + 1}
        aria-valuetext={stepText}
        className="grid grid-cols-5 gap-1"
      >
        {DRAFT_STEPS.map((s, i) => (
          <span key={s} aria-hidden="true" className={`h-1 rounded-sm ${i <= index ? 'bg-brand' : 'bg-line'}`} />
        ))}
      </div>
      <p className="text-sm text-muted">{stepText}</p>
      <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">
        {t(STEP_TITLES[step])}
      </h2>
      {hasErrors && (
        <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-danger">
          {t('entry.fixErrors')}
        </p>
      )}

      {step === 'customer' && <CustomerPicker entry={entry} errors={errors} />}
      {step === 'garments' && <GarmentsStep entry={entry} errors={errors} onDone={next} onKeypadSpace={onKeypadSpace} />}
      {step === 'details' && <DetailsStep entry={entry} />}
      {step === 'money' && <MoneyStep entry={entry} errors={errors} />}
      {step === 'review' && <ReviewStep entry={entry} />}

      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <div className="flex gap-2">
        {index > 0 && (
          <Button variant="secondary" size="lg" onClick={() => goTo(DRAFT_STEPS[index - 1]!)}>
            {t('entry.back')}
          </Button>
        )}
        {step === 'review' ? (
          <Button size="lg" data-tour="save-order" disabled={entry.saving} onClick={() => void save()}>
            {entry.saving ? t('entry.saving') : t('entry.save')}
          </Button>
        ) : (
          <Button size="lg" onClick={next}>
            {t('entry.next')}
          </Button>
        )}
      </div>
      {/* Room after Back/Next so they can be scrolled above the pinned keypad. */}
      {keypadSpace > 0 && <div aria-hidden="true" data-testid="keypad-space" style={{ height: keypadSpace }} />}
    </div>
  );
}

function ItemRegion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border border-line bg-panel p-3">
      <h3 className="font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function GarmentsStep({
  entry,
  errors,
  onDone,
  onKeypadSpace,
}: {
  entry: OrderEntry;
  errors: DraftErrors;
  onDone(): void;
  onKeypadSpace(height: number): void;
}) {
  const { t, label } = useI18n();
  const { config } = useSnapshot();
  const title = useItemTitle(entry);
  const errorText = useErrorText(errors);
  const templates = (config?.templates ?? []).filter((tpl) => tpl.active);
  const [chosen, setChosen] = useState(templates[0]?.id ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const adder = useRef<HTMLDivElement>(null);
  const items = entry.draft.items;
  const count = useRef(items.length);

  // A newly added garment becomes the one being measured.
  useEffect(() => {
    if (items.length > count.current) setPicked(items[items.length - 1]!.key);
    count.current = items.length;
  }, [items]);

  // Errors on a garment that is not showing bring it forward so the first problem can be reached.
  const hasErrors = (key: string) => Object.keys(errors).some((path) => path.startsWith(`items.${key}.`));
  const current = items.find((i) => i.key === picked) ?? items[0];
  const shown = current && !hasErrors(current.key) ? (items.find((i) => hasErrors(i.key)) ?? current) : current;

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <ChipGroup
          label={t('entry.garmentTabs')}
          options={items.map((item) => ({ value: item.key, label: title(item) }))}
          value={shown?.key ?? ''}
          onChange={setPicked}
          trailing={
            <button
              type="button"
              aria-label={t('entry.addAnother')}
              onClick={() => adder.current?.querySelector('select')?.focus()}
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Plus aria-hidden="true" size={18} />
            </button>
          }
        />
      )}
      {shown && (
        <ItemRegion key={shown.key} title={title(shown)}>
          <ItemHeader entry={entry} item={shown} errors={errors} />
          <ItemMeasurements entry={entry} item={shown} errors={errors} tiles onDone={onDone} onKeypadSpace={onKeypadSpace} />
        </ItemRegion>
      )}
      <div ref={adder} className="flex flex-col gap-4">
        <SelectField
          label={t('entry.garment')}
          value={chosen}
          options={templates.map((tpl) => ({ value: tpl.id, label: label(tpl.name) }))}
          onChange={setChosen}
          error={errorText('items')}
        />
        <Button variant="secondary" data-tour="add-garment" disabled={!chosen} onClick={() => entry.addItem(chosen)}>
          {t('entry.addGarment')}
        </Button>
      </div>
    </div>
  );
}

function DetailsStep({ entry }: { entry: OrderEntry }) {
  const title = useItemTitle(entry);
  return (
    <div className="flex flex-col gap-4">
      {entry.draft.items.map((item) => (
        <ItemRegion key={item.key} title={title(item)}>
          <ItemDetails entry={entry} item={item} />
        </ItemRegion>
      ))}
    </div>
  );
}

function MoneyStep({ entry, errors }: { entry: OrderEntry; errors: DraftErrors }) {
  const title = useItemTitle(entry);
  return (
    <div className="flex flex-col gap-4">
      {entry.draft.items.map((item) => (
        <ItemRegion key={item.key} title={title(item)}>
          <ItemMoney entry={entry} item={item} errors={errors} />
        </ItemRegion>
      ))}
      <MoneyFields entry={entry} errors={errors} />
      <DraftSummary totals={entry.totals} />
    </div>
  );
}

function ReviewStep({ entry }: { entry: OrderEntry }) {
  const { t, money, date, number } = useI18n();
  const { state } = useSnapshot();
  const title = useItemTitle(entry);
  const { customer } = entry.draft;
  const name = customer?.kind === 'new' ? customer.name : customer ? (state.customers[customer.customerId]?.name ?? '') : '';
  return (
    <div className="flex flex-col gap-4">
      <p className="font-semibold">{name}</p>
      <ul className="flex flex-col gap-2">
        {entry.draft.items.map((item) => (
          <li key={item.key} className="flex flex-col rounded-lg border border-line bg-panel px-3 py-2">
            <span className="font-semibold">
              {title(item)} × {number(item.quantity)}
            </span>
            {item.wearer && (
              <span className="text-sm text-muted">
                {t('receipt.wearer')}: {item.wearer}
              </span>
            )}
            <span className="text-sm text-muted">
              {t('receipt.delivery')}: {item.deliveryDate ? date(item.deliveryDate) : ''}
            </span>
            <span className="text-sm text-muted">
              {t('receipt.price')}: {item.price === null ? '' : money(item.price)}
            </span>
          </li>
        ))}
      </ul>
      <DraftSummary totals={entry.totals} />
    </div>
  );
}
