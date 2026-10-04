import { TriangleAlert } from 'lucide-react';
import { useToday } from '../features/common/hooks';
import { useI18n } from '../i18n/I18nProvider';
import { dueFrom } from './dueText';

/** How far a delivery date is from today. Late dates are flagged with a warning style. */
export function DueLabel({ date }: { date: string }) {
  const { t, number } = useI18n();
  const due = dueFrom(date, useToday());
  const text = t(`due.${due.kind}`, 'days' in due ? { n: number(due.days) } : {});
  if (due.kind === 'late') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md ring-1 ring-inset ring-warn-line bg-warn-soft px-2 py-0.5 text-sm font-semibold text-warn-ink">
        <TriangleAlert aria-hidden="true" size={14} />
        {text}
      </span>
    );
  }
  return <span className="text-sm text-muted">{text}</span>;
}
