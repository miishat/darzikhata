import { formatMeasurement, parseMeasurement, type GarmentTemplate } from '@darzikhata/domain';
import { X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useKeypadOn } from '../../../shell/keypad';
import { IconButton } from '../../../ui/IconButton';
import { MeasureKeypad } from '../../../ui/MeasureKeypad';
import { changedFromPrevious, fieldGroups, groupLabel, nextFieldKey } from '../../customers/measurementView';

export interface MeasureTilesProps {
  template: GarmentTemplate;
  values: Record<string, number>;
  /** The customer's previous values, shown as "আগে ৩৮¼" when a tile's value differs. */
  previous: Record<string, number>;
  errors: Record<string, string>;
  onChange(values: Record<string, number>): void;
  /** Called when "next" is pressed on the last field. */
  onDone(): void;
  /** Height in px the page must keep free under its content while the keypad is open; 0 when closed. */
  onKeypadSpace?(height: number): void;
}

/**
 * A three-column grid of measurement tiles. Each tile holds a real input, so the system keyboard and
 * hardware typing still work; with the keypad on the input uses inputmode="none" and a keypad
 * pinned at the bottom builds the text. Parsing is the domain's `parseMeasurement`.
 */
export function MeasureTiles({ template, values, previous, errors, onChange, onDone, onKeypadSpace }: MeasureTilesProps) {
  const { t, label, language } = useI18n();
  const { keypadOn } = useKeypadOn();
  const prefix = useId();
  const show = (n: number) => formatMeasurement(n, language);
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(values).map(([key, n]) => [key, show(n)])),
  );
  const [active, setActive] = useState<string | null>(null);
  const [padding, setPadding] = useState(0);
  const latest = useRef(values);
  const keypadRef = useRef<HTMLDivElement>(null);
  const open = keypadOn && active !== null;
  const activeField = template.fields.find((f) => f.key === active);

  const setText = (key: string, raw: string) => {
    setTexts((prev) => ({ ...prev, [key]: raw }));
    const parsed = raw.trim() === '' ? null : parseMeasurement(raw);
    const next = { ...latest.current };
    if (parsed === null) delete next[key];
    else next[key] = parsed;
    latest.current = next;
    onChange(next);
  };

  /** Tidies typed text into the shop's usual form once the tailor has moved on from it. */
  const tidy = (key: string | null) => {
    if (!key) return;
    const parsed = parseMeasurement(texts[key] ?? '');
    if (parsed !== null) setTexts((prev) => ({ ...prev, [key]: show(parsed) }));
  };

  const pick = (key: string) => {
    if (key === active) return;
    tidy(active);
    setActive(key);
  };

  // Keep the keypad from covering the active tile: leave room under the page and scroll the tile up.
  useLayoutEffect(() => {
    setPadding(open ? (keypadRef.current?.offsetHeight ?? 0) : 0);
  }, [open, active]);
  useLayoutEffect(() => {
    onKeypadSpace?.(padding);
  }, [padding, onKeypadSpace]);
  useLayoutEffect(() => () => onKeypadSpace?.(0), [onKeypadSpace]);
  useEffect(() => {
    if (!open || !active) return;
    const tile = document.getElementById(`${prefix}-tile-${active}`);
    if (!tile) return;
    tile.style.scrollMarginBottom = `${padding + 16}px`;
    tile.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, padding, prefix]);

  const close = () => {
    tidy(active);
    setActive(null);
  };

  const next = () => {
    if (!active) return;
    const following = nextFieldKey(template.fields, active);
    if (following === null) {
      close();
      onDone();
      return;
    }
    tidy(active);
    setActive(following);
    document.getElementById(`${prefix}-input-${following}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-3" onKeyDown={(e) => e.key === 'Escape' && open && close()}>
      {fieldGroups(template.fields).map((group) => (
        <div key={group.group} className="flex flex-col gap-2">
          <h4 className="px-1 text-sm font-semibold text-muted">{groupLabel(group.group, t)}</h4>
          <div className="grid grid-cols-3 gap-2">
            {group.fields.map((field) => {
              const text = texts[field.key] ?? '';
              const on = field.key === active;
              const value = values[field.key];
              const unreadable = text.trim() !== '' && parseMeasurement(text) === null && !on;
              const error = unreadable ? t('input.invalidMeasurement') : errors[field.key];
              const before = previous[field.key];
              const changed = changedFromPrevious(value ?? null, before);
              const id = `${prefix}-input-${field.key}`;
              return (
                <div
                  key={field.key}
                  id={`${prefix}-tile-${field.key}`}
                  onClick={() => document.getElementById(id)?.focus()}
                  className={`flex min-h-11 flex-col rounded-2xl bg-panel px-3 py-2 ${
                    on ? 'border-2 border-brand ring-4 ring-brand-soft' : error ? 'border border-danger' : 'border border-line'
                  }`}
                >
                  <label htmlFor={id} className="text-xs text-muted">
                    {label(field.label)}
                  </label>
                  <input
                    id={id}
                    value={text}
                    inputMode={keypadOn ? 'none' : 'decimal'}
                    autoComplete="off"
                    placeholder="–"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-note` : undefined}
                    onFocus={() => pick(field.key)}
                    onChange={(e) => setText(field.key, e.target.value)}
                    onBlur={() => !keypadOn && tidy(field.key)}
                    className="w-full min-w-0 bg-transparent font-display text-2xl font-semibold text-ink outline-none placeholder:text-muted"
                  />
                  <span className="min-h-4 text-[11px] font-semibold text-warn-ink">
                    {changed && before !== undefined ? t('entry.before', { value: show(before) }) : ''}
                  </span>
                  {error && (
                    <span id={`${id}-note`} className="text-xs text-danger">
                      {error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {open && activeField && (
        <>
          <div
            ref={keypadRef}
            className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-1 rounded-t-3xl border-t border-line bg-panel-raised px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg"
          >
            <div className="flex justify-end">
              <IconButton label={t('common.close')} icon={X} onClick={close} className="-my-1" />
            </div>
            <MeasureKeypad
              value={texts[activeField.key] ?? ''}
              onChange={(raw) => setText(activeField.key, raw)}
              onNext={next}
              label={`${label(activeField.label)} · ${t(activeField.unit === 'cm' ? 'unit.cm' : 'unit.inch')}`}
              previous={previous[activeField.key] === undefined ? undefined : show(previous[activeField.key]!)}
            />
          </div>
        </>
      )}
    </div>
  );
}
