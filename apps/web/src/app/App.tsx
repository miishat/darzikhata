import { BranchScopeProvider } from '../features/branches/BranchScopeProvider';
import { StoreProvider } from '../data/StoreContext';
import type { ShopStore } from '../data/store';
import { PresenterProvider, PresenterRoot } from '../features/presenter/PresenterSetting';
import { I18nProvider } from '../i18n/I18nProvider';
import { ShellProvider } from '../shell/ShellPreference';
import { AppRoutes } from './AppRoutes';

/** Everything except the router, so tests can supply a MemoryRouter. */
export function App({ store }: { store: ShopStore }) {
  return (
    <StoreProvider store={store}>
      <I18nProvider>
        <BranchScopeProvider>
          <ShellProvider>
            <PresenterProvider>
              <AppRoutes />
              <PresenterRoot />
            </PresenterProvider>
          </ShellProvider>
        </BranchScopeProvider>
      </I18nProvider>
    </StoreProvider>
  );
}
