import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  User,
  ShoppingBasket,
  MessageSquare,
  LogOut,
  Settings,
  Crown,
  Heart,
  Store,
  FileText,
  Activity,
  Home,
  UserCog,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isSuperAdmin = user?.role === 'super_admin';
  const basePath = isSuperAdmin ? '/super-admin' : '/admin';

  const navigation = [
    { name: 'Dashboard', to: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Cover page', to: `${basePath}/home`, icon: Home },
    { name: 'Database', to: `${basePath}/members`, icon: Users },
    { name: 'Buyers', to: `${basePath}/buyers`, icon: User },
    { name: 'Sellers', to: `${basePath}/farmers`, icon: Store },
    { name: 'Featured Sellers', to: `${basePath}/featured-sellers`, icon: Crown },
    // { name: 'PMA Members', to: `${basePath}/pma-members`, icon: Crown },
    // { name: 'Orders', to: `${basePath}/orders`, icon: ShoppingBasket },
    { name: 'Orders', to: `${basePath}/interests`, icon: Heart },
    { name: 'Feedback', to: `${basePath}/feedback`, icon: MessageSquare },
    { name: 'Reports', to: `${basePath}/reports`, icon: FileText },
    // Super admin only navigation
    ...(user?.role === 'super_admin' ? [
      { name: 'Admin Management', to: `${basePath}/admin-management`, icon: UserCog },
    ] : []),
    { name: 'Settings', to: `${basePath}/settings`, icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full flex-col bg-gray-900 fixed left-0 top-0 z-50 w-64">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-gray-700 px-4">
        <h1 className="text-lg font-bold text-white truncate">
          {isSuperAdmin ? 'Super Admin Panel' : 'Regional Admin Panel'}
        </h1>
      </div>
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-hidden">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <item.icon
              className="h-5 w-5 flex-shrink-0 mr-3"
              aria-hidden="true"
            />
            <span className="truncate">
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>
      {/* Logout Section */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-all duration-200"
        >
          <LogOut
            className="h-5 w-5 mr-3"
            aria-hidden="true"
          />
          <span>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}