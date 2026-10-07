import { roleOf, shopContact, toEnglishDigits, type ShopConfig, type Staff } from '@darzikhata/domain';
import { Delete, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatDayDate, formatTime } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { BrandMark } from '../../ui/BrandMark';

export interface DesktopSignInProps {
  config: ShopConfig;
  staff: Staff[];
  chosen: Staff | null;
  error: string | undefined;
  onChoose(person: Staff | null): void;
  onPin(pin: string): void;
  /** Present when someone is already signed in and may go back to the app. */
  onCancel: (() => void) | undefined;
}

const PIN_LENGTH = 4;

/**
 * The desktop sign-in as a lock screen: the shop name, the time and today's date, then everyone's face in a row.
 * Picking a face rings it, dims the others and opens the number pad under it; the PIN can also be typed on the
 * keyboard straight away. Picking another face switches person, and a round close button goes back to the app.
 */
export function DesktopSignIn({ config, staff, chosen, error, onChoose, onPin, onCancel }: DesktopSignInProps) {
  const { t, language, label } = useI18n();
  const now = useNow();
  const iso = now.toISOString();

  return (
    <main className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-brand-soft to-surface px-10 pt-[7vh] pb-10">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label={t('auth.backToApp')}
          title={t('auth.backToApp')}
          className="fixed end-6 top-6 flex size-11 items-center justify-center rounded-full border border-line bg-panel text-muted shadow-sm hover:text-ink focus-visible:outline-2 focus-visible:outline-focus"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      )}
      <p className="flex items-center gap-2.5 font-display text-2xl font-bold">
        <BrandMark size={32} />
        {shopContact(config, language).name}
      </p>
      <p className="mt-6 font-display text-7xl font-bold tabular-nums">{formatTime(iso, language)}</p>
      <p className="mt-1 text-lg text-muted">{formatDayDate(iso, language)}</p>
      <h1 className="mt-10 text-xl font-semibold">{chosen ? t('auth.enterPin', { name: chosen.name }) : t('auth.whoIsUsing')}</h1>
      <ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-6 p-0">
        {staff.map((person) => {
          const on = chosen?.id === person.id;
          const role = roleOf(config, person.id);
          return (
            <li key={person.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChoose(on ? null : person)}
                className={`flex w-28 flex-col items-center gap-2 rounded-2xl p-2 text-center transition-opacity focus-visible:outline-2 focus-visible:outline-focus ${chosen && !on ? 'opacity-40 hover:opacity-80' : ''}`}
              >
                <span className={`rounded-full ${on ? 'ring-4 ring-brand ring-offset-2 ring-offset-surface' : ''}`}>
                  <Avatar id={person.id} name={person.name} size="xl" />
                </span>
                <span className="text-sm font-semibold">{person.name}</span>
                <span className="text-xs text-muted">{role ? label(role.name) : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && <Keypad key={chosen.id} error={error} onComplete={onPin} />}
      <p className="mt-auto pt-8 text-center text-xs text-muted">{t('auth.demoPins')}</p>
    </main>
  );
}

/** The clock, ticking over each minute. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Every key a real key, the delete key bordered like the digits. Typed digits in either script work too. */
function Keypad({ error, onComplete }: { error: string | undefined; onComplete(pin: string): void }) {
  const { t, number } = useI18n();
  const [digits, setDigits] = useState('');

  const press = (digit: string) => {
    const next = digits + digit;
    if (next.length >= PIN_LENGTH) {
      setDigits('');
      onComplete(next.slice(0, PIN_LENGTH));
    } else {
      setDigits(next);
    }
  };
  const remove = () => setDigits((d) => d.slice(0, -1));

  // Re-bound each render so the listener sees the current digits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches('input,textarea,select,[contenteditable]')) return;
      const digit = toEnglishDigits(e.key);
      if (/^\d$/.test(digit)) {
        e.preventDefault();
        press(digit);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        remove();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const key = 'min-h-14 rounded-xl border border-line bg-panel text-2xl font-semibold hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus';
  return (
    <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
      <div className="flex justify-center gap-3" aria-hidden="true">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={`size-4 rounded-full border-2 border-brand ${i < digits.length ? 'bg-brand' : ''}`} />
        ))}
      </div>
      <p aria-live="polite" className="min-h-5 text-center text-sm text-danger">
        {error}
      </p>
      <div role="group" aria-label={t('pin.label')} className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} className={key}>
            {number(Number(d))}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press('0')} className={key}>
          {number(0)}
        </button>
        <button type="button" aria-label={t('pin.delete')} onClick={remove} className={`${key} flex items-center justify-center text-muted`}>
          <Delete aria-hidden="true" className="size-6" />
        </button>
      </div>
    </div>
  );
}
