import { avatarTone } from './avatarTone';

const SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-xl', xl: 'size-[72px] text-3xl' };

/** One letter with its attached vowel signs and marks, so "মোহাম্মদ" gives "মো". */
function firstCluster(word: string): string {
  return /^[\p{L}\p{N}]\p{M}*/u.exec(word)?.[0] ?? '';
}

/** One cluster for a single word, the first clusters of the first two words otherwise. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const picked = words.length > 1 ? [words[0]!, words[1]!] : words.slice(0, 1);
  return picked.map(firstCluster).join('').toLocaleUpperCase();
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
