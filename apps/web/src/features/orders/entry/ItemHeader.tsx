import { toEnglishDigits, toScript } from '@darzikhata/domain';
import { Minus, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { IconButton } from '../../../ui/IconButton';
import { TextField } from '../../../ui/TextField';
import { MAX_QUANTITY, type DraftErrors, type DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText } from './shared';

/** The most a quantity field accepts; the draft's own limit is lower. */
const MAX_QUANTITY_INPUT = 999;

/**
 * A line's quantity (Bangla or English digits, never a fraction or a negative). On a phone, one-less and one-more
 * buttons sit either side of the field; the number can still be typed for a big group order.
 */
export function ItemHeader({ entry, item, errors, stepper = false }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors; stepper?: boolean }) {
  const { t, language } = useI18n();
  const errorText = useErrorText(errors);
  const id = useId();
  const [text, setText] = useState(() => toScript(String(item.quantity), language));

  const change = (raw: string) => {
    setText(raw);
    const digits = toEnglishDigits(raw).trim();
    const n = /^\d+$/.test(digits) ? Number(digits) : 0;
    const quantity = Number.isSafeInteger(n) ? Math.min(n, MAX_QUANTITY_INPUT) : 0;
    if (quantity === MAX_QUANTITY_INPUT && n > MAX_QUANTITY_INPUT) setText(toScript(String(quantity), language));
    entry.updateItem(item.key, { quantity });
  };

  const step = (by: number) => {
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, item.quantity + by));
    setText(toScript(String(quantity), language));
    entry.updateItem(item.key, { quantity });
  };

  const error = errorText(`items.${item.key}.quantity`) ?? errorText(`items.${item.key}.template`);
  const tidy = () => {
    if (item.quantity > 0) setText(toScript(String(item.quantity), language));
  };

  if (!stepper)
    return (
      <TextField
        label={t('entry.quantity')}
        className="w-28"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={tidy}
        error={error}
      />
    );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-semibold">
          {t('entry.quantity')}
        </label>
        <div className={`flex items-center rounded-xl border bg-panel focus-within:outline-2 focus-within:outline-focus ${error ? 'border-danger' : 'border-line'}`}>
          <IconButton label={t('entry.quantityLess')} icon={Minus} disabled={item.quantity <= 1} onClick={() => step(-1)} className="disabled:opacity-40" />
          <input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => change(e.target.value)}
            onBlur={tidy}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-message` : undefined}
            className="w-12 bg-transparent text-center font-display text-xl font-semibold outline-none"
          />
          <IconButton label={t('entry.quantityMore')} icon={Plus} disabled={item.quantity >= MAX_QUANTITY} onClick={() => step(1)} className="disabled:opacity-40" />
        </div>
      </div>
      {error && (
        <p id={`${id}-message`} className="text-end text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
