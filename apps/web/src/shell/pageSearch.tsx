import { createContext, useContext, useEffect, useState, type ReactNode, type RefObject } from 'react';

type Target = RefObject<HTMLInputElement | null> | null;

const TargetContext = createContext<Target>(null);
const SetTargetContext = createContext<((target: Target) => void) | null>(null);

/**
 * Lets a page offer its own search box to the phone header. While a page has one, the header search goes to that box
 * instead of opening a second, full-screen search.
 */
export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Target>(null);
  return (
    <SetTargetContext.Provider value={setTarget}>
      <TargetContext.Provider value={target}>{children}</TargetContext.Provider>
    </SetTargetContext.Provider>
  );
}

/** Offers this search box to the header while the page is shown. Does nothing outside the phone shell. */
export function usePageSearch(input: RefObject<HTMLInputElement | null>) {
  const setTarget = useContext(SetTargetContext);
  useEffect(() => {
    if (!setTarget) return;
    setTarget(input);
    return () => setTarget(null);
  }, [setTarget, input]);
}

/** The search box the current page offers, if any. */
export function usePageSearchTarget(): Target {
  return useContext(TargetContext);
}
