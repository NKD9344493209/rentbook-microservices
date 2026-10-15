import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { api } from './api/client.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ServiceStatus from './pages/ServiceStatus.jsx';
import TenantDashboard from './pages/TenantDashboard.jsx';
import Bills from './pages/Bills.jsx';
import Complaints from './pages/Complaints.jsx';
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import OwnerProperties from './pages/OwnerProperties.jsx';
import OwnerBills from './pages/OwnerBills.jsx';
import OwnerComplaints from './pages/OwnerComplaints.jsx';
import Notifications from './pages/Notifications.jsx';

export default function App() {
  const { user } = useAuth();

  // Wake both services as soon as the app opens (free hosts sleep when idle).
  useEffect(() => {
    api.health.user();
    api.health.billing();
    api.health.notify();
  }, []);

  const home = !user ? '/login' : user.role === 'owner' ? '/owner' : '/dashboard';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} replace /> : <Register />} />

      {/* Status page is public when logged out, inside the layout when logged in. */}
      <Route path="/status" element={user ? <Layout /> : <ServiceStatus standalone />}>
        {user && <Route index element={<ServiceStatus />} />}
      </Route>

      <Route element={<ProtectedRoute role="tenant"><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<TenantDashboard />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route element={<ProtectedRoute role="owner"><Layout /></ProtectedRoute>}>
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/owner/properties" element={<OwnerProperties />} />
        <Route path="/owner/bills" element={<OwnerBills />} />
        <Route path="/owner/complaints" element={<OwnerComplaints />} />
        <Route path="/owner/notifications" element={<Notifications />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
