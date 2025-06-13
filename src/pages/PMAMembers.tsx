import React, { useState } from 'react';
import { Search, MoreVertical, Bell, CheckCircle, XCircle } from 'lucide-react';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/dropdown-menu';

interface PMAMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  joinDate: string;
  status: 'active' | 'expired';
  expiryDate: string;
  lastActive: string;
}

const mockPMAMembers: PMAMember[] = [
  {
    id: '1',
    name: "John Smith",
    email: "john@example.com",
    phone: "(555) 123-4567",
    location: "California, USA",
    joinDate: '2024-02-15',
    status: 'active',
    expiryDate: '2024-05-15',
    lastActive: '2024-03-15'
  },
  {
    id: '2',
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "(555) 234-5678",
    location: "Texas, USA",
    joinDate: '2023-12-01',
    status: 'expired',
    expiryDate: '2024-03-01',
    lastActive: '2024-03-14'
  }
];

export function PMAMembers() {
  const [members, setMembers] = useState<PMAMember[]>(mockPMAMembers);
  const [status, setStatus] = useState<'all' | 'active' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<PMAMember | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);

  const isExpiringSoon = (member: PMAMember) => {
    const expiryDate = parseISO(member.expiryDate);
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return isAfter(expiryDate, new Date()) && isBefore(expiryDate, thirtyDaysFromNow);
  };

  const expiringMemberships = members.filter(member => isExpiringSoon(member));

  const handleRenewalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const newExpiryDate = formData.get('expiryDate') as string;

    setMembers(members.map(member =>
      member.id === selectedMember.id
        ? { ...member, status: 'active', expiryDate: newExpiryDate }
        : member
    ));

    setShowRenewalModal(false);
    setSelectedMember(null);
  };

  const filteredMembers = members.filter(member => {
    const matchesStatus = status === 'all' || member.status === status;
    const matchesSearch = 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">PMA Members</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
            Export PMA Members
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
                placeholder="Search PMA members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {showExpiringAlert && expiringMemberships.length > 0 && (
          <div className="mx-4 mt-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
              <div className="flex items-center">
                <Bell className="h-4 w-4 text-yellow-400 mr-2" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-700">
                    {expiringMemberships.length} PMA membership(s) expiring within 30 days
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
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Member</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
                </th>
                <th className="px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</div>
                </th>
                <th className="px-6 py-3 text-center">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isExpiringSoon(member) ? 'bg-yellow-50 hover:bg-yellow-100' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{member.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{member.location}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {member.status === 'active' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <Badge
                        variant={member.status === 'active' ? 'success' : 'danger'}
                        className="capitalize"
                      >
                        {member.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {format(parseISO(member.expiryDate), 'MMM d, yyyy')}
                      {isExpiringSoon(member) && (
                        <span className="ml-2 text-yellow-600 text-xs">⚠️ Expiring Soon</span>
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
                              setSelectedMember(member);
                              setShowRenewalModal(true);
                            }}
                          >
                            Renew Membership
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

      <Dialog open={showRenewalModal} onOpenChange={() => setShowRenewalModal(false)}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Renew PMA Membership</h3>
          </DialogHeader>
          <form onSubmit={handleRenewalSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedMember(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Renew Membership
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}