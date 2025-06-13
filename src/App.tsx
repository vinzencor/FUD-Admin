import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { PMAMembers } from './pages/PMAMembers';
import { Orders } from './pages/Orders';
import { Feedback } from './pages/Feedback';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  const user = useAuthStore((state) => state.user);
  const basePath = user?.role === 'super_admin' ? '/super-admin' : '/admin';

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<Navigate to={user ? `${basePath}/dashboard` : '/login'} replace />} />
        
        {/* Super Admin Routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="pma-members" element={<PMAMembers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Regional Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="pma-members" element={<PMAMembers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;