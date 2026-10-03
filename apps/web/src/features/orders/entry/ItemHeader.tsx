import { toEnglishDigits, toScript } from '@darzikhata/domain';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Button } from '../../../ui/Button';
import { TextField } from '../../../ui/TextField';
import type { DraftErrors, DraftItem } from '../draft';
import type { OrderEntry } from '../useOrderEntry';
import { useErrorText, useItemTitle } from './shared';

/** The most a quantity field accepts; the draft's own limit is lower. */
const MAX_QUANTITY_INPUT = 999;

/** A line's quantity (Bangla or English digits, never a fraction or a negative) and its remove button. */
export function ItemHeader({ entry, item, errors }: { entry: OrderEntry; item: DraftItem; errors: DraftErrors }) {
  const { t, language } = useI18n();
  const title = useItemTitle(entry);
  const errorText = useErrorText(errors);
  const [text, setText] = useState(() => toScript(String(item.quantity), language));

  const change = (raw: string) => {
    setText(raw);
    const digits = toEnglishDigits(raw).trim();
    const n = /^\d+$/.test(digits) ? Number(digits) : 0;
    const quantity = Number.isSafeInteger(n) ? Math.min(n, MAX_QUANTITY_INPUT) : 0;
    if (quantity === MAX_QUANTITY_INPUT && n > MAX_QUANTITY_INPUT) setText(toScript(String(quantity), language));
    entry.updateItem(item.key, { quantity });
  };

  return (
    <div className="flex items-end gap-3">
      <TextField
        label={t('entry.quantity')}
        className="w-28"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        onChange={(e) => change(e.target.value)}
        onBlur={() => {
          if (item.quantity > 0) setText(toScript(String(item.quantity), language));
        }}
        error={errorText(`items.${item.key}.quantity`) ?? errorText(`items.${item.key}.template`)}
      />
      <Button variant="ghost" aria-label={t('entry.removeItem', { item: title(item) })} onClick={() => entry.removeItem(item.key)}>
        <span aria-hidden="true">×</span>
      </Button>
    </div>
  );
}
