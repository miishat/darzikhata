// PROTOTYPE (throwaway): desktop layouts for the sign-in screen, switched with ?variant=. Never merged.
import { roleOf, shopContact, type Language, type ShopConfig, type Staff } from '@darzikhata/domain';
import { ArrowLeft, Lock } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { Avatar } from '../../ui/Avatar';
import { BrandMark } from '../../ui/BrandMark';
import { Button } from '../../ui/Button';
import { PinPad } from '../../ui/PinPad';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';

export const SIGN_IN_VARIANTS = {
  A: 'Current sign-in',
  B: 'Split screen: a brand panel with the shop name and today on the left, staff tiles then the PIN pad on the right',
  C: 'Lock screen: shop name and a big clock, a row of round faces; pick one and the PIN pad opens under it',
  D: 'One card, two columns: the staff list on the left and the PIN pad always on the right, so it is one step',
  E: 'Grouped by job: owner, counter, cutting, tailors as tile groups across the page; the PIN opens in a dialog',
};

export function useSignInVariant() {
  return useVariant(Object.keys(SIGN_IN_VARIANTS));
}

export function SignInSwitcher() {
  return <PrototypeSwitcher variants={SIGN_IN_VARIANTS} />;
}

const pick = (language: Language, bn: string, en: string) => (language === 'bn' ? bn : en);

export interface SignInScreenProps {
  variant: string;
  config: ShopConfig;
  staff: Staff[];
  chosen: Staff | null;
  error: string | undefined;
  onChoose(person: Staff | null): void;
  onPin(pin: string): void;
  /** Present when someone is already signed in and may go back to the app. */
  onCancel: (() => void) | undefined;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useToday() {
  const { language } = useI18n();
  const now = useNow();
  const locale = language === 'bn' ? 'bn-BD' : 'en-GB';
  return {
    day: now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }),
    time: new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' })
      .formatToParts(now)
      .filter((p) => language === 'en' || p.type !== 'dayPeriod')
      .map((p) => p.value)
      .join('')
      .trim(),
  };
}

function RoleName({ config, person }: { config: ShopConfig; person: Staff }) {
  const { label } = useI18n();
  const role = roleOf(config, person.id);
  return <>{role ? label(role.name) : ''}</>;
}

function Pin({ props }: { props: SignInScreenProps }) {
  const { t } = useI18n();
  return <PinPad key={props.chosen?.id} label={t('pin.label')} error={props.error} onComplete={props.onPin} />;
}

function Demo() {
  const { t } = useI18n();
  return <p className="text-center text-xs text-muted">{t('auth.demoPins')}</p>;
}

function Cancel({ props, className = '' }: { props: SignInScreenProps; className?: string }) {
  const { t } = useI18n();
  if (!props.onCancel) return null;
  return (
    <Button variant="secondary" onClick={props.onCancel} className={className}>
      {t('common.cancel')}
    </Button>
  );
}

