import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { bn } from './bn';
import { en } from './en';
import { formatDate, formatMoney, translate } from './format';
import { I18nProvider, useI18n } from './I18nProvider';

describe('messages', () => {
  it('have the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(bn).sort());
  });

  it('fill placeholders', () => {
    expect(translate('bn', 'auth.enterPin', { name: 'মিতু' })).toBe('মিতু, আপনার পিন দিন');
    expect(translate('en', 'shell.signedInAs', { name: 'Mitu', role: 'Counter staff' })).toBe('Mitu (Counter staff)');
    expect(translate('en', 'auth.enterPin')).toBe('{name}, enter your PIN');
  });
});

describe('formatting', () => {
  it('formats dates in Bangla and English', () => {
    expect(formatDate('2026-10-03', 'bn')).toBe('৩ অক্টোবর ২০২৬');
    expect(formatDate('2026-10-03', 'en', { year: false })).toBe('3 Oct');
  });

  it('shows timestamps as the Dhaka date', () => {
    expect(formatDate('2026-10-03T19:00:00.000Z', 'en')).toBe('4 Oct 2026');
  });

  it('formats money in the language’s digits', () => {
    expect(formatMoney(240000, 'bn')).toBe('৳২,৪০০');
    expect(formatMoney(240000, 'en')).toBe('৳2,400');
  });
});

function Probe() {
  const { t, money, language, setLanguage } = useI18n();
  return (
    <div>
      <p>{t('nav.orders')}</p>
      <p>{money(140000)}</p>
      <button onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}>toggle</button>
    </div>
  );
}

describe('I18nProvider', () => {
  it('defaults to Bangla and switches language, remembering the choice', async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('অর্ডার')).toBeTruthy();
    expect(screen.getByText('৳১,৪০০')).toBeTruthy();
    expect(document.documentElement.lang).toBe('bn');

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('৳1,400')).toBeTruthy();
    expect(window.localStorage.getItem('dk.language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('starts in the remembered language', () => {
    window.localStorage.setItem('dk.language', 'en');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('Orders')).toBeTruthy();
  });
});
