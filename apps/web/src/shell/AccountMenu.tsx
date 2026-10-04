import { useNavigate } from 'react-router';
import { MoreContent } from '../features/more/MoreContent';
import { useCurrentStaff } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

/** The phone's account sheet: who is signed in, switch user, payments and settings when permitted, and everything on the More page. */
export function AccountMenu({ open, onClose }: { open: boolean; onClose(): void }) {
  const { t, label } = useI18n();
  const current = useCurrentStaff();
  const navigate = useNavigate();
  return (
    <Dialog
      open={open}
      title={t('shell.account')}
      onClose={onClose}
      actions={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <div className="flex flex-col gap-4 text-ink">
        {current && (
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm">{t('shell.signedInAs', { name: current.staff.name, role: label(current.role.name) })}</p>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => {
                onClose();
                navigate('/sign-in');
              }}
            >
              {t('shell.switchUser')}
            </Button>
          </div>
        )}
        <MoreContent onNavigate={onClose} />
      </div>
    </Dialog>
  );
}
