import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { Eye, EyeOff, X, Lock, MapPin, Globe } from 'lucide-react';
import { getAdminAssignedLocation, AdminLocation } from '../services/locationAdminService';

export function Settings() {
  const user = useAuthStore((state) => state.user);
  const [adminLocation, setAdminLocation] = useState<AdminLocation | null | undefined>(undefined);
  const [notifications, setNotifications] = useState({
    email: true,
    dashboard: true,
    updates: false
  });

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Load admin location on component mount
  useEffect(() => {
    const loadAdminLocation = async () => {
      try {
        if (user?.role === 'admin' && user?.id) {
          const location = await getAdminAssignedLocation(user.id);
          setAdminLocation(location);
        } else {
          // Super admin has no location restrictions
          setAdminLocation(null);
        }
      } catch (error) {
        console.error('Error loading admin location:', error);
        setAdminLocation(null);
      }
    };

    if (user) {
      loadAdminLocation();
    }
  }, [user]);

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getPasswordStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return { text: 'Very Weak', color: 'text-red-600' };
      case 2:
        return { text: 'Weak', color: 'text-orange-600' };
      case 3:
        return { text: 'Fair', color: 'text-yellow-600' };
      case 4:
        return { text: 'Good', color: 'text-blue-600' };
      case 5:
        return { text: 'Strong', color: 'text-green-600' };
      default:
        return { text: '', color: '' };
    }
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const isSuperAdmin = user?.role === 'super_admin';

    // Validation
    if (!isSuperAdmin && !passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (!isSuperAdmin && passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setPasswordLoading(true);

      if (isSuperAdmin) {
        // For super admin, directly update the password using Supabase Auth
        const { error } = await supabase.auth.updateUser({
          password: passwordForm.newPassword
        });

        if (error) {
          throw error;
        }
      } else {
        // For regular users, verify current password first
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: passwordForm.currentPassword
        });

        if (signInError) {
          throw new Error('Current password is incorrect');
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordForm.newPassword
        });

        if (updateError) {
          throw updateError;
        }
      }

      setPasswordSuccess(true);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);

    } catch (error: any) {
      console.error('Error changing password:', error);
      setPasswordError(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Reset modal state when closing
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
      </div>

      <div className="bg-white shadow-md rounded-lg divide-y divide-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Profile Settings</h3>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                defaultValue={user?.name}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                defaultValue={user?.email}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Admin Location Section */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-600" />
            Admin Access Location
          </h3>
          <div className="mt-4">
            {adminLocation === undefined ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                Loading location information...
              </div>
            ) : adminLocation === null ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-purple-600" />
                  <div>
                    <h4 className="font-medium text-purple-900">Global Access</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      As a super administrator, you have unrestricted access to all locations and data across the entire system.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-6 w-6 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Regional Access</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Your admin access is restricted to the following geographic location:
                    </p>
                    <div className="mt-3 space-y-2">
                      {adminLocation.country && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-blue-800">Country:</span>
                          <span className="text-blue-700">{adminLocation.country}</span>
                        </div>
                      )}
                      {adminLocation.district && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-blue-800">State/District:</span>
                          <span className="text-blue-700">{adminLocation.district}</span>
                        </div>
                      )}
                      {adminLocation.city && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-blue-800">City:</span>
                          <span className="text-blue-700">{adminLocation.city}</span>
                        </div>
                      )}
                      {adminLocation.streets && adminLocation.streets.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <span className="font-medium text-blue-800">Streets:</span>
                          <div className="text-blue-700">
                            {adminLocation.streets.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                      <strong>Note:</strong> You can only view and manage data from users, farmers, orders, and reports within your assigned location.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label className="font-medium text-gray-700">Email Notifications</label>
                <p className="text-gray-500 text-sm">Receive email notifications for important updates</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={notifications.dashboard}
                  onChange={(e) => setNotifications({ ...notifications, dashboard: e.target.checked })}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label className="font-medium text-gray-700">Dashboard Alerts</label>
                <p className="text-gray-500 text-sm">Show notifications in the dashboard</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  checked={notifications.updates}
                  onChange={(e) => setNotifications({ ...notifications, updates: e.target.checked })}
                  className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3">
                <label className="font-medium text-gray-700">Product Updates</label>
                <p className="text-gray-500 text-sm">Receive notifications about new features and updates</p>
              </div>
            </div>
          </div>
        </div> */}

        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Security</h3>
          <div className="mt-6">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </button>
            {user?.role === 'super_admin' && (
              <p className="text-sm text-gray-500 mt-2">
                <strong>Super Admin Privilege:</strong> You can directly change your password without entering the current password.
              </p>
            )}
            {user?.role === 'admin' && (
              <p className="text-sm text-gray-500 mt-2">
                You will need to enter your current password to change it.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
          Save Changes
        </button>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <button
                onClick={handleClosePasswordModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password - Only show for non-super admin */}
              {user?.role !== 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {passwordForm.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            getPasswordStrength(passwordForm.newPassword) <= 1
                              ? 'bg-red-500 w-1/5'
                              : getPasswordStrength(passwordForm.newPassword) === 2
                              ? 'bg-orange-500 w-2/5'
                              : getPasswordStrength(passwordForm.newPassword) === 3
                              ? 'bg-yellow-500 w-3/5'
                              : getPasswordStrength(passwordForm.newPassword) === 4
                              ? 'bg-blue-500 w-4/5'
                              : 'bg-green-500 w-full'
                          }`}
                        ></div>
                      </div>
                      <span className={`text-xs font-medium ${getPasswordStrengthText(getPasswordStrength(passwordForm.newPassword)).color}`}>
                        {getPasswordStrengthText(getPasswordStrength(passwordForm.newPassword)).text}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Password should contain uppercase, lowercase, numbers, and special characters
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {passwordError}
                </div>
              )}

              {/* Success Message */}
              {passwordSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  Password changed successfully!
                </div>
              )}

              {/* Super Admin Note */}
              {user?.role === 'super_admin' && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                  <strong>Super Admin:</strong> You can change your password directly without entering the current password.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClosePasswordModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Changing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}