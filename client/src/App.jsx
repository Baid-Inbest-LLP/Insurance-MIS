import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './lib/session';
import { DEPARTMENT_VIEW_ROLES } from './constants/roles';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/home/HomePage';
import SettingsPage from './pages/settings/SettingsPage';
import ControlCenterLayout from './pages/control-center/ControlCenterLayout';
import CompanyListPage from './pages/control-center/CompanyListPage';
import DepartmentListPage from './pages/control-center/DepartmentListPage';

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
          <Route path="control-center" element={<ControlCenterLayout />}>
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="companies" element={<CompanyListPage />} />
            <Route
              path="departments"
              element={
                <ProtectedRoute roles={DEPARTMENT_VIEW_ROLES}>
                  <DepartmentListPage />
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
