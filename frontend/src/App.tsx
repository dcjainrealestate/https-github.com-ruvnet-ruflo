import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TwoFactorSetupPage } from './pages/TwoFactorSetupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventoryFormPage } from './pages/InventoryFormPage';
import { UsersAdminPage } from './pages/admin/UsersAdminPage';
import { FieldOptionsAdminPage } from './pages/admin/FieldOptionsAdminPage';
import { DependentFieldsAdminPage } from './pages/admin/DependentFieldsAdminPage';
import { FieldVisibilityAdminPage } from './pages/admin/FieldVisibilityAdminPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';

const ADMIN_ONLY = ['SUPER_ADMIN', 'ADMIN'] as const;

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/2fa-setup" element={<TwoFactorSetupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="/inventory"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/new"
          element={
            <ProtectedRoute>
              <Layout>
                <InventoryFormPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <InventoryFormPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}>
              <Layout>
                <UsersAdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/field-options"
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}>
              <Layout>
                <FieldOptionsAdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dependent-fields"
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}>
              <Layout>
                <DependentFieldsAdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/field-visibility"
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}>
              <Layout>
                <FieldVisibilityAdminPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_ONLY]}>
              <Layout>
                <AuditLogPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/inventory" replace />} />
        <Route path="*" element={<Navigate to="/inventory" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
