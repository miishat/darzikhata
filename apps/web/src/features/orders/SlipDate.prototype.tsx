// PROTOTYPE (throwaway): the phone order slip's garment row shows a bare "·" where the delivery date goes once the
// date is cleared. Current plus five ways to show a missing date, switchable via ?variant= on /app/orders/new
// (open a garment, Price tab, clear the delivery date, then come back to the slip).
import { CalendarPlus } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider';
import { useVariant } from '../../ui/PrototypeSwitcher';
import type { DraftItem } from './draft';

export const DATE_VARIANT_KEYS = ['0', 'V1', 'V2', 'V3', 'V4', 'V5'] as const;

function usePick() {
  const { language } = useI18n();
  return (bn: string, en: string) => (language === 'bn' ? bn : en);
}

export function useDateVariants(): Record<string, string> {
  const pick = usePick();
  return {
    '0': pick('এখনকার: শুধু "·"', 'Current: a bare "·"'),
    V1: pick('V1: তারিখ না থাকলে দ্বিতীয় লাইন নেই', 'V1: no second line without a date'),
    V2: pick('V2: হালকা লেখা "ডেলিভারির তারিখ নেই"', 'V2: muted "No delivery date"'),
    V3: pick('V3: কমলা "ডেলিভারির তারিখ দিন", চাপলে তারিখের ঘরে', 'V3: orange "Add a delivery date", opens the date'),
    V4: pick('V4: সবসময় "ডেলিভারি: …" লেবেল সহ', 'V4: always labelled "Delivery: …"'),
    V5: pick('V5: ডান পাশে তারিখের চিপ', 'V5: date as a chip on the right'),
  };
}

export function useDateVariant(): string {
  return useVariant(DATE_VARIANT_KEYS);
}

/** Which garment tab the row opens: V3 and V5 go straight to the dates when there are none. */
export function rowTab(variant: string, line: DraftItem): 'measure' | 'price' {
  return !line.deliveryDate && (variant === 'V3' || variant === 'V5') ? 'price' : 'measure';
}

/** The row's second line, or nothing (V1 without a date, V5 always). */
export function SlipDateLine({ line, variant }: { line: DraftItem; variant: string }) {
  const { date } = useI18n();
  const pick = usePick();
  const has = !!line.deliveryDate;
  const when = has ? date(line.deliveryDate) : '';
  const muted = 'block truncate text-sm text-muted';

  if (variant === '0') return <span className={muted}>{has ? when : '·'}</span>;
  if (variant === 'V5') return null;
  if (has) return <span className={muted}>{variant === 'V4' ? pick(`ডেলিভারি: ${when}`, `Delivery: ${when}`) : when}</span>;
  if (variant === 'V1') return null;
  if (variant === 'V2') return <span className={`${muted} italic`}>{pick('ডেলিভারির তারিখ নেই', 'No delivery date')}</span>;
  if (variant === 'V3')
    return (
      <span className="flex items-center gap-1 truncate text-sm font-semibold text-warn-ink">
        <CalendarPlus aria-hidden="true" size={14} className="shrink-0" />
        {pick('ডেলিভারির তারিখ দিন', 'Add a delivery date')}
      </span>
    );
  return <span className={muted}>{pick('ডেলিভারি: দেওয়া হয়নি', 'Delivery: not set')}</span>;
}

/** V5: the date sits beside the price as a small chip; orange and asking for one when missing. */
export function SlipDateChip({ line, variant }: { line: DraftItem; variant: string }) {
  const { language } = useI18n();
  const pick = usePick();
  if (variant !== 'V5') return null;
  if (!line.deliveryDate)
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-1 text-xs font-semibold text-warn-ink ring-1 ring-inset ring-warn-line">
        <CalendarPlus aria-hidden="true" size={13} />
        {pick('তারিখ দিন', 'Add Date')}
      </span>
    );
  const short = new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${line.deliveryDate}T00:00:00`));
  return <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-xs font-semibold text-muted">{short}</span>;
}
