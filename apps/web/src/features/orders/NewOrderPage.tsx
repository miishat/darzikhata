import { useNavigate } from 'react-router';
import { useShell } from '../../shell/ShellPreference';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { DesktopOrderForm } from './DesktopOrderForm';
import { MobileOrderSlip } from './MobileOrderSlip';
import { NEW_ORDER_VARIANTS, NewOrderDesktopPrototype } from './NewOrderDesktopPrototype';
import { useOrderEntry } from './useOrderEntry';

/** Enter a new order. Saving opens its receipt. The draft is kept in the browser until it is saved or discarded. */
export function NewOrderPage() {
  const entry = useOrderEntry();
  const navigate = useNavigate();
  const { kind } = useShell();
  const variant = useVariant(Object.keys(NEW_ORDER_VARIANTS));
  const { dialog, allowNextNavigation } = useUnsavedGuard(entry.dirty, entry.persists ? { body: 'entry.unsavedBody', leave: 'entry.unsavedLeave' } : undefined);

  const onSaved = (orderId: string) => {
    allowNextNavigation();
    navigate(`/print/receipt/${orderId}`);
  };
  return (
    <>
      {kind === 'desktop' && variant !== '0' ? (
        <NewOrderDesktopPrototype
          key={`${entry.generation}:${variant}`}
          variant={variant as Exclude<keyof typeof NEW_ORDER_VARIANTS, '0'>}
          entry={entry}
          onSaved={onSaved}
          onDiscarded={() => {
            allowNextNavigation();
            navigate('/app/orders');
          }}
        />
      ) : kind === 'desktop' ? (
        <DesktopOrderForm
          key={entry.generation}
          entry={entry}
          onSaved={onSaved}
          onDiscarded={() => {
            allowNextNavigation();
            navigate('/app/orders');
          }}
        />
      ) : (
        <MobileOrderSlip key={entry.generation} entry={entry} onSaved={onSaved} />
      )}
      {dialog}
      {kind === 'desktop' && <PrototypeSwitcher variants={NEW_ORDER_VARIANTS} />}
    </>
  );
}
