import { can, type Role } from '@darzikhata/domain';
import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router';
import { useScopedState } from '../features/branches/BranchScopeProvider';
import { globalSearch, type SearchHit } from '../features/search/globalSearch';
import { useI18n } from '../i18n/I18nProvider';

const MAX_OPTIONS = 8;

function hitPath(hit: SearchHit): string {
  return hit.kind === 'order' ? `/app/orders/${hit.order.id}` : `/app/customers/${hit.customer.id}`;
}

function hitLabel(hit: SearchHit): string {
  if (hit.kind === 'order') return hit.customer ? `${hit.order.number} · ${hit.customer.name}` : hit.order.number;
  return hit.customer.phone ? `${hit.customer.name} · ${hit.customer.phone}` : hit.customer.name;
}

/** The top-bar search box: orders by number, customers by name or phone. */
export function GlobalSearch({ role, inputRef }: { role: Role; inputRef: RefObject<HTMLInputElement | null> }) {
  const { t } = useI18n();
  const state = useScopedState();
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const canOrders = can(role, 'orders.view');
  const canCustomers = can(role, 'customers.view');

  const hits = useMemo(
    () =>
      globalSearch(state, query, 50)
        .filter((hit) => (hit.kind === 'order' ? canOrders : canCustomers))
        .slice(0, MAX_OPTIONS),
    [state, query, canOrders, canCustomers],
  );

  if (!canOrders && !canCustomers) return null;

  const showList = open && query.trim() !== '';
  const optionId = (index: number) => `${listId}-${index}`;

  const choose = (hit: SearchHit) => {
    setQuery('');
    setOpen(false);
    setActive(-1);
    navigate(hitPath(hit));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'ArrowDown' && hits.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === 'ArrowUp' && hits.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === 'Enter' && showList && hits[active]) {
      e.preventDefault();
      choose(hits[active]);
    }
  };

  return (
    <div className="relative w-72">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={t('search.label')}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 && hits[active] ? optionId(active) : undefined}
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-brand"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('search.label')}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-96 overflow-auto rounded-lg border border-line bg-panel py-1 shadow-lg"
        >
          {hits.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-muted">
              {t('search.none')}
            </li>
          ) : (
            hits.map((hit, index) => (
              <li
                key={hit.kind === 'order' ? `o-${hit.order.id}` : `c-${hit.customer.id}`}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(hit)}
                className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-surface'}`}
              >
                {hitLabel(hit)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
