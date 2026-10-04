import { useNavigate } from 'react-router';
import { useShell } from '../../shell/ShellPreference';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { DesktopOrderForm } from './DesktopOrderForm';
import { MobileOrderSteps } from './MobileOrderSteps';
import { useOrderEntry } from './useOrderEntry';

/** Enter a new order. Saving opens its receipt. The draft is kept in the browser until it is saved or discarded. */
export function NewOrderPage() {
  const entry = useOrderEntry();
  const navigate = useNavigate();
  const { kind } = useShell();
  const { dialog, allowNextNavigation } = useUnsavedGuard(entry.dirty, { body: 'entry.unsavedBody', leave: 'entry.unsavedLeave' });

  const onSaved = (orderId: string) => {
    allowNextNavigation();
    navigate(`/print/receipt/${orderId}`);
  };
  return (
    <>
      {kind === 'desktop' ? (
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
        <MobileOrderSteps key={entry.generation} entry={entry} onSaved={onSaved} />
      )}
      {dialog}
    </>
  );
}
