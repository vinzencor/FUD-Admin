import React, { useState } from 'react';
import { Crown, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { initializeRoleManagement } from '../../utils/roleManagement';

interface RoleSetupProps {
  onComplete?: () => void;
}

export function RoleSetup({ onComplete }: RoleSetupProps) {
  const [step, setStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const migrationSQL = `-- Add role column to users table for role-based access control
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Add comment and index
COMMENT ON COLUMN public.users.role IS 'User role for access control';
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Update existing users to have 'user' role if null
UPDATE public.users SET role = 'user' WHERE role IS NULL;`;

  const handleInitializeAdmin = async () => {
    if (!adminEmail.trim()) {
      setError('Please enter an admin email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await initializeRoleManagement(adminEmail.trim());
      
      if (result.success) {
        setSuccess(true);
        setStep(3);
        if (onComplete) {
          setTimeout(onComplete, 2000);
        }
      } else {
        setError(result.error || 'Failed to initialize admin user');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <Crown className="h-12 w-12 text-purple-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Role Management Setup</h1>
        <p className="text-gray-600 mt-2">Set up role-based access control for your admin panel</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            2
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-purple-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            3
          </div>
        </div>
      </div>

      {/* Step 1: Database Migration */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Database Setup Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You need to run a database migration to add the role column to your users table.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Step 1: Run Database Migration</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 mb-4">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to the SQL Editor</li>
              <li>Copy and paste the SQL below</li>
              <li>Execute the SQL script</li>
            </ol>

            <div className="bg-gray-900 rounded-lg p-4 relative">
              <button
                onClick={() => copyToClipboard(migrationSQL)}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </button>
              <pre className="text-green-400 text-xs overflow-x-auto">
                <code>{migrationSQL}</code>
              </pre>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                I've run the migration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Create Super Admin */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Step 2: Create Super Admin User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the email address of the user who should be the first Super Admin. This user will have full access to all features.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleInitializeAdmin}
                  disabled={loading || !adminEmail.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Crown className="h-4 w-4" />
                      Create Super Admin
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && success && (
        <div className="text-center space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">Setup Complete!</h3>
            <p className="text-green-700">
              Role management has been successfully set up. The admin user can now access all features.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">What's Next?</h4>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• Super Admin can assign roles to other users</li>
              <li>• Admin users get view-only access to admin features</li>
              <li>• Regular users continue with normal platform access</li>
              <li>• Check the Members page to manage user roles</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
