import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Lock, Mail, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../supabaseClient';

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [role, setRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.user) {
        setError('User not found');
        return;
      }

      // Show authorization step
      setIsAuthorizing(true);

      // Get user role and details from the users table (new database-based approach)
      let userRole = null;
      let userName = data.user.user_metadata?.name || '';

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, role')
          .eq('id', data.user.id)
          .single();

        if (!userError && userData) {
          userName = userData.full_name || '';
          userRole = userData.role;
        } else {
          console.log('Could not fetch user data from database:', userError);
          // Fallback to app_metadata if database query fails
          userRole = data.user.app_metadata?.role;
        }
      } catch (err) {
        console.log('Error fetching user data:', err);
        // Fallback to app_metadata if database query fails
        userRole = data.user.app_metadata?.role;
      }

      // Check if user has admin or super_admin role
      if (!userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
        let errorMessage = 'Access denied. You do not have permission to access the admin panel.';

        if (userRole === 'user') {
          errorMessage = 'Access denied. Your account has user-level access only. Please contact an administrator to request admin privileges.';
        } else if (!userRole) {
          errorMessage = 'Access denied. No role assigned to your account. Please contact an administrator to assign appropriate permissions.';
        }

        setError(errorMessage);
        await supabase.auth.signOut(); // Sign them out immediately
        return;
      }

      // Log successful admin authorization
      console.log(`Admin user authorized: ${data.user.email} with role: ${userRole}`);

      // Show success state briefly
      setAuthSuccess(true);
      setIsAuthorizing(false);

      // If still no name, use email prefix
      if (!userName) {
        userName = data.user.email?.split('@')[0] || 'Admin';
      }

      // Login the user with the auth store
      login({
        id: data.user.id,
        email: data.user.email || '',
        name: userName,
        role: userRole as UserRole,
        regions: data.user.user_metadata?.regions || []
      });

      // Small delay to show success message, then navigate
      setTimeout(() => {
        navigate(userRole === 'super_admin' ? '/super-admin/dashboard' : '/admin/dashboard');
      }, 1000);
    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white shadow-md rounded-lg px-8 py-6">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Farmers Connect Admin
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {isAuthorizing && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm flex items-center">
              <Shield className="h-4 w-4 mr-2 animate-pulse" />
              Verifying admin permissions...
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Admin access authorized! Redirecting...
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Login As
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="admin">Regional Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || isAuthorizing || authSuccess}
            >
              {authSuccess ? (
                <span className="flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Access Granted
                </span>
              ) : isAuthorizing ? (
                <span className="flex items-center justify-center">
                  <Shield className="h-4 w-4 mr-2 animate-pulse" />
                  Authorizing...
                </span>
              ) : isLoading ? (
                'Signing in...'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Admin Access Required</h4>
              <p className="text-xs text-gray-600">
                Only users with <span className="font-medium text-blue-600">Admin</span> or{' '}
                <span className="font-medium text-purple-600">Super Admin</span> roles can access this panel.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Contact your system administrator if you need admin access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

