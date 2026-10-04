import { toEnglishDigits } from '@darzikhata/domain';
import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface PinPadProps {
  label: string;
  error?: string | undefined;
  onComplete(pin: string): void;
  length?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

/** Large-button PIN entry for shared shop devices. Also accepts typed digits in either script. */
export function PinPad({ label, error, onComplete, length = 4 }: PinPadProps) {
  const { t, number } = useI18n();
  const [digits, setDigits] = useState('');

  const press = (digit: string) => {
    const next = digits + digit;
    if (next.length >= length) {
      setDigits('');
      onComplete(next.slice(0, length));
    } else {
      setDigits(next);
    }
  };
  const remove = () => setDigits((d) => d.slice(0, -1));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const digit = toEnglishDigits(e.key);
    if (/^\d$/.test(digit)) {
      e.preventDefault();
      press(digit);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      remove();
    }
  };

  return (
    <div role="group" aria-label={label} tabIndex={0} onKeyDown={onKeyDown} className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
      <div className="flex gap-3" aria-hidden="true">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-brand ${i < digits.length ? 'bg-brand' : ''}`} />
        ))}
      </div>
      <p aria-live="polite" className="min-h-6 text-sm text-danger">
        {error}
      </p>
      <div className="grid w-full grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : key === 'delete' ? (
            <button key={i} type="button" aria-label={t('pin.delete')} onClick={remove} className="min-h-14 rounded-xl text-xl hover:bg-panel focus-visible:outline-2 focus-visible:outline-focus">
              ⌫
            </button>
          ) : (
            <button key={i} type="button" onClick={() => press(key)} className="min-h-14 rounded-xl border border-line bg-panel text-2xl font-semibold hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus">
              {number(Number(key))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
