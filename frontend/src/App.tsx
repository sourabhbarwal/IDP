import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ServiceListPage from './pages/catalog/ServiceListPage';
import CreateServicePage from './pages/catalog/CreateServicePage';
import ServiceDetailPage from './pages/catalog/ServiceDetailPage';
import TemplateGalleryPage from './pages/templates/TemplateGalleryPage';
import MonitoringPage from './pages/monitoring/MonitoringPage';
import AlertsPage from './pages/alerts/AlertsPage';
import CostPage from './pages/cost/CostPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import CopilotPage from './pages/copilot/CopilotPage';
import DoraPage from './pages/dora/DoraPage';
import UserManagementPage from './pages/admin/UserManagementPage';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/register"    element={<RegisterPage />} />
        <Route path="/dashboard"   element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/catalog"     element={<ProtectedRoute><ServiceListPage /></ProtectedRoute>} />
        <Route path="/catalog/new" element={<ProtectedRoute><CreateServicePage /></ProtectedRoute>} />
        <Route path="/catalog/:id" element={<ProtectedRoute><ServiceDetailPage /></ProtectedRoute>} />
        <Route path="/templates"   element={<ProtectedRoute><TemplateGalleryPage /></ProtectedRoute>} />
        <Route path="/monitoring"  element={<ProtectedRoute><MonitoringPage /></ProtectedRoute>} />
        <Route path="/alerts"      element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
        <Route path="/cost"        element={<ProtectedRoute><CostPage /></ProtectedRoute>} />
        <Route path="/copilot"     element={<ProtectedRoute><CopilotPage /></ProtectedRoute>} />
        <Route path="/dora" element={<ProtectedRoute><DoraPage /></ProtectedRoute>} />
        <Route path="*"            element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/users" element={ <ProtectedRoute><UserManagementPage /></ProtectedRoute> } />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppRoutes />
    </Provider>
  );
}