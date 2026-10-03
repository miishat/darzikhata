import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { SignInPage } from '../features/auth/SignInPage';
import { PlaceholderPage } from '../features/PlaceholderPage';
import { WelcomePage } from '../features/welcome/WelcomePage';
import { DesktopShell } from '../shell/DesktopShell';
import { MobileShell } from '../shell/MobileShell';
import { navItem, type NavKey } from '../shell/nav';
import { useShell } from '../shell/ShellPreference';
import { lazyPage } from './lazy';
import { Entry, HomeRedirect, Loading, RequireCapability, RequireShop, RequireStaff } from './guards';

const CustomersPage = lazyPage(() => import('../features/customers/CustomersPage'), 'CustomersPage');
const CustomerForm = lazyPage(() => import('../features/customers/CustomerForm'), 'CustomerForm');
const MeasurementForm = lazyPage(() => import('../features/customers/MeasurementForm'), 'MeasurementForm');
const NewOrderPage = lazyPage(() => import('../features/orders/NewOrderPage'), 'NewOrderPage');
const MorePage = lazyPage(() => import('../features/more/MorePage'), 'MorePage');
const ReceiptPage = lazyPage(() => import('../features/print/ReceiptPage'), 'ReceiptPage');
const JobSlipPage = lazyPage(() => import('../features/print/JobSlipPage'), 'JobSlipPage');
const FabricTagsPage = lazyPage(() => import('../features/print/FabricTagsPage'), 'FabricTagsPage');

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
              <NewOrderPage />
            </RequireCapability>
          }
        />
        <Route
          path="customers/new"
          element={
            <RequireCapability anyOf={['customers.edit']}>
              <CustomerForm />
            </RequireCapability>
          }
        />
        <Route
          path="customers/:customerId/edit"
          element={
            <RequireCapability anyOf={['customers.edit']}>
              <CustomerForm />
            </RequireCapability>
          }
        />
        <Route
          path="customers/:customerId/measure/:templateId"
          element={
            <RequireCapability anyOf={['measurements.edit']}>
              <MeasurementForm />
            </RequireCapability>
          }
        />
        <Route
          path="customers/:customerId?"
          element={
            <RequireCapability anyOf={navItem('customers').requires}>
              <CustomersPage />
            </RequireCapability>
          }
        />
        <Route path="work" element={<Section nav="work" />} />
        <Route path="payments" element={<Section nav="payments" />} />
        <Route path="settings" element={<Section nav="settings" />} />
        <Route path="more" element={<MorePage />} />
      </Route>
      <Route
        path="/print/receipt/:orderId"
        element={
          <RequireStaff>
            <RequireCapability anyOf={['money.view']}>
              <Suspense fallback={<Loading />}>
                <ReceiptPage />
              </Suspense>
            </RequireCapability>
          </RequireStaff>
        }
      />
      <Route
        path="/print/job/:orderId"
        element={
          <RequireStaff>
            <RequireCapability anyOf={['orders.view', 'work.view.all', 'work.view.assigned']}>
              <Suspense fallback={<Loading />}>
                <JobSlipPage />
              </Suspense>
            </RequireCapability>
          </RequireStaff>
        }
      />
      <Route
        path="/print/tags/:orderId"
        element={
          <RequireStaff>
            <RequireCapability anyOf={['orders.view', 'work.view.all', 'work.view.assigned']}>
              <Suspense fallback={<Loading />}>
                <FabricTagsPage />
              </Suspense>
            </RequireCapability>
          </RequireStaff>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
