import React, { useState, useEffect } from 'react';
import { Shield, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { setupSuperAdmin, getCurrentSuperAdmin, listAllUsers, resetSuperAdmins } from '../utils/setupSuperAdmin';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export function SuperAdminSetup() {
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [currentSuperAdmin, setCurrentSuperAdmin] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingUsers(true);
    
    // Get current super admin
    const superAdminResult = await getCurrentSuperAdmin();
    if (superAdminResult.success && superAdminResult.data) {
      setCurrentSuperAdmin(superAdminResult.data);
    }

    // Get all users
    const usersResult = await listAllUsers();
    if (usersResult.success && usersResult.data) {
      setUsers(usersResult.data);
    }

    setLoadingUsers(false);
  };

  const handleSetupSuperAdmin = async () => {
    if (!selectedEmail) {
      setMessage('Please select a user email.');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await setupSuperAdmin(selectedEmail);
      setMessage(result.message);
      setMessageType(result.success ? 'success' : 'error');

      if (result.success) {
        // Reload data to show the new super admin
        await loadInitialData();
        setSelectedEmail('');
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSuperAdmins = async () => {
    if (!confirm('Are you sure you want to reset all super admin roles? This will set all super admins back to regular users.')) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await resetSuperAdmins();
      setMessage(result.message);
      setMessageType(result.success ? 'success' : 'error');

      if (result.success) {
        await loadInitialData();
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getMessageColor = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="mx-auto h-12 w-12 text-purple-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Super Admin Setup</h1>
          <p className="mt-2 text-gray-600">
            Set up the single super administrator for your system
          </p>
        </div>

        {/* Current Super Admin Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-purple-600" />
            Current Super Admin Status
          </h2>
          
          {currentSuperAdmin ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="font-medium text-green-800">
                    {currentSuperAdmin.full_name} ({currentSuperAdmin.email})
                  </p>
                  <p className="text-sm text-green-600">
                    Set up on: {new Date(currentSuperAdmin.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
                <p className="text-yellow-800">No super admin currently set up.</p>
              </div>
            </div>
          )}
        </div>

        {/* Setup Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            {currentSuperAdmin ? 'Change Super Admin' : 'Set Up Super Admin'}
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Select User Email
              </label>
              <select
                id="email"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={loading || loadingUsers}
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.full_name} ({user.email}) - {user.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSetupSuperAdmin}
                disabled={loading || !selectedEmail}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Shield className="h-4 w-4 mr-2" />
                )}
                {currentSuperAdmin ? 'Change Super Admin' : 'Set as Super Admin'}
              </button>

              {currentSuperAdmin && (
                <button
                  onClick={handleResetSuperAdmins}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset All
                </button>
              )}
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg border flex items-center ${getMessageColor()}`}>
              {getMessageIcon()}
              <span className="ml-2">{message}</span>
            </div>
          )}
        </div>

        {/* Users List */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-600" />
            All Users ({users.length})
          </h2>

          {loadingUsers ? (
            <div className="flex justify-center py-4">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className={user.role === 'super_admin' ? 'bg-purple-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'super_admin' 
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
