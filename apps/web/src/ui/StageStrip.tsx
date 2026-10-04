import { useI18n } from '../i18n/I18nProvider';

export interface StageStripProps {
  /** How many stages the garment passes through. */
  total: number;
  /** 1-based number of the current stage. */
  current: number;
  /** Already translated name of the current stage; read out with the numbers. */
  stage: string;
}

/** A thin strip with one segment per stage: filled up to and including the current one. */
export function StageStrip({ total, current, stage }: StageStripProps) {
  const { t, number } = useI18n();
  return (
    <div
      role="img"
      aria-label={t('orders.stageStrip', { n: number(current), total: number(total), stage })}
      className="flex gap-1"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 rounded-full ${index + 1 < current ? 'bg-brand' : index + 1 === current ? 'bg-brand-strong' : 'bg-line'}`}
        />
      ))}
    </div>
  );
}
