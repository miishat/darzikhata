import { useRef, useState } from 'react';
import { MotionSwitcher, usePanelMotion, vtName } from '../../shell/PanelMotionPrototype';
import { useParams } from 'react-router';
import { useShell } from '../../shell/ShellPreference';
import { CustomerDirectory } from './CustomerDirectory';
import { CustomerList } from './CustomerList';
import { CustomerProfile } from './CustomerProfile';

const CARD = 'flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-sm';

/**
 * Desktop: the directory fills the page; opening a customer narrows it to a column beside their
 * profile. Both are cards as tall as the window that scroll on their own. Mobile: one at a time.
 */
export function CustomersPage() {
  const { kind } = useShell();
  const { customerId } = useParams();
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const motion = usePanelMotion(kind === 'desktop' && Boolean(customerId), listRef, panelRef, 'list');

  if (kind === 'mobile') {
    return customerId ? <CustomerProfile customerId={customerId} /> : <CustomerList query={query} onQueryChange={setQuery} />;
  }

  return (
    // The window less the shell header (3.5rem) and the page padding (2 × 1.5rem).
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-96 gap-4">
      <MotionSwitcher />
      <div ref={listRef} {...vtName(motion, 'vt-list')} className={`flex min-h-0 flex-col ${customerId ? 'w-[360px] shrink-0' : 'min-w-0 flex-1'}`}>
        <CustomerDirectory query={query} onQueryChange={setQuery} activeId={customerId} compact={Boolean(customerId)} />
      </div>
      {customerId && (
        <div ref={panelRef} {...vtName(motion, 'vt-panel')} className={`${CARD} min-w-0 flex-1`}>
          <CustomerProfile customerId={customerId} />
        </div>
      )}
    </div>
  );
}
