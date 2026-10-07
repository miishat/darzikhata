import { useSnapshot } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import type { ReviewValue } from './reviewView';

/** How a stored value reads on screen. */
export function useValueText(): (value: ReviewValue) => string {
  const { t, money, date } = useI18n();
  const { state, config } = useSnapshot();
  const blank = t('review.blank');
  return (value) => {
    switch (value.kind) {
      case 'text':
        return value.value ? value.value : blank;
      case 'date':
        return value.value ? date(value.value, { year: true }) : blank;
      case 'money':
        return money(value.value);
      case 'staff':
        return value.value ? (config?.staff.find((s) => s.id === value.value)?.name ?? value.value) : blank;
      case 'gender':
        return value.value ? t(`gender.${value.value}`) : blank;
      case 'household':
        return value.value ? (state.households[value.value]?.label ?? value.value) : blank;
      case 'discount':
        if (!value.value) return blank;
        return value.value.reason ? `${money(value.value.amount)} (${value.value.reason})` : money(value.value.amount);
    }
  };
}
