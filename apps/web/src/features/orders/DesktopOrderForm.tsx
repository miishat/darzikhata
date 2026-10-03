import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { CustomerPicker } from './entry/CustomerPicker';
import { DraftSummary } from './entry/DraftSummary';
import { ItemDetails } from './entry/ItemDetails';
import { ItemHeader } from './entry/ItemHeader';
import { ItemMeasurements } from './entry/ItemMeasurements';
import { ItemMoney, MoneyFields } from './entry/MoneyFields';
import { useErrorText, useItemTitle } from './entry/shared';
import type { OrderEntry } from './useOrderEntry';

interface Props {
  entry: OrderEntry;
  /** Called with the new order's id once it is saved. */
  onSaved(orderId: string): void;
}

function Column({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-panel p-4 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Order entry on one screen, for a desktop: customer and lines, the chosen line's details, and the money. */
export function DesktopOrderForm({ entry, onSaved }: Props) {
  const { t, label } = useI18n();
  const { config } = useSnapshot();
  const title = useItemTitle(entry);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const templates = (config?.templates ?? []).filter((tpl) => tpl.active);
  const [template, setTemplate] = useState(templates[0]?.id ?? '');

  const errors = showErrors ? entry.errors : {};
  const errorText = useErrorText(errors);
  const items = entry.draft.items;
  const chosen = items.find((i) => i.key === chosenKey) ?? null;
  const hasErrors = Object.keys(errors).length > 0;
  const lineHasErrors = (key: string) => Object.keys(errors).some((path) => path.startsWith(`items.${key}.`));

  // A newly added line becomes the chosen one.
  const count = useRef(items.length);
  useEffect(() => {
    if (items.length > count.current) setChosenKey(items[items.length - 1]!.key);
    count.current = items.length;
  }, [items]);

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
    const paths = Object.keys(entry.errors);
    if (paths.length > 0) {
      setShowErrors(true);
      const first = items.find((i) => paths.some((p) => p.startsWith(`items.${i.key}.`)));
      if (first) setChosenKey(first.key);
      return;
    }
    setProblem(t('entry.saveFailed'));
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.newOrder')}</h1>
      {(hasErrors || problem) && (
        <p role="alert" className="rounded-lg border border-danger px-3 py-2 text-danger">
          {problem ?? t('entry.fixErrors')}
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] items-start gap-4">
        <Column title={t('entry.left')}>
          <CustomerPicker entry={entry} errors={errors} />
          <SelectField
            label={t('entry.garment')}
            value={template}
            options={templates.map((tpl) => ({ value: tpl.id, label: label(tpl.name) }))}
            onChange={setTemplate}
            error={errorText('items')}
          />
          <Button variant="secondary" disabled={!template} onClick={() => entry.addItem(template)}>
            {t('entry.addGarment')}
          </Button>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  aria-pressed={item.key === chosenKey}
                  className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand aria-pressed:border-brand aria-pressed:bg-surface"
                  onClick={() => setChosenKey(item.key)}
                >
                  <span className="font-semibold">{title(item)}</span>
                  {lineHasErrors(item.key) && <span className="text-sm text-danger">{t('entry.itemHasErrors')}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Column>

        <Column title={t('entry.middle')}>
          {chosen ? (
            <>
              <h3 className="font-semibold">{title(chosen)}</h3>
              <ItemHeader key={`${chosen.key}:header`} entry={entry} item={chosen} errors={errors} />
              <ItemMeasurements key={`${chosen.key}:measurements`} entry={entry} item={chosen} errors={errors} />
              <ItemDetails key={`${chosen.key}:details`} entry={entry} item={chosen} />
            </>
          ) : (
            <p className="text-muted">{t('entry.chooseItem')}</p>
          )}
        </Column>

        <Column title={t('entry.summary')} className="sticky top-4">
          {chosen && <ItemMoney key={chosen.key} entry={entry} item={chosen} errors={errors} />}
          <MoneyFields entry={entry} errors={errors} />
          <DraftSummary totals={entry.totals} />
          <Button size="lg" disabled={entry.saving} onClick={() => void save()}>
            {entry.saving ? t('entry.saving') : t('entry.save')}
          </Button>
        </Column>
      </div>
    </div>
  );
}
