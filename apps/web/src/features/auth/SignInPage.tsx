import { roleOf, type Staff } from '@darzikhata/domain';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { BrandMark } from '../../ui/BrandMark';
import { Button } from '../../ui/Button';
import { PinPad } from '../../ui/PinPad';
import { useShell } from '../../shell/ShellPreference';
import { SignInScreen, SignInSwitcher, useSignInVariant } from './SignInPrototype';

/** "Who is using this device?" then a PIN, for shops that share one phone or computer. */
export function SignInPage() {
  const { t, label } = useI18n();
  const { config } = useSnapshot();
  const store = useStore();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  const [chosen, setChosen] = useState<Staff | null>(null);
  const [error, setError] = useState<string | undefined>();
  const { kind } = useShell();
  const variant = useSignInVariant();

  if (!config) return null;
  const staff = config.staff.filter((s) => s.active);

  const submit = async (pin: string) => {
    if (!chosen) return;
    if (await store.signIn(chosen.id, pin)) navigate('/app');
    else setError(t('auth.wrongPin'));
  };

  if (kind === 'desktop' && variant !== 'A') {
    return (
      <>
        <SignInSwitcher />
        <SignInScreen
          variant={variant}
          config={config}
          staff={staff}
          chosen={chosen}
          error={error}
          onChoose={(person) => {
            setChosen(person);
            setError(undefined);
          }}
          onPin={submit}
          onCancel={current ? () => navigate('/app') : undefined}
        />
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-10">
      <BrandMark size={56} />
      <h1 className="text-2xl font-semibold">{chosen ? t('auth.enterPin', { name: chosen.name }) : t('auth.whoIsUsing')}</h1>
      {chosen ? (
        <>
          <PinPad label={t('pin.label')} error={error} onComplete={submit} />
          <Button
            variant="ghost"
            onClick={() => {
              setChosen(null);
              setError(undefined);
            }}
          >
            {t('auth.back')}
          </Button>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((person) => {
            const role = roleOf(config, person.id);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => setChosen(person)}
                  className="flex min-h-14 w-full items-center justify-between rounded-xl border border-line bg-panel px-4 text-left hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span className="font-semibold">{person.name}</span>
                  <span className="text-sm text-muted">{role ? label(role.name) : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {current && !chosen && (
        <Button variant="secondary" onClick={() => navigate('/app')}>
          {t('common.cancel')}
        </Button>
      )}
      <p className="text-sm text-muted">{t('auth.demoPins')}</p>
      {kind === 'desktop' && <SignInSwitcher />}
    </main>
  );
}
