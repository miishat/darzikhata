import { Navigate, Route, Routes } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { SignInPage } from '../features/auth/SignInPage';
import { MorePage } from '../features/more/MorePage';
import { PlaceholderPage } from '../features/PlaceholderPage';
import { WelcomePage } from '../features/welcome/WelcomePage';
import { DesktopShell } from '../shell/DesktopShell';
import { MobileShell } from '../shell/MobileShell';
import { navItem, type NavKey } from '../shell/nav';
import { useShell } from '../shell/ShellPreference';
import { Entry, HomeRedirect, RequireCapability, RequireShop, RequireStaff } from './guards';

function AppShell() {
  const { kind } = useShell();
  const current = useCurrentStaff();
  if (!current) return null;
  return kind === 'desktop' ? <DesktopShell role={current.role} /> : <MobileShell role={current.role} />;
}

function Section({ nav }: { nav: NavKey }) {
  const item = navItem(nav);
  return (
    <RequireCapability anyOf={item.requires}>
      <PlaceholderPage title={item.label} />
    </RequireCapability>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route
        path="/sign-in"
        element={
          <RequireShop>
            <SignInPage />
          </RequireShop>
        }
      />
      <Route
        path="/app"
        element={
          <RequireStaff>
            <AppShell />
          </RequireStaff>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Section nav="dashboard" />} />
        <Route path="orders" element={<Section nav="orders" />} />
        <Route
          path="orders/new"
          element={
            <RequireCapability anyOf={['orders.create']}>
              <PlaceholderPage title="nav.newOrder" />
            </RequireCapability>
          }
        />
        <Route path="customers" element={<Section nav="customers" />} />
        <Route path="work" element={<Section nav="work" />} />
        <Route path="payments" element={<Section nav="payments" />} />
        <Route path="settings" element={<Section nav="settings" />} />
        <Route path="more" element={<MorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
