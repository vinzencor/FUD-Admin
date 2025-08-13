import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
// import { PMAMembers } from './pages/PMAMembers';
import { Orders } from './pages/Orders';
import { Interests } from './pages/Interests';
import { Feedback } from './pages/Feedback';
import { Farmers } from './pages/Farmers';
import { Buyers } from './pages/Buyers';
import { BuyerAddressTest } from './pages/BuyerAddressTest';
import { DatabaseViewer } from './pages/DatabaseViewer';
import { DatabaseStructure } from './pages/DatabaseStructure';
import { ProductsTest } from './pages/ProductsTest';
import { FeaturedSellers } from './pages/FeaturedSellers';
import { Reports } from './pages/super-admin/Reports';

import { SuperAdminSetup } from './pages/SuperAdminSetup';
import { DebugDataService } from './pages/DebugDataService';
import { HomePage } from './pages/HomePage';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { useAuthStore } from './store/authStore';
import { AdminManagement } from './pages/super-admin/AdminManagement';
import { AuditLog } from './pages/AuditLog';
import { supabase } from './supabaseClient';

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

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const user = useAuthStore((state) => state.user);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session to initialize auth state
        const { data: { session } } = await supabase.auth.getSession();

        console.log('🔄 Initializing auth state:', session?.user?.email || 'No session');

        // Small delay to ensure auth store is properly initialized
        setTimeout(() => {
          if (mounted) {
            setIsInitializing(false);
          }
        }, 500);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event, session?.user?.email || 'No session');

      // Ensure we're not stuck in loading state
      if (mounted && isInitializing) {
        setTimeout(() => {
          if (mounted) {
            setIsInitializing(false);
          }
        }, 100);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isInitializing]);

  // Show loading screen while initializing
  if (isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup-super-admin" element={<SuperAdminSetup />} />
        <Route path="/debug-data-service" element={<DebugDataService />} />
        <Route path="/buyer-address-test" element={<BuyerAddressTest />} />
        <Route path="/database-viewer" element={<DatabaseViewer />} />
        <Route path="/database-structure" element={<DatabaseStructure />} />
        <Route path="/products-test" element={<ProductsTest />} />

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
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="buyers" element={<Buyers />} />
          <Route path="farmers" element={<Farmers />} />
          <Route path="featured-sellers" element={<FeaturedSellers />} />
          {/* <Route path="pma-members" element={<PMAMembers />} /> */}
          <Route path="orders" element={<Orders />} />
          <Route path="interests" element={<Interests />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="reports" element={<Reports />} />
          <Route path="admin-management" element={<AdminManagement />} />
          <Route path="audit-log" element={<AuditLog />} />
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
          <Route path="home" element={<HomePage />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<Members />} />
          <Route path="buyers" element={<Buyers />} />
          <Route path="farmers" element={<Farmers />} />
          <Route path="featured-sellers" element={<FeaturedSellers />} />
          {/* <Route path="pma-members" element={<PMAMembers />} /> */}
          <Route path="orders" element={<Orders />} />
          <Route path="interests" element={<Interests />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="reports" element={<Reports />} />
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
