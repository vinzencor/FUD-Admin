import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';

export function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const basePath = isSuperAdmin ? '/super-admin' : '/admin';

  // Determine if sidebar should show full content
  const showFullContent = !isCollapsed || isHovered;

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
    <div
      className={cn(
        "flex h-full flex-col bg-gray-900 transition-all duration-300 ease-in-out relative z-50",
        showFullContent ? "w-64" : "w-16"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Menu Toggle */}
      <div className="flex h-16 items-center border-b border-gray-700 px-4">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-8 h-8 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>

        {showFullContent && (
          <h1 className="ml-3 text-lg font-bold text-white truncate">
            {isSuperAdmin ? 'Super Admin Panel' : 'Regional Admin Panel'}
          </h1>
        )}
      </div>
      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4 overflow-hidden">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all duration-200 relative',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white',
                !showFullContent && 'justify-center'
              )
            }
            title={!showFullContent ? item.name : undefined}
          >
            <item.icon
              className={cn(
                "h-5 w-5 flex-shrink-0 transition-all duration-200",
                showFullContent ? "mr-3" : "mr-0"
              )}
              aria-hidden="true"
            />
            {showFullContent && (
              <span className="truncate transition-opacity duration-200">
                {item.name}
              </span>
            )}

            {/* Tooltip for collapsed state */}
            {!showFullContent && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {item.name}
              </div>
            )}
          </NavLink>
        ))}
      </nav>
      {/* Logout Section */}
      <div className="border-t border-gray-700 p-4">
        <button
          onClick={handleLogout}
          className={cn(
            "group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-all duration-200 relative",
            !showFullContent && 'justify-center'
          )}
          title={!showFullContent ? 'Logout' : undefined}
        >
          <LogOut
            className={cn(
              "h-5 w-5 transition-all duration-200",
              showFullContent ? "mr-3" : "mr-0"
            )}
            aria-hidden="true"
          />
          {showFullContent && (
            <span className="transition-opacity duration-200">
              Logout
            </span>
          )}

          {/* Tooltip for collapsed state */}
          {!showFullContent && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );
}