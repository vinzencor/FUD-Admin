import React from 'react';
import { 
  Users, 
  ShoppingCart, 
  Package, 
  Shield, 
  Activity, 
  TrendingUp,
  Calendar,
  Database
} from 'lucide-react';

interface ActivitySummaryProps {
  stats: {
    user_registered: number;
    order_placed: number;
    product_created: number;
    order_status_changed: number;
    user_role_changed: number;
    system_initialized: number;
    total: number;
  };
}

export function ActivitySummary({ stats }: ActivitySummaryProps) {
  const activities = [
    {
      label: 'User Registrations',
      count: stats.user_registered,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'New users joined both apps'
    },
    {
      label: 'Orders Placed',
      count: stats.order_placed,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Orders/interests created by buyers'
    },
    {
      label: 'Products Created',
      count: stats.product_created,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'New products listed by sellers'
    },
    {
      label: 'Status Changes',
      count: stats.order_status_changed,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Order status updates by admins'
    },
    {
      label: 'Role Changes',
      count: stats.user_role_changed,
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      description: 'Admin promotions and role changes'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Overview
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Complete activity tracking across both main app and admin panel
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500">Total Activities</div>
        </div>
      </div>

      {/* Activity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((activity, index) => (
          <div
            key={index}
            className={`${activity.bgColor} rounded-lg p-4 border border-gray-200`}
          >
            <div className="flex items-center justify-between mb-2">
              <activity.icon className={`h-5 w-5 ${activity.color}`} />
              <span className="text-2xl font-bold text-gray-900">
                {activity.count}
              </span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">
              {activity.label}
            </h4>
            <p className="text-xs text-gray-600">
              {activity.description}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-gray-600" />
          <h4 className="font-medium text-gray-900">Data Sources</h4>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700">Main App Activities</div>
            <div className="text-gray-600">
              • User registrations: {stats.user_registered}
            </div>
            <div className="text-gray-600">
              • Orders placed: {stats.order_placed}
            </div>
            <div className="text-gray-600">
              • Products created: {stats.product_created}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Admin App Activities</div>
            <div className="text-gray-600">
              • Status changes: {stats.order_status_changed}
            </div>
            <div className="text-gray-600">
              • Role assignments: {stats.user_role_changed}
            </div>
            <div className="text-gray-600">
              • System events: {stats.system_initialized}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-green-600" />
          <h4 className="font-medium text-green-900">Real-time Tracking Active</h4>
        </div>
        <p className="text-sm text-green-800">
          All new activities in both the main app and admin panel are now being automatically 
          tracked and logged. Historical data has been retroactively added to provide a 
          complete audit trail.
        </p>
      </div>
    </div>
  );
}

interface ActivityTimelineProps {
  recentActivities: Array<{
    user_name: string;
    action: string;
    resource_type: string;
    timestamp: string;
    details?: any;
  }>;
}

export function ActivityTimeline({ recentActivities }: ActivityTimelineProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_registered':
        return Users;
      case 'order_placed':
        return ShoppingCart;
      case 'product_created':
        return Package;
      case 'order_status_changed':
        return TrendingUp;
      case 'user_role_changed':
        return Shield;
      default:
        return Activity;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'user_registered':
        return 'text-blue-600';
      case 'order_placed':
        return 'text-green-600';
      case 'product_created':
        return 'text-purple-600';
      case 'order_status_changed':
        return 'text-orange-600';
      case 'user_role_changed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900 flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Recent Activity Timeline
      </h4>
      
      <div className="space-y-3">
        {recentActivities.slice(0, 10).map((activity, index) => {
          const Icon = getActionIcon(activity.action);
          const color = getActionColor(activity.action);
          
          return (
            <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <Icon className={`h-4 w-4 ${color} mt-0.5 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.user_name}
                  </p>
                  <time className="text-xs text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()} {new Date(activity.timestamp).toLocaleTimeString()}
                  </time>
                </div>
                <p className="text-sm text-gray-600">
                  {formatAction(activity.action)} • {activity.resource_type}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
