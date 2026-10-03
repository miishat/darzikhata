import type { Capability } from '@darzikhata/domain';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { SignInPage } from '../features/auth/SignInPage';
import { WelcomePage } from '../features/welcome/WelcomePage';
import { DesktopShell } from '../shell/DesktopShell';
import { MobileShell } from '../shell/MobileShell';
import { navItem } from '../shell/nav';
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';
import { useShell } from '../shell/ShellPreference';
import { lazyPage } from './lazy';
import { Entry, HomeRedirect, Loading, RequireCapability, RequireShop, RequireStaff } from './guards';

const CustomersPage = lazyPage(() => import('../features/customers/CustomersPage'), 'CustomersPage');
const CustomerForm = lazyPage(() => import('../features/customers/CustomerForm'), 'CustomerForm');
const MeasurementForm = lazyPage(() => import('../features/customers/MeasurementForm'), 'MeasurementForm');
const OrdersPage = lazyPage(() => import('../features/orders/OrdersPage'), 'OrdersPage');
const NewOrderPage = lazyPage(() => import('../features/orders/NewOrderPage'), 'NewOrderPage');
const DashboardPage = lazyPage(() => import('../features/dashboard/DashboardPage'), 'DashboardPage');
const PaymentsPage = lazyPage(() => import('../features/payments/PaymentsPage'), 'PaymentsPage');
const MorePage = lazyPage(() => import('../features/more/MorePage'), 'MorePage');
const ReceiptPage = lazyPage(() => import('../features/print/ReceiptPage'), 'ReceiptPage');
const JobSlipPage = lazyPage(() => import('../features/print/JobSlipPage'), 'JobSlipPage');
const WorkPage = lazyPage(() => import('../features/work/WorkPage'), 'WorkPage');
const FabricTagsPage = lazyPage(() => import('../features/print/FabricTagsPage'), 'FabricTagsPage');
const WorkListPrintPage = lazyPage(() => import('../features/print/WorkListPrintPage'), 'WorkListPrintPage');
const SettingsPage = lazyPage(() => import('../features/settings/SettingsPage'), 'SettingsPage');
const SettingsHome = lazyPage(() => import('../features/settings/SettingsHome'), 'SettingsHome');
const ShopSettings = lazyPage(() => import('../features/settings/ShopSettings'), 'ShopSettings');
const StatusPage = lazyPage(() => import('../features/links/StatusPage'), 'StatusPage');

function AppShell() {
  const { kind } = useShell();
  const current = useCurrentStaff();
  if (!current) return null;
  return kind === 'desktop' ? <DesktopShell role={current.role} /> : <MobileShell role={current.role} />;
}

/** Stands in for a settings section until its screen is built. */
function SectionHeading({ label, anyOf }: { label: MessageKey; anyOf: Capability[] }) {
  const { t } = useI18n();
  return (
    <RequireCapability anyOf={anyOf}>
      <h2 className="text-lg font-semibold">{t(label)}</h2>
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
        <Route
          path="dashboard"
          element={
            <RequireCapability anyOf={navItem('dashboard').requires}>
              <DashboardPage />
            </RequireCapability>
          }
        />
        <Route
          path="orders/new"
          element={
            <RequireCapability anyOf={['orders.create']}>
              <NewOrderPage />
            </RequireCapability>
          }
        />
        <Route
          path="orders/:orderId?"
          element={
            <RequireCapability anyOf={navItem('orders').requires}>
              <OrdersPage />
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
        <Route
          path="work"
          element={
            <RequireCapability anyOf={navItem('work').requires}>
              <WorkPage />
            </RequireCapability>
          }
        />
        <Route
          path="payments"
          element={
            <RequireCapability anyOf={navItem('payments').requires}>
              <PaymentsPage />
            </RequireCapability>
          }
        />
        <Route path="settings" element={<SettingsPage />}>
          <Route index element={<SettingsHome />} />
          <Route
            path="shop"
            element={
              <RequireCapability anyOf={['settings.edit']}>
                <ShopSettings />
              </RequireCapability>
            }
          />
          <Route path="templates" element={<SectionHeading label="settings.templates" anyOf={['settings.edit']} />} />
          <Route path="staff" element={<SectionHeading label="settings.staff" anyOf={['staff.manage']} />} />
          <Route path="branches" element={<SectionHeading label="settings.branches" anyOf={['settings.edit']} />} />
        </Route>
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
      <Route
        path="/print/work"
        element={
          <RequireStaff>
            <RequireCapability anyOf={navItem('work').requires}>
              <Suspense fallback={<Loading />}>
                <WorkListPrintPage />
              </Suspense>
            </RequireCapability>
          </RequireStaff>
        }
      />
      <Route
        path="/s/:token"
        element={
          <Suspense fallback={<Loading />}>
            <StatusPage />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
