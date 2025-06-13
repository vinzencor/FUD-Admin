import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, CheckCircle, XCircle, AlertTriangle, Edit, Trash2, Crown } from 'lucide-react';
import { format, addMonths } from 'date-fns';
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
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  location: string;
  joinDate: string;
  lastActive: string;
}


export function Members() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
  });


  useEffect(() => {
    const fetchMembers = async () => {

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, mobile_phone, country, state, city, created_at')

      console.log('Fetched users:', data);

      if (error) {
        console.error('Failed to fetch members:', error);
      } else {
        const formatted = data.map((row) => ({
          id: row.id,
          name: row.full_name,
          email: row.email,
          phone: row.mobile_phone,
          status: 'active' as 'active',

          location: `${row.city}, ${row.state}`,
          joinDate: row.created_at,
          lastActive: row.created_at // Replace with real last activity if available
        }));
        setMembers(formatted);
      }

      setLoading(false);
    };

    fetchMembers();
  }, []);


  const getStatusIcon = (status: Member['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'suspended':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const handleStatusChange = (memberId: string, newStatus: Member['status']) => {
    setMembers(members.map(member =>
      member.id === memberId ? { ...member, status: newStatus } : member
    ));
  };

  const handleUpgradeToPMA = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMember) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const startDate = formData.get('startDate') as string;
    const duration = parseInt(formData.get('duration') as string);
    const notes = formData.get('notes') as string;

    // Calculate expiry date based on start date and duration
    const expiryDate = format(addMonths(new Date(startDate), duration), 'yyyy-MM-dd');

    // In a real application, you would make an API call here
    // For now, we'll simulate the upgrade by removing the member from this list
    // and they would appear in the PMA members list
    setMembers(members.filter(member => member.id !== selectedMember.id));

    setShowUpgradeModal(false);
    setSelectedMember(null);

    // Navigate to PMA Members page to see the new member
    const basePath = user?.role === 'super_admin' ? '/super-admin' : '/admin';
    navigate(`${basePath}/pma-members`);
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

  const handleDeleteMember = async (memberId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this member?');
    if (!confirmed) return;

    const { error } = await supabase.from('users').delete().eq('id', memberId);

    if (error) {
      console.error('Error deleting member:', error.message);
      alert('Failed to delete member.');
    } else {
      setMembers(members.filter((m) => m.id !== memberId));
    }
  };
  const handleSaveEdits = async (updatedMember: Member) => {
    const { error } = await supabase
      .from('users')
      .update({
        full_name: updatedMember.name,
        mobile_phone: updatedMember.phone,
        // add more fields as needed
      })
      .eq('id', updatedMember.id);

    if (!error) {
      setMembers(members.map(m => m.id === updatedMember.id ? updatedMember : m));
      alert('Member updated successfully.');
    } else {
      console.error('Error updating member:', error);
      alert('Update failed.');
    }
  };

  const testDropdown = () => {
    console.log("Dropdown clicked");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-900">Members</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2">
            Export Members
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
                placeholder="Search members..."
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
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

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
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</div>
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
                  className="hover:bg-gray-50 transition-colors"
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
                      {getStatusIcon(member.status)}
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
                      {format(new Date(member.joinDate), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {expandedRowId === member.id ? (
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member);
                            const [city, state] = member.location.split(',').map((s) => s.trim());
                            setEditForm({
                              name: member.name,
                              email: member.email,
                              phone: member.phone,
                              city: city || '',
                              state: state || '',
                            });
                            setShowEditModal(true);
                          }}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRowId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setExpandedRowId(member.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Upgrade to PMA Membership</h3>
          </DialogHeader>
          <form onSubmit={handleUpgradeToPMA} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Name
              </label>
              <input
                type="text"
                value={selectedMember?.name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                defaultValue={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Membership Duration (months)
              </label>
              <select
                name="duration"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Add any additional notes about the membership..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowUpgradeModal(false);
                  setSelectedMember(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Upgrade to PMA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Edit Member Details</h3>
          </DialogHeader>
          {selectedMember && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const updatedMember: Member = {
                  ...selectedMember,
                  name: editForm.name,
                  email: editForm.email,
                  phone: editForm.phone,
                  location: `${editForm.city}, ${editForm.state}`,
                  joinDate: selectedMember.joinDate,
                  lastActive: selectedMember.lastActive,
                  status: selectedMember.status,
                  id: selectedMember.id,
                };

                await handleSaveEdits(updatedMember);
                setShowEditModal(false);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




