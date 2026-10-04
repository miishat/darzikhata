import { toScript } from '@darzikhata/domain';
import { Delete } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/bn';

const FRACTIONS = ['¼', '½', '¾'];

/** The value after pressing a key. Digits and dot are ignored after a fraction; a fraction replaces another. */
export function applyKey(value: string, key: string): string {
  if (key === 'back') return value.slice(0, -1);
  const endsWithFraction = FRACTIONS.some((f) => value.endsWith(f));
  if (FRACTIONS.includes(key)) return value === '' ? value : value.replace(/[¼½¾]$/, '') + key;
  if (endsWithFraction) return value;
  if (key === '.' && (value === '' || value.includes('.'))) return value;
  return value + key;
}

export interface MeasureKeypadProps {
  /** The text typed so far, in the digits shown on the keys. */
  value: string;
  onChange(value: string): void;
  /** Move to the next measurement field. */
  onNext(): void;
  /** Name of the measurement being entered, e.g. "বুক". */
  label: string;
  /** The customer's previous value for this measurement, if any. */
  previous?: string | undefined;
}

type KeyDef = { id: string; text: string; name: MessageKey | null; kind: 'digit' | 'fraction' | 'back' | 'next' };

const KEY_BASE = 'flex h-[50px] min-h-11 min-w-11 items-center justify-center rounded-xl text-[22px] font-semibold font-display focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const KEY_STYLE: Record<KeyDef['kind'], string> = {
  digit: 'bg-surface text-ink',
  fraction: 'bg-brand-soft text-brand-strong',
  back: 'bg-surface text-ink',
  next: 'bg-brand text-on-brand font-sans text-base',
};

/** Number pad for measurements with fraction keys. */
export function MeasureKeypad({ value, onChange, onNext, label, previous }: MeasureKeypadProps) {
  const { t, language } = useI18n();
  const digit = (n: string): KeyDef => ({ id: n, text: toScript(n, language), name: null, kind: 'digit' });
  const keys: KeyDef[] = [
    digit('1'), digit('2'), digit('3'), { id: '¼', text: '¼', name: 'ui.key.quarter', kind: 'fraction' },
    digit('4'), digit('5'), digit('6'), { id: '½', text: '½', name: 'ui.key.half', kind: 'fraction' },
    digit('7'), digit('8'), digit('9'), { id: '¾', text: '¾', name: 'ui.key.threeQuarters', kind: 'fraction' },
    { id: 'back', text: '', name: 'ui.key.back', kind: 'back' },
    digit('0'),
    { id: '.', text: '.', name: 'ui.key.dot', kind: 'digit' },
    { id: 'next', text: t('ui.key.nextShort'), name: 'ui.key.next', kind: 'next' },
  ];

  const press = (key: KeyDef) => {
    if (key.kind === 'next') return onNext();
    onChange(applyKey(value, key.kind === 'back' ? 'back' : key.text));
  };

  return (
    <div role="group" aria-label={t('ui.keypad')} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        {previous && <span className="text-sm text-muted">{t('ui.keypadPrevious', { value: previous })}</span>}
      </div>
      <output data-testid="keypad-value" aria-label={`${label} ${value}`.trim()} className="block min-h-10 font-display text-3xl font-semibold">
        {value}
      </output>
      <div className="grid grid-cols-4 gap-2">
        {keys.map((key) => (
          <button
            key={key.id}
            type="button"
            aria-label={key.name ? t(key.name) : undefined}
            onClick={() => press(key)}
            className={`${KEY_BASE} ${KEY_STYLE[key.kind]}`}
          >
            {key.kind === 'back' ? <Delete aria-hidden="true" size={22} /> : key.text}
          </button>
        ))}
      </div>
    </div>
  );
}
