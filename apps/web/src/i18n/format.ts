import { formatTaka, toScript, todayInDhaka, type Language, type Poisha } from '@darzikhata/domain';
import { bn, type MessageKey, type Messages } from './bn';
import { en } from './en';

export const MESSAGES: Record<Language, Messages> = { bn, en };

/** Looks up a message and fills {placeholders}. Unknown placeholders are left as typed. */
export function translate(language: Language, key: MessageKey, vars: Record<string, string | number> = {}): string {
  return MESSAGES[language][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

const MONTHS: Record<Language, string[]> = {
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Formats YYYY-MM-DD, or an ISO timestamp shown in Dhaka time, as "৩ অক্টোবর ২০২৬" / "3 Oct 2026". */
export function formatDate(value: string, language: Language, options: { year?: boolean } = {}): string {
  const date = value.length > 10 ? todayInDhaka(new Date(value)) : value;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const text = `${d} ${MONTHS[language][m - 1]}${options.year === false ? '' : ` ${y}`}`;
  return toScript(text, language);
}

export function formatMoney(amount: Poisha, language: Language): string {
  return formatTaka(amount, language);
}

export function formatNumber(value: number, language: Language): string {
  return toScript(String(value), language);
}
