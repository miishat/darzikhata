import { useNavigate } from 'react-router';
import { useShell } from '../../shell/ShellPreference';
import { useUnsavedGuard } from '../../ui/useUnsavedGuard';
import { DesktopOrderForm } from './DesktopOrderForm';
import { MobileOrderSteps } from './MobileOrderSteps';
import { useOrderEntry } from './useOrderEntry';
import { NEW_ORDER_VARIANTS, VariantB, VariantC, VariantD, VariantE } from './NewOrderDesktopPrototype';
import { PrototypeSwitcher, useVariant } from '../../ui/PrototypeSwitcher';

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
      {kind === 'desktop' && variant !== 'A' ? (
        (() => {
          const k = `${variant}-${entry.generation}`;
          const props = { entry, onSaved, onDiscarded: () => { allowNextNavigation(); navigate('/app/orders'); } };
          if (variant === 'B') return <VariantB key={k} {...props} />;
          if (variant === 'C') return <VariantC key={k} {...props} />;
          if (variant === 'D') return <VariantD key={k} {...props} />;
          return <VariantE key={k} {...props} />;
        })()
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
        <MobileOrderSteps key={entry.generation} entry={entry} onSaved={onSaved} />
      )}
      {dialog}
      {kind === 'desktop' && <PrototypeSwitcher variants={NEW_ORDER_VARIANTS} />}
    </>
  );
}
