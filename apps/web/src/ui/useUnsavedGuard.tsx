import { SaveOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';
import { useShellKind } from '../shell/ShellPreference';
import { Button } from './Button';
import { Dialog } from './Dialog';

/**
 * Asks before leaving a screen with unsaved changes, for in-app navigation and for closing
 * or reloading the tab. Call allowNextNavigation() right before navigating away after a save,
 * because the save's own navigation happens before React re-renders with dirty = false.
 */
export function useUnsavedGuard(dirty: boolean, wording?: { body: MessageKey; leave: MessageKey }) {
  const allowed = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const dialog = (
    <UnsavedDialog
      open={blocker.state === 'blocked'}
      onStay={() => blocker.reset?.()}
      onLeave={() => blocker.proceed?.()}
      wording={wording}
    />
  );
  return { dialog, allowNextNavigation: () => (allowed.current = true) };
}

function UnsavedDialog({
  open,
  onStay,
  onLeave,
  wording,
}: {
  open: boolean;
  onStay(): void;
  onLeave(): void;
  wording: { body: MessageKey; leave: MessageKey } | undefined;
}) {
  const { t } = useI18n();
  const phone = useShellKind() === 'mobile';
  const leaveLabel = t(wording?.leave ?? 'unsaved.leave');
  const bodyText = t(wording?.body ?? 'unsaved.body');
  // On a phone: an icon, a big Stay button and Leave as quiet red text under it, so Stay is the easy tap.
  if (phone) {
    const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
    return (
      <Dialog open={open} title={t('unsaved.title')} onClose={onStay} hideTitle>
        <div className="pt-3 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand-strong">
            <SaveOff aria-hidden="true" size={26} />
          </span>
          <p aria-hidden="true" className="mt-3 font-display text-xl font-bold text-ink">
            {t('unsaved.title')}
          </p>
          <p className="mt-1">{bodyText}</p>
          <button type="button" data-autofocus onClick={onStay} className={`mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-brand text-base font-bold text-on-brand ${focus}`}>
            {t('unsaved.stay')}
          </button>
          <button type="button" onClick={onLeave} className={`mt-2 flex h-12 w-full items-center justify-center rounded-2xl text-base font-semibold text-danger ${focus}`}>
            {leaveLabel}
          </button>
        </div>
      </Dialog>
    );
  }
  return (
    <Dialog
      open={open}
      title={t('unsaved.title')}
      onClose={onStay}
      actions={
        <>
          <Button variant="secondary" onClick={onStay}>
            {t('unsaved.stay')}
          </Button>
          <Button variant="danger" onClick={onLeave}>
            {leaveLabel}
          </Button>
        </>
      }
    >
      {bodyText}
    </Dialog>
  );
}
