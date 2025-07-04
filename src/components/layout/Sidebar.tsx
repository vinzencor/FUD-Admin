import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
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
    { name: 'Home', to: `${basePath}/home`, icon: Home },
    { name: 'Dashboard', to: `${basePath}/dashboard`, icon: LayoutDashboard },
    { name: 'Members', to: `${basePath}/members`, icon: Users },
    { name: 'Farmers', to: `${basePath}/farmers`, icon: Store },
    // { name: 'PMA Members', to: `${basePath}/pma-members`, icon: Crown },
    { name: 'Orders', to: `${basePath}/orders`, icon: ShoppingBasket },
    { name: 'Interests', to: `${basePath}/interests`, icon: Heart },
    { name: 'Feedback', to: `${basePath}/feedback`, icon: MessageSquare },
    { name: 'Reports', to: `${basePath}/reports`, icon: FileText },
    { name: 'Activity Logs', to: `${basePath}/activity-logs`, icon: Activity },
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
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center justify-center border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">
          {isSuperAdmin ? 'Super Admin Panel' : 'Regional Admin Panel'}
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )
            }
          >
            <item.icon
              className="mr-3 h-5 w-5 flex-shrink-0"
              aria-hidden="true"
            />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md"
        >
          <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}