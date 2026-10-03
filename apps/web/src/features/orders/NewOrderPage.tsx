import { useNavigate } from 'react-router';
import { useShell } from '../../shell/ShellPreference';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { DesktopOrderForm } from './DesktopOrderForm';
import { MobileOrderSteps } from './MobileOrderSteps';
import { useOrderEntry } from './useOrderEntry';

/** Enter a new order. Saving opens its receipt. */
export function NewOrderPage() {
  const entry = useOrderEntry();
  const navigate = useNavigate();
  const { kind } = useShell();
  const { dialog, allowNextNavigation } = useUnsavedGuard(entry.dirty);

  const Layout = kind === 'desktop' ? DesktopOrderForm : MobileOrderSteps;
  return (
    <>
      <Layout
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
