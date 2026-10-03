import { toEnglishDigits, toScript, type DigitScript } from './digits';

/** Money is always stored as an integer number of poisha (1 taka = 100 poisha). */
export type Poisha = number;

export function isPoisha(value: number): boolean {
  return Number.isSafeInteger(value);
}

export function takaToPoisha(taka: number): Poisha {
  const poisha = Math.round(taka * 100);
  if (!Number.isSafeInteger(poisha)) {
    throw new Error(`Invalid taka amount: ${taka}`);
  }
  return poisha;
}

/** Groups an integer digit string the South Asian way: 1234567 -> 12,34,567. */
export function groupLakh(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const pairs: string[] = [];
  while (rest.length > 2) {
    pairs.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) pairs.unshift(rest);
  return `${pairs.join(',')},${lastThree}`;
}

/** Formats poisha as taka, e.g. 240000 -> "৳২,৪০০". Poisha are shown only when non-zero. */
export function formatTaka(amount: Poisha, script: DigitScript = 'bn'): string {
  if (!isPoisha(amount)) throw new Error(`Amount must be integer poisha, got ${amount}`);
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  let text = `৳${groupLakh(String(whole))}`;
  if (fraction) text += `.${String(fraction).padStart(2, '0')}`;
  return toScript(amount < 0 ? `-${text}` : text, script);
}

/** Parses typed taka such as "২,৪০০" or "2400.50" into poisha. Returns null when invalid. */
export function parseTaka(input: string): Poisha | null {
  const cleaned = toEnglishDigits(input).replace(/[,\s৳]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const poisha = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(poisha) ? poisha : null;
}
