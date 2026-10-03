import { toEnglishDigits } from './digits';

/** Bangla letters mapped to a rough Latin consonant. Vowels and signs are dropped. */
const BANGLA_CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'k', 'গ': 'g', 'ঘ': 'g', 'ঙ': 'ng',
  'চ': 'c', 'ছ': 'c', 'জ': 'j', 'ঝ': 'j', 'ঞ': 'n',
  'ট': 't', 'ঠ': 't', 'ড': 'd', 'ঢ': 'd', 'ণ': 'n',
  'ত': 't', 'থ': 't', 'দ': 'd', 'ধ': 'd', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'b', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 's', 'ষ': 's',
  'স': 's', 'হ': 'h', 'ৎ': 't', 'ং': 'ng',
};

const LATIN_DIGRAPHS: Array<[RegExp, string]> = [
  [/chh|ch/g, 'C'],
  [/kh/g, 'k'],
  [/gh/g, 'g'],
  [/jh/g, 'j'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/ph/g, 'f'],
  [/bh/g, 'b'],
  [/sh/g, 's'],
];

const LATIN_SINGLE: Record<string, string> = {
  C: 'c', c: 'k', q: 'k', z: 'j', v: 'b', x: 'ks',
  a: '', e: '', i: '', o: '', u: '', w: '', y: '',
};

/**
 * Reduces a name to a consonant skeleton that is the same for Bangla and Latin
 * spellings, so "রহিম" and "Rahim" both become "rhm".
 */
export function nameKey(name: string): string {
  let text = name
    .normalize('NFD')
    .toLowerCase()
    .replace(/য়/g, '') // য় is a vowel glide
    .replace(/্য/g, '') // ya-phala
    .replace(/[ডঢ]়/g, 'r'); // ড় ঢ়
  for (const [pattern, replacement] of LATIN_DIGRAPHS) text = text.replace(pattern, replacement);

  let key = '';
  for (const ch of text) {
    const bangla = BANGLA_CONSONANTS[ch];
    const latin = LATIN_SINGLE[ch];
    if (bangla !== undefined) key += bangla;
    else if (latin !== undefined) key += latin;
    else if (/[a-z]/.test(ch)) key += ch;
  }
  return key.replace(/(.)\1+/g, '$1');
}

/** Digits only, Bangla digits converted, +880 country code turned into a leading 0. */
export function normalizePhone(input: string): string {
  const digits = toEnglishDigits(input).replace(/\D/g, '');
  return digits.startsWith('880') && digits.length === 13 ? `0${digits.slice(3)}` : digits;
}

export interface SearchableCustomer {
  name: string;
  nameAlt: string | null;
  phone: string | null;
}

/** 0 = no match. Higher is better: phone 3, name text 2, name sound-alike 1. */
export function customerMatchScore(customer: SearchableCustomer, query: string): number {
  const trimmed = query.trim();
  if (!trimmed) return 0;

  const queryDigits = normalizePhone(trimmed);
  if (/^[\d\s+\-০-৯]+$/.test(trimmed) && queryDigits.length >= 3) {
    return customer.phone && normalizePhone(customer.phone).includes(queryDigits) ? 3 : 0;
  }

  const names = [customer.name, customer.nameAlt].filter((n): n is string => !!n);
  const lowered = trimmed.toLowerCase();
  if (names.some((n) => n.toLowerCase().includes(lowered))) return 2;

  const queryKey = nameKey(trimmed);
  if (queryKey.length >= 2 && names.some((n) => nameKey(n).includes(queryKey))) return 1;
  return 0;
}

/** Matching customers, best first, then alphabetically by name. */
export function searchCustomers<T extends SearchableCustomer>(customers: T[], query: string, limit = 20): T[] {
  return customers
    .map((customer) => ({ customer, score: customerMatchScore(customer, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.customer.name.localeCompare(b.customer.name))
    .slice(0, limit)
    .map((r) => r.customer);
}
