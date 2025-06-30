import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { PMAMembers } from './pages/PMAMembers';
import { Orders } from './pages/Orders';
import { Interests } from './pages/Interests';
import { Feedback } from './pages/Feedback';
import { Farmers } from './pages/Farmers';
import { Reports } from './pages/super-admin/Reports';
import { ActivityLogs } from './pages/super-admin/ActivityLogs';
import { SuperAdminSetup } from './pages/SuperAdminSetup';
import { DebugDataService } from './pages/DebugDataService';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({
  children,
  allowedRoles = ['admin', 'super_admin']
}: {
  children: React.ReactNode,
  allowedRoles?: string[]
}) {
  const user = useAuthStore((state) => state.user);

  // If no user is found, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has one of the allowed roles
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const user = useAuthStore((state) => state.user);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup-super-admin" element={<SuperAdminSetup />} />
        <Route path="/debug-data-service" element={<DebugDataService />} />

        <Route
          path="/"
          element={
            <Navigate
              to={
                user
                  ? user.role === 'super_admin'
                    ? '/super-admin/dashboard'
                    : '/admin/dashboard'
                  : '/login'
              }
              replace
            />
          }
        />

        {/* Super Admin Routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="farmers" element={<Farmers />} />
          {/* <Route path="pma-members" element={<PMAMembers />} /> */}
          <Route path="orders" element={<Orders />} />
          <Route path="interests" element={<Interests />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="reports" element={<Reports />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Regional Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="farmers" element={<Farmers />} />
          {/* <Route path="pma-members" element={<PMAMembers />} /> */}
          <Route path="orders" element={<Orders />} />
          <Route path="interests" element={<Interests />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="reports" element={<Reports />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch all route - redirect to login if no user, otherwise to appropriate dashboard */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? user.role === 'super_admin'
                    ? '/super-admin/dashboard'
                    : '/admin/dashboard'
                  : '/login'
              }
              replace
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
