import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import LoginPage from './pages/Login';
import Layout from './components/Layout';
import OwnerDashboard from './pages/dashboard/OwnerDashboard';
import BranchDashboard from './pages/dashboard/BranchDashboard';
import TasksPage from './pages/Tasks';
import FinancePage from './pages/Finance';
import WarehousePage from './pages/Warehouse';
import UsersPage from './pages/Users';
import DeliveryPage from './pages/Delivery';
import RemindersPage from './pages/Reminders';
import AIPage from './pages/AI';
import AnalyticsPage from './pages/Analytics';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

function DashboardRoute() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'owner' || user.role === 'accountant') return <OwnerDashboard />;
  return <BranchDashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardRoute />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
