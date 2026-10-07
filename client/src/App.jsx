import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './lib/session';
import { CATALOG_TABS } from './constants/catalogs';
import { MASTER_VIEW_ROLES } from './constants/roles';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/home/HomePage';
import Transactions from './pages/transactions/TransactionListPage';
import TransactionDetailPage from './pages/transactions/TransactionDetailPage';
import LobWiseReport from './pages/reports/LobWiseReport';
import OfficeWiseReport from './pages/reports/OfficeWiseReport';
import AgentWiseReport from './pages/reports/AgentWiseReport';
import InsurerWiseReport from './pages/reports/InsurerWiseReport';
import SettingsPage from './pages/settings/SettingsPage';
import ControlCenterLayout from './pages/control-center/ControlCenterLayout';
import CompanyListPage from './pages/control-center/CompanyListPage';
import DepartmentListPage from './pages/control-center/DepartmentListPage';
import AgentListPage from './pages/control-center/AgentListPage';
import CatalogListPage from './pages/control-center/CatalogListPage';

function PublicOnly({ children }) {
  if (isAuthenticated()) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="transactions/:id" element={<TransactionDetailPage />} />
          <Route path="reports">
            <Route index element={<Navigate to="lob-wise" replace />} />
            <Route path="lob-wise" element={<LobWiseReport />} />
            <Route path="office-wise" element={<OfficeWiseReport />} />
            <Route path="agent-wise" element={<AgentWiseReport />} />
            <Route path="insurer-wise" element={<InsurerWiseReport />} />
          </Route>
          <Route path="control-center" element={<ControlCenterLayout />}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<CompanyListPage />} />
            <Route
              path="departments"
              element={
                <ProtectedRoute roles={MASTER_VIEW_ROLES}>
                  <DepartmentListPage />
                </ProtectedRoute>
              }
            />
            {CATALOG_TABS.map(({ slug, label, path }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute roles={MASTER_VIEW_ROLES}>
                    <CatalogListPage key={slug} slug={slug} title={label} />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route
              path="agent"
              element={
                <ProtectedRoute roles={MASTER_VIEW_ROLES}>
                  <AgentListPage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
