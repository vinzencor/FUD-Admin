import React, { useState } from 'react';
import { Search, MoreVertical, Bell, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from '../components/ui/dialog';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  location: string;
  joinDate: string;
  lastActive: string;
  membership: {
    plan: 'free' | 'basic' | 'premium' | 'none';
    status: 'active' | 'expired' | 'pending' | 'none';
    startDate: string | null;
    expiryDate: string | null;
    notes: string;
  };
}

const mockUsers: User[] = [
  {
    id: '1',
    name: "John Smith",
    email: "john@example.com",
    status: 'active',
    location: "California, USA",
    joinDate: '2024-03-01',
    lastActive: '2024-03-15',
    membership: {
      plan: 'premium',
      status: 'active',
      startDate: '2024-02-15',
      expiryDate: '2024-05-15',
      notes: 'Payment confirmed via external system'
    }
  },
  {
    id: '2',
    name: "Sarah Johnson",
    email: "sarah@example.com",
    status: 'active',
    location: "Texas, USA",
    joinDate: '2024-03-05',
    lastActive: '2024-03-14',
    membership: {
      plan: 'basic',
      status: 'expired',
      startDate: '2023-12-01',
      expiryDate: '2024-03-01',
      notes: 'Renewal reminder sent'
    }
  },
  {
    id: '3',
    name: "Green Valley Farm",
    email: "contact@greenvalley.com",
    status: 'pending',
    location: "Oregon, USA",
    joinDate: '2024-03-10',
    lastActive: '2024-03-15',
    membership: {
      plan: 'premium',
      status: 'pending',
      startDate: '2024-03-10',
      expiryDate: '2024-06-10',
      notes: 'Awaiting payment confirmation'
    }
  }
];

export function Users() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [status, setStatus] = useState<'all' | 'active' | 'pending' | 'suspended'>('all');
  const [membershipStatus, setMembershipStatus] = useState<'all' | 'active' | 'expired' | 'pending' | 'none'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);

  const getStatusIcon = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getMembershipStatusColor = (status: User['membership']['status']) => {
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

  const getPlanBadgeColor = (plan: User['membership']['plan']) => {
    switch (plan) {
      case 'premium':
        return 'bg-purple-50 text-purple-800';
      case 'basic':
        return 'bg-blue-50 text-blue-800';
      default:
        return 'bg-gray-50 text-gray-800';
    }
  };

  const isExpiringSoon = (user: User) => {
    if (!user.membership.expiryDate) return false;
    const expiryDate = parseISO(user.membership.expiryDate);
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return isAfter(expiryDate, new Date()) && isBefore(expiryDate, thirtyDaysFromNow);
  };

  const expiringMemberships = users.filter(user => isExpiringSoon(user));

  const handleStatusChange = (userId: string, newStatus: User['status']) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };

  const handleMembershipUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const updatedMembership = {
      plan: formData.get('plan') as User['membership']['plan'],
      status: formData.get('status') as User['membership']['status'],
      startDate: formData.get('startDate') as string,
      expiryDate: formData.get('expiryDate') as string,
      notes: formData.get('notes') as string,
    };

    setUsers(users.map(user =>
      user.id === selectedUser.id
        ? { ...user, membership: updatedMembership }
        : user
    ));

    setShowMembershipModal(false);
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(user => {
    const matchesStatus = status === 'all' || user.status === status;
    const matchesMembership = membershipStatus === 'all' || user.membership.status === membershipStatus;
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesMembership && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Users</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
            Export Users
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={membershipStatus}
                onChange={(e) => setMembershipStatus(e.target.value as typeof membershipStatus)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Memberships</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
                <option value="none">No Membership</option>
              </select>
            </div>
          </div>
        </div>

        {showExpiringAlert && expiringMemberships.length > 0 && (
          <div className="mx-4 mt-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <div className="flex items-center">
                <Bell className="h-4 w-4 text-yellow-400 mr-2" />
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
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">User</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Membership</div>
                </th>
                <th className="px-6 py-3 text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isExpiringSoon(user) ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{user.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user.status)}
                      <Badge
                        variant={
                          user.status === 'active'
                            ? 'success'
                            : user.status === 'suspended'
                            ? 'danger'
                            : 'warning'
                        }
                        className="capitalize"
                      >
                        {user.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getMembershipStatusColor(user.membership.status)}`}>
                          {user.membership.status.charAt(0).toUpperCase() + user.membership.status.slice(1)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadgeColor(user.membership.plan)}`}>
                          {user.membership.plan === 'premium' ? 'PMA' : user.membership.plan.charAt(0).toUpperCase() + user.membership.plan.slice(1)}
                        </span>
                      </div>
                      {user.membership.expiryDate && (
                        <div className="text-sm text-gray-500">
                          Expires: {format(parseISO(user.membership.expiryDate), 'MMM d, yyyy')}
                          {isExpiringSoon(user) && (
                            <span className="ml-2 text-yellow-600 text-xs">⚠️ Expiring Soon</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setShowMembershipModal(true);
                            }}
                          >
                            Edit Membership
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(user.id, 'active')}
                            className="text-green-600"
                          >
                            Set Active
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(user.id, 'suspended')}
                            className="text-red-600"
                          >
                            Suspend User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showMembershipModal} onOpenChange={() => setShowMembershipModal(false)}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Edit Membership</h3>
          </DialogHeader>
          <form onSubmit={handleMembershipUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                name="plan"
                defaultValue={selectedUser?.membership.plan}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="none">None</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="premium">PMA</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                defaultValue={selectedUser?.membership.status}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
                <option value="none">None</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                defaultValue={selectedUser?.membership.startDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                defaultValue={selectedUser?.membership.expiryDate || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                defaultValue={selectedUser?.membership.notes}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMembershipModal(false);
                  setSelectedUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}