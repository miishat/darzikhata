import { Clock, TriangleAlert } from 'lucide-react';
import { useToday } from '../features/common/hooks';
import { useI18n } from '../i18n/I18nProvider';
import { dueFrom } from './dueText';

/** How far a delivery date is from today, as a small chip to sit beside a stage pill. Late dates get the warning style. */
export function DueChip({ date }: { date: string }) {
  const { t, number } = useI18n();
  const due = dueFrom(date, useToday());
  const late = due.kind === 'late';
  const Icon = late ? TriangleAlert : Clock;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-sm ${
        late ? 'bg-warn-soft font-semibold text-warn-ink ring-1 ring-inset ring-warn-line' : 'bg-surface text-muted'
      }`}
    >
      <Icon aria-hidden="true" size={14} />
      {t(`due.${due.kind}`, 'days' in due ? { n: number(due.days) } : {})}
    </span>
  );
}
