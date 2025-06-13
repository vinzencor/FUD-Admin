import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Bell } from 'lucide-react';

interface Membership {
  id: string;
  userId: string;
  userName: string;
  email: string;
  type: 'seller' | 'buyer';
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'expired' | 'pending';
  startDate: string;
  expiryDate: string;
  lastPaymentDate: string;
  amount: number;
}

const mockMemberships: Membership[] = [
  {
    id: '1',
    userId: 'u1',
    userName: 'Green Valley Farm',
    email: 'contact@greenvalley.com',
    type: 'seller',
    plan: 'premium',
    status: 'active',
    startDate: '2024-01-15',
    expiryDate: '2024-04-15',
    lastPaymentDate: '2024-01-15',
    amount: 299.99
  },
  {
    id: '2',
    userId: 'u2',
    userName: 'John Smith',
    email: 'john@example.com',
    type: 'buyer',
    plan: 'basic',
    status: 'expired',
    startDate: '2023-12-01',
    expiryDate: '2024-03-01',
    lastPaymentDate: '2023-12-01',
    amount: 99.99
  },
  {
    id: '3',
    userId: 'u3',
    userName: 'Fresh Fields',
    email: 'info@freshfields.com',
    type: 'seller',
    plan: 'enterprise',
    status: 'active',
    startDate: '2024-02-01',
    expiryDate: '2025-02-01',
    lastPaymentDate: '2024-02-01',
    amount: 999.99
  },
  {
    id: '4',
    userId: 'u4',
    userName: 'Sarah Johnson',
    email: 'sarah@example.com',
    type: 'buyer',
    plan: 'premium',
    status: 'pending',
    startDate: '2024-03-10',
    expiryDate: '2024-06-10',
    lastPaymentDate: '2024-03-10',
    amount: 199.99
  }
];

export function Memberships() {
  const [memberships, setMemberships] = useState<Membership[]>(mockMemberships);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'seller' | 'buyer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'pending'>('all');
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);

  const getStatusColor = (status: Membership['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Membership['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getPlanBadgeColor = (plan: Membership['plan']) => {
    switch (plan) {
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'premium':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusUpdate = (membershipId: string, newStatus: Membership['status']) => {
    setMemberships(memberships.map(membership =>
      membership.id === membershipId ? { ...membership, status: newStatus } : membership
    ));
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  };

  const expiringMemberships = memberships.filter(m => isExpiringSoon(m.expiryDate));

  const filteredMemberships = memberships.filter(membership => {
    const matchesSearch = 
      membership.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      membership.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || membership.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || membership.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Membership Management</h2>
      </div>

      {showExpiringAlert && expiringMemberships.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <Bell className="h-5 w-5 text-yellow-400 mr-2" />
            <div className="flex-1">
              <p className="text-sm text-yellow-700">
                {expiringMemberships.length} membership(s) expiring within 30 days
              </p>
            </div>
            <button
              onClick={() => setShowExpiringAlert(false)}
              className="text-yellow-700 hover:text-yellow-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'seller' | 'buyer')}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Types</option>
          <option value="seller">Sellers</option>
          <option value="buyer">Buyers</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'expired' | 'pending')}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMemberships.map((membership) => (
              <tr key={membership.id} className={isExpiringSoon(membership.expiryDate) ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{membership.userName}</div>
                  <div className="text-sm text-gray-500">{membership.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    membership.type === 'seller' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {membership.type.charAt(0).toUpperCase() + membership.type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${getPlanBadgeColor(membership.plan)}`}>
                    {membership.plan.charAt(0).toUpperCase() + membership.plan.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(membership.status)}
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(membership.status)}`}>
                      {membership.status.charAt(0).toUpperCase() + membership.status.slice(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(membership.expiryDate).toLocaleDateString()}
                  {isExpiringSoon(membership.expiryDate) && (
                    <span className="ml-2 text-yellow-600 text-xs">Expiring Soon</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">${membership.amount}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(membership.lastPaymentDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={membership.status}
                    onChange={(e) => handleStatusUpdate(membership.id, e.target.value as Membership['status'])}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="pending">Pending</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}