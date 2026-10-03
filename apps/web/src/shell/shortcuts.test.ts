import { afterEach, describe, expect, it } from 'vitest';
import { shortcutFor, type ShortcutEvent } from './shortcuts';

const press = (key: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  target: document.body,
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shortcutFor', () => {
  it('maps "/" to search and N to a new order', () => {
    expect(shortcutFor(press('/'))).toBe('search');
    expect(shortcutFor(press('n'))).toBe('newOrder');
    expect(shortcutFor(press('N'))).toBe('newOrder');
    expect(shortcutFor(press('x'))).toBeNull();
  });

  it('stays out of the way of browser and OS shortcuts', () => {
    expect(shortcutFor(press('n', { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(press('n', { metaKey: true }))).toBeNull();
    expect(shortcutFor(press('/', { altKey: true }))).toBeNull();
    expect(shortcutFor(press('/', { defaultPrevented: true }))).toBeNull();
  });

  it('never fires while typing', () => {
    document.body.innerHTML = '<input id="i" /><textarea id="t"></textarea><select id="s"></select><div id="e" contenteditable="true"><b id="b">x</b></div>';
    for (const id of ['i', 't', 's', 'b']) {
      expect(shortcutFor(press('n', { target: document.getElementById(id) }))).toBeNull();
    }
  });

  it('ignores auto-repeat from a held key', () => {
    expect(shortcutFor(press('n', { repeat: true }))).toBeNull();
    expect(shortcutFor(press('/', { repeat: true }))).toBeNull();
  });

  it('ignores keys pressed during IME composition', () => {
    expect(shortcutFor(press('n', { isComposing: true }))).toBeNull();
  });

  it('does nothing while a dialog is open', () => {
    document.body.innerHTML = '<div role="dialog"></div>';
    expect(shortcutFor(press('/'))).toBeNull();
  });
});
