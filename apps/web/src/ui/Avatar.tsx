import { avatarTone } from './avatarTone';

const SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-xl', xl: 'size-[72px] text-3xl' };

/** One user-perceived letter, so "মোহাম্মদ" gives "মো" and "স্বপন" gives "স্ব", never a dangling virama. */
export function firstCluster(word: string, useSegmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl): string {
  if (useSegmenter) {
    const first = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word)[Symbol.iterator]().next().value?.segment ?? '';
    return /^[\p{L}\p{N}]/u.test(first) ? first : '';
  }
  // Built here, not at module load: Safari 16.0 to 16.3 throws on lookbehind, which must not break the whole app.
  try {
    const cluster = new RegExp(String.raw`^[\p{L}\p{N}](?:[\p{M}‌‍]|(?<=[्্੍્୍்్್്])\p{L})*`, 'u');
    return cluster.exec(word)?.[0] ?? '';
  } catch {
    const first = Array.from(word)[0] ?? '';
    return /^[\p{L}\p{N}]/u.test(first) ? first : '';
  }
}

/** One cluster for a single word, the first clusters of the first two words otherwise. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const picked = words.length > 1 ? [words[0]!, words[1]!] : words.slice(0, 1);
  return picked.map((w) => firstCluster(w)).join('').toLocaleUpperCase();
}

/** Decorative initials; the name is always shown next to it. */
export function Avatar({ id, name, size = 'md' }: { id: string; name: string; size?: keyof typeof SIZES }) {
  const tone = avatarTone(id);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold ${SIZES[size]} ${tone.bg} ${tone.fg}`}
    >
      {initialsOf(name)}
    </span>
  );
}
