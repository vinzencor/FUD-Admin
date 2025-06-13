import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export function Settings() {
  const user = useAuthStore((state) => state.user);
  const [notifications, setNotifications] = useState({
    email: true,
    dashboard: true,
    updates: false
  });

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

        <div className="p-6">
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
        </div>

        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Security</h3>
          <div className="mt-6">
            <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
              Change Password
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700">
          Save Changes
        </button>
      </div>
    </div>
  );
}