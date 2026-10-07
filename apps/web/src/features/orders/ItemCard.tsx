import { type Order, type OrderItem } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { problemText } from '../common/problemText';
import { usePhoto } from './usePhoto';

/** A garment photo as a small square, with a grey box while it loads. */
export function Thumb({ id, alt }: { id: string; alt: string }) {
  const url = usePhoto(id);
  if (!url) return <div className="h-20 w-20 rounded bg-surface" aria-hidden="true" />;
  return <img src={url} alt={alt} className="h-20 w-20 rounded object-cover" />;
}

/** The one-tap move to the next stage. A failure is shown beside the button. */
export function MoveOn({
  order,
  item,
  stageKey,
  label,
  render,
}: {
  order: Order;
  item: OrderItem;
  stageKey: string;
  label: string;
  /** Draws the button itself, for layouts that style it differently. */
  render?: (props: { disabled: boolean; onClick(): void; children: ReactNode }) => ReactNode;
}) {
  const store = useStore();
  const { language } = useI18n();
  const [problem, setProblem] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const move = async () => {
    setWorking(true);
    setProblem(null);
    try {
      const outcome = await store.dispatch({ type: 'item.stageChanged', orderId: order.id, itemId: item.id, to: stageKey, reason: '' });
      setProblem(problemText(outcome, language));
    } finally {
      setWorking(false);
    }
  };
  return (
    <>
      {render ? (
        render({ disabled: working, onClick: () => void move(), children: label })
      ) : (
        <Button disabled={working} onClick={() => void move()}>
          {label}
        </Button>
      )}
      {problem && (
        <p role="alert" className="w-full text-danger">
          {problem}
        </p>
      )}
    </>
  );
}
