import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';
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
            {t(wording?.leave ?? 'unsaved.leave')}
          </Button>
        </>
      }
    >
      {t(wording?.body ?? 'unsaved.body')}
    </Dialog>
  );
}
