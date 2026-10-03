import { useNavigate } from 'react-router';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { MobileOrderSteps } from './MobileOrderSteps';
import { useOrderEntry } from './useOrderEntry';

/** Enter a new order. Saving opens its receipt. */
export function NewOrderPage() {
  const entry = useOrderEntry();
  const navigate = useNavigate();
  const { dialog, allowNextNavigation } = useUnsavedGuard(entry.dirty);

  // The step-by-step layout serves every screen until the desktop form arrives.
  return (
    <>
      <MobileOrderSteps
        entry={entry}
        onSaved={(orderId) => {
          allowNextNavigation();
          navigate(`/print/receipt/${orderId}`);
        }}
      />
      {dialog}
    </>
  );
}
