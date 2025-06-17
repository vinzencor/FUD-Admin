import React from 'react';
import { Bell, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function Header() {
  const user = useAuthStore((state) => state.user);

  // Get user display name - try different sources
  const getUserDisplayName = () => {
    if (!user) return 'Admin User';

    // Try to get name from user data or email
    const name = user.name ||
                 user.email?.split('@')[0] ||
                 'Admin User';

    return name;
  };

  const getUserRole = () => {
    if (!user) return '';

    const role = user.role;
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    return 'User';
  };

  return (
    <header className="bg-white shadow">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
        </div>
        <div className="flex items-center space-x-4">
          <button className="text-gray-500 hover:text-gray-700">
            <Bell className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">{getUserDisplayName()}</span>
              <span className="text-xs text-gray-500">{getUserRole()}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}