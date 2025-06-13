import React from 'react';
import { Users, ShoppingBag, Store } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { useAuthStore } from '../store/authStore';

export function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';

  const regionStats = {
    members: 1856,
    pmaMembers: 234,
    activeOrders: 86
  };

  const globalStats = {
    totalMembers: 8976,
    totalPMAMembers: 1245,
    totalActiveOrders: 367
  };

  const stats = isSuperAdmin ? globalStats : regionStats;
  
  // Get region name safely
  const regionName = user?.regions && user.regions.length > 0 
    ? user.regions[0].name 
    : "Regional";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">
          {isSuperAdmin ? 'Global Overview' : `${regionName} Overview`}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Members"
          value={isSuperAdmin ? globalStats.totalMembers : regionStats.members}
          icon={Users}
          description="Registered members"
        />
        <StatCard
          title="PMA Members"
          value={isSuperAdmin ? globalStats.totalPMAMembers : regionStats.pmaMembers}
          icon={Store}
          description="Active PMA members"
        />
        <StatCard
          title="Active Orders"
          value={isSuperAdmin ? globalStats.totalActiveOrders : regionStats.activeOrders}
          icon={ShoppingBag}
          description="Orders in progress"
        />
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Orders
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                {
                  id: "ORD-001",
                  buyer: "John Doe",
                  seller: "Green Valley Farm",
                  status: "new"
                },
                {
                  id: "ORD-002",
                  buyer: "Jane Smith",
                  seller: "Fresh Fields Market",
                  status: "in_discussion"
                }
              ].map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.buyer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.seller}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'new' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status === 'new' ? 'New' : 'In Discussion'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-900">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
