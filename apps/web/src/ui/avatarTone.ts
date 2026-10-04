export interface AvatarTone {
  bg: string;
  fg: string;
}

// Full literal class names so Tailwind can see them. Colours live in index.css tokens.
const TONES: AvatarTone[] = [
  { bg: 'bg-avatar-1-bg', fg: 'text-avatar-1-fg' },
  { bg: 'bg-avatar-2-bg', fg: 'text-avatar-2-fg' },
  { bg: 'bg-avatar-3-bg', fg: 'text-avatar-3-fg' },
  { bg: 'bg-avatar-4-bg', fg: 'text-avatar-4-fg' },
  { bg: 'bg-avatar-5-bg', fg: 'text-avatar-5-fg' },
  { bg: 'bg-avatar-6-bg', fg: 'text-avatar-6-fg' },
];

/** One of six tint pairs from a stable hash of the id. */
export function avatarTone(id: string): AvatarTone {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length]!;
}