/** B: brand panel left, staff then PIN right. */
function Split(props: SignInScreenProps) {
  const { t, language } = useI18n();
  const { config, staff, chosen, onChoose } = props;
  const today = useToday();
  return (
    <main className="grid min-h-dvh grid-cols-[minmax(22rem,2fr)_3fr]">
      <section className="flex flex-col justify-between bg-navy p-10 text-on-navy">
        <div className="flex items-center gap-3">
          <BrandMark size={44} className="rounded-xl ring-2 ring-navy-line" />
          <span className="font-display text-xl font-bold">{pick(language, 'দর্জিখাতা', 'DarziKhata')}</span>
        </div>
        <div>
          <p className="font-display text-5xl font-bold leading-tight">{shopContact(config, language).name}</p>
          <p className="mt-3 text-lg opacity-80">{today.day}</p>
        </div>
        <p className="text-sm text-on-navy-muted">{pick(language, 'একটি ডিভাইস, পুরো দোকান। প্রত্যেকে নিজের পিন দিয়ে ঢোকেন।', 'One device for the whole shop. Everyone signs in with their own PIN.')}</p>
      </section>
      <section className="flex flex-col items-center justify-center gap-6 bg-surface p-10">
        {chosen ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <Avatar id={chosen.id} name={chosen.name} size="xl" />
            <h1 className="text-center text-2xl font-semibold">{t('auth.enterPin', { name: chosen.name })}</h1>
            <Pin props={props} />
            <Button variant="ghost" onClick={() => onChoose(null)}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              {t('auth.back')}
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <h1 className="mb-6 text-3xl font-semibold">{t('auth.whoIsUsing')}</h1>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 p-0">
              {staff.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => onChoose(person)}
                    className="flex w-full flex-col items-center gap-2 rounded-2xl border border-line bg-panel px-3 py-5 text-center shadow-sm hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <Avatar id={person.id} name={person.name} size="lg" />
                    <span className="font-semibold">{person.name}</span>
                    <span className="text-sm text-muted">
                      <RoleName config={config} person={person} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center justify-between gap-4">
              <Demo />
              <Cancel props={props} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/** C: lock screen with a clock and a row of faces. */
function LockScreen(props: SignInScreenProps) {
  const { t, language } = useI18n();
  const { config, staff, chosen, onChoose } = props;
  const today = useToday();
  return (
    <main className="flex min-h-dvh flex-col items-center bg-gradient-to-b from-brand-soft to-surface px-10 pt-[8vh] pb-10">
      <p className="flex items-center gap-2 text-sm font-semibold text-muted">
        <BrandMark size={22} />
        {shopContact(config, language).name}
      </p>
      <p className="mt-6 font-display text-7xl font-bold tabular-nums">{today.time}</p>
      <p className="mt-1 text-lg text-muted">{today.day}</p>
      <h1 className="mt-10 text-xl font-semibold">{chosen ? t('auth.enterPin', { name: chosen.name }) : t('auth.whoIsUsing')}</h1>
      <ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-6 p-0">
        {staff.map((person) => {
          const on = chosen?.id === person.id;
          const dim = chosen !== null && !on;
          return (
            <li key={person.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChoose(on ? null : person)}
                className={`flex w-28 flex-col items-center gap-2 rounded-2xl p-2 text-center transition-opacity focus-visible:outline-2 focus-visible:outline-focus ${dim ? 'opacity-40 hover:opacity-80' : ''}`}
              >
                <span className={`rounded-full ${on ? 'ring-4 ring-brand ring-offset-2 ring-offset-surface' : ''}`}>
                  <Avatar id={person.id} name={person.name} size="xl" />
                </span>
                <span className="text-sm font-semibold">{person.name}</span>
                <span className="text-xs text-muted">
                  <RoleName config={config} person={person} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {chosen && (
        <div className="mt-6 w-full max-w-xs">
          <Pin props={props} />
        </div>
      )}
      <div className="mt-auto flex flex-col items-center gap-3 pt-8">
        <Cancel props={props} />
        <Demo />
      </div>
    </main>
  );
}

/** D: one card, list left and PIN pad right. */
function TwoColumn(props: SignInScreenProps) {
  const { t, language } = useI18n();
  const { config, staff, chosen, onChoose } = props;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-line bg-panel shadow-lg">
        <header className="flex items-center gap-3 border-b border-line px-8 py-5">
          <BrandMark size={40} />
          <div>
            <p className="font-display text-xl font-bold">{shopContact(config, language).name}</p>
            <p className="text-sm text-muted">{t('auth.whoIsUsing')}</p>
          </div>
          <Cancel props={props} className="ms-auto" />
        </header>
        <div className="grid grid-cols-[1fr_22rem]">
          <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-1 overflow-y-auto border-e border-line p-4">
            {staff.map((person) => {
              const on = chosen?.id === person.id;
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChoose(person)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start focus-visible:outline-2 focus-visible:outline-focus ${on ? 'bg-brand text-on-brand' : 'hover:bg-brand-soft'}`}
                  >
                    <Avatar id={person.id} name={person.name} />
                    <span className="flex-1 font-semibold">{person.name}</span>
                    <span className={`text-sm ${on ? 'opacity-80' : 'text-muted'}`}>
                      <RoleName config={config} person={person} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <section className="flex flex-col items-center gap-4 p-8">
            {chosen ? (
              <>
                <h1 className="text-center text-lg font-semibold">{t('auth.enterPin', { name: chosen.name })}</h1>
                <Pin props={props} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted">
                <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Lock aria-hidden="true" className="size-7" />
                </span>
                <h1 className="text-lg font-semibold text-ink">{pick(language, 'বাঁ দিক থেকে আপনার নাম বাছুন', 'Pick your name on the left')}</h1>
                <p className="text-sm">{pick(language, 'তারপর এখানে পিন দিন', 'then enter your PIN here')}</p>
              </div>
            )}
            <Demo />
          </section>
        </div>
      </div>
    </main>
  );
}

/** E: grouped by role, PIN in a dialog. */
function ByJob(props: SignInScreenProps) {
  const { t, label, language } = useI18n();
  const { config, staff, chosen, onChoose } = props;
  const groups = new Map<string, { name: string; people: Staff[] }>();
  for (const person of staff) {
    const role = roleOf(config, person.id);
    const key = role?.id ?? '';
    if (!groups.has(key)) groups.set(key, { name: role ? label(role.name) : '', people: [] });
    groups.get(key)!.people.push(person);
  }
  return (
    <main className="min-h-dvh bg-surface px-12 py-10">
      <header className="mb-10 flex items-center gap-4">
        <BrandMark size={48} />
        <div>
          <p className="font-display text-2xl font-bold">{shopContact(config, language).name}</p>
          <h1 className="text-muted">{t('auth.whoIsUsing')}</h1>
        </div>
        <Cancel props={props} className="ms-auto" />
      </header>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-8">
        {[...groups.values()].map((group) => (
          <section key={group.name} aria-label={group.name}>
            <h2 className="mb-3 text-xs font-bold tracking-wide text-muted uppercase">{group.name}</h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {group.people.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => onChoose(person)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-panel p-3 text-start hover:border-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus"
                  >
                    <Avatar id={person.id} name={person.name} size="lg" />
                    <span className="font-semibold">{person.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="mt-10">
        <Demo />
      </div>
      {chosen && (
        <Dialog onClose={() => onChoose(null)}>
          <div className="flex flex-col items-center gap-4">
            <Avatar id={chosen.id} name={chosen.name} size="xl" />
            <h2 className="text-center text-xl font-semibold">{t('auth.enterPin', { name: chosen.name })}</h2>
            <Pin props={props} />
            <Button variant="ghost" onClick={() => onChoose(null)}>
              {t('auth.back')}
            </Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}

function Dialog({ children, onClose }: { children: ReactNode; onClose(): void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-scrim p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-panel p-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function SignInScreen(props: SignInScreenProps): ReactNode {
  if (props.variant === 'B') return <Split {...props} />;
  if (props.variant === 'C') return <LockScreen {...props} />;
  if (props.variant === 'D') return <TwoColumn {...props} />;
  if (props.variant === 'E') return <ByJob {...props} />;
  return null;
}
