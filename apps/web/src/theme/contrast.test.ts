import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_SURFACE } from '../shell/theme';

const css = readFileSync(resolvePath(__dirname, '../index.css'), 'utf8');
const html = readFileSync(resolvePath(__dirname, '../../index.html'), 'utf8');

type TokenMap = Record<string, string>;

/** Returns the text between the braces of the block whose selector starts at `start`. */
function bodyAt(start: number): string {
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error('unbalanced braces in index.css');
}

function tokens(body: string): TokenMap {
  const map: TokenMap = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map[m[1]!.slice(2)] = m[2]!.trim();
  return map;
}

function blockAfter(selector: string, from = 0): TokenMap {
  const at = css.indexOf(selector, from);
  if (at < 0) throw new Error(`selector not found: ${selector}`);
  return tokens(bodyAt(at));
}

const light = blockAfter('\n:root {');
const darkMedia = blockAfter(':root:not([data-theme=\'light\']) {', css.indexOf('prefers-color-scheme: dark'));
const darkAttr = blockAfter(':root[data-theme=\'dark\'] {');

function resolve(name: string, theme: 'light' | 'dark', depth = 0): string {
  if (depth > 10) throw new Error(`var cycle at ${name}`);
  const own = theme === 'dark' ? darkAttr[name] : undefined;
  const value = own ?? light[name];
  if (value === undefined) throw new Error(`token --${name} missing in ${theme}`);
  const ref = /^var\(--([\w-]+)\)$/.exec(value);
  return ref ? resolve(ref[1]!, theme, depth + 1) : value;
}

function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string, theme: 'light' | 'dark'): number {
  const a = luminance(resolve(fg, theme));
  const b = luminance(resolve(bg, theme));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const stages = ['booked', 'cutting', 'working', 'trial', 'ready', 'done', 'cancelled'];
const avatars = [1, 2, 3, 4, 5, 6];

type Pair = { fg: string; bg: string; min: number };
const pair = (fg: string, bgs: string[], min: number): Pair[] => bgs.map((bg) => ({ fg, bg, min }));

const pairs: Pair[] = [
  ...pair('ink', ['surface', 'panel', 'panel-raised'], 4.5),
  ...pair('muted', ['surface', 'panel', 'panel-raised'], 4.5),
  ...pair('on-brand', ['brand', 'brand-hover'], 4.5),
  ...pair('brand-strong', ['panel', 'panel-raised'], 4.5),
  ...pair('on-navy', ['navy', 'navy-raised'], 4.5),
  ...pair('on-navy-muted', ['navy', 'navy-raised'], 4.5),
  ...pair('on-chip-selected', ['chip-selected'], 4.5),
  ...pair('on-chip-selected-muted', ['chip-selected'], 4.5),
  ...pair('warn', ['panel'], 4.5),
  ...pair('warn-ink', ['panel', 'panel-raised', 'warn-soft'], 4.5),
  ...pair('ok', ['panel'], 4.5),
  ...pair('danger', ['panel', 'panel-raised'], 4.5),
  ...stages.flatMap((s) => pair(`tone-${s}-fg`, [`tone-${s}-bg`], 4.5)),
  ...avatars.flatMap((n) => pair(`avatar-${n}-fg`, [`avatar-${n}-bg`], 4.5)),
  ...pair('focus', ['surface', 'panel'], 3),
  ...pair('brand', ['panel'], 3),
  // The welcome title is large text (24px semibold), so 3:1 applies.
  ...pair('brand', ['surface'], 3),
  ...pair('ok', ['paid-track'], 3),
  // Controller additions: selected rows and active nav, and the danger button.
  ...pair('brand-strong', ['brand-soft'], 4.5),
  ...pair('ink', ['brand-soft'], 4.5),
  ...pair('on-danger', ['danger'], 4.5),
];

describe('theme blocks', () => {
  it('keeps the two dark blocks identical', () => {
    expect(Object.keys(darkMedia).sort()).toEqual(Object.keys(darkAttr).sort());
    expect(darkMedia).toEqual(darkAttr);
    expect(Object.keys(darkAttr).length).toBeGreaterThan(40);
  });

  it('defines every light token in both dark blocks (no silent fallback to light values)', () => {
    const names = Object.keys(light).sort();
    expect(Object.keys(darkAttr).sort()).toEqual(names);
    expect(Object.keys(darkMedia).sort()).toEqual(names);
  });
});

describe.each(['light', 'dark'] as const)('contrast in %s', (theme) => {
  it.each(pairs)(
    '$fg on $bg is at least $min:1',
    ({ fg, bg, min }) => {
      expect(ratio(fg, bg, theme)).toBeGreaterThanOrEqual(min);
    },
  );
});

describe('browser bar colour', () => {
  it('THEME_SURFACE matches the surface token in both themes', () => {
    expect(THEME_SURFACE.light).toBe(resolve('surface', 'light'));
    expect(THEME_SURFACE.dark).toBe(resolve('surface', 'dark'));
  });

  it('index.html theme-color metas match the surface tokens', () => {
    const meta = (scheme: string) =>
      new RegExp(`<meta name="theme-color" media="\\(prefers-color-scheme: ${scheme}\\)" content="(#[0-9a-fA-F]+)"`).exec(
        html,
      )?.[1];
    expect(meta('light')).toBe(resolve('surface', 'light'));
    expect(meta('dark')).toBe(resolve('surface', 'dark'));
  });
});

describe('new tokens', () => {
  const withDark = [
    'brand-hover',
    'focus',
    'panel-raised',
    'navy-line',
    'chip-selected',
    'on-chip-selected',
    'on-chip-selected-muted',
    'warn-line',
    'paid-track',
    'scrim',
    'raised-line',
    'on-danger',
  ];

  it.each(withDark)('--%s exists in light and in both dark blocks', (name) => {
    expect(light[name]).toBeTruthy();
    expect(darkMedia[name]).toBeTruthy();
    expect(darkAttr[name]).toBeTruthy();
  });

  it('raised-line is transparent in light and equals line in dark', () => {
    expect(light['raised-line']).toBe('transparent');
    expect(darkAttr['raised-line']).toBe(darkAttr['line']);
    expect(darkMedia['raised-line']).toBe(darkMedia['line']);
  });
});

describe('print block', () => {
  it('forces light paper even when Device follows a dark phone', () => {
    const at = css.indexOf('@media print');
    const afterMedia = css.slice(css.indexOf('{', at) + 1);
    const selector = afterMedia.slice(0, afterMedia.indexOf('{')).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    // The dark media block is `:root:not(...)` (two classes of weight); a bare `:root` would lose to it.
    expect(selector).toContain(':root:root');
    expect(blockAfter(':root:root,', at)['surface']).toBe('#ffffff');
  });
});
