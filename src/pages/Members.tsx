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
  defaultMode: 'buyer' | 'seller' | 'both';
  role?: 'user' | 'admin' | 'super_admin';
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
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
  });
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_admin'>('user');


  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // First, get users from the database
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, mobile_phone, country, state, city, created_at, default_mode');

        if (usersError) {
          console.error('Failed to fetch members:', usersError);
          setLoading(false);
          return;
        }

        // Then, get auth users to fetch roles (only super admin can do this)
        let authUsers: any[] = [];
        if (user?.role === 'super_admin') {
          try {
            const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
            if (!authError && authData?.users) {
              authUsers = authData.users;
            }
          } catch (err) {
            console.log('Could not fetch auth users:', err);
          }
        }

        const formatted = usersData.map((row) => {
          // Find corresponding auth user to get role
          const authUser = authUsers.find(au => au.id === row.id);
          const userRole = authUser?.app_metadata?.role || 'user';

          // Determine defaultMode based on database field or role
          let defaultMode: 'buyer' | 'seller' | 'both';
          if (row.default_mode && ['buyer', 'seller', 'both'].includes(row.default_mode)) {
            // Use the default_mode from database if it exists and is valid
            defaultMode = row.default_mode as 'buyer' | 'seller' | 'both';
          } else if (userRole === 'super_admin' || userRole === 'admin') {
            // Admins can be both buyers and sellers
            defaultMode = 'both';
          } else {
            // For regular users without a specified mode, default to 'buyer'
            defaultMode = 'buyer';
          }

          return {
            id: row.id,
            name: row.full_name || 'Unknown',
            email: row.email || '',
            phone: row.mobile_phone || '',
            status: 'active' as 'active',
            location: `${row.city || ''}, ${row.state || ''}`,
            joinDate: row.created_at,
            lastActive: row.created_at,
            defaultMode: defaultMode,
            role: userRole as 'user' | 'admin' | 'super_admin'
          };
        });

        setMembers(formatted);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [user?.role]);


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

  const handleRoleChange = async (memberId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    try {
      // Only super admin can change roles
      if (user?.role !== 'super_admin') {
        alert('Only Super Admins can assign roles.');
        return;
      }

      // Update role in Supabase auth
      const { error } = await supabase.auth.admin.updateUserById(memberId, {
        app_metadata: { role: newRole }
      });

      if (error) {
        console.error('Error updating user role:', error);
        alert('Failed to update user role.');
        return;
      }

      // Update local state
      setMembers(members.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      ));

      alert(`User role updated to ${newRole} successfully.`);
      setShowRoleModal(false);
      setSelectedMember(null);
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update user role.');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  // Add missing getModeColor and getModeLabel
  const getModeColor = (mode: Member['defaultMode']) => {
    switch (mode) {
      case 'buyer':
        return 'bg-green-100 text-green-800';
      case 'seller':
        return 'bg-yellow-100 text-yellow-800';
      case 'both':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModeLabel = (mode: Member['defaultMode']) => {
    switch (mode) {
      case 'buyer':
        return 'Buyer';
      case 'seller':
        return 'Seller';
      case 'both':
        return 'Buyer & Seller';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Members</h2>
          {user?.role === 'super_admin' && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              <Crown className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              You can assign user roles as a Super Admin
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex items-center gap-2 text-xs sm:text-sm">
            Export Members
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-w-0 sm:min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setExpandedRowId(expandedRowId === member.id ? null : member.id)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="text-gray-900">{member.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span className="text-gray-900">{member.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Mode:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getModeColor(member.defaultMode)}`}>
                    {getModeLabel(member.defaultMode)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Role:</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role ?? '')}`}>
                    {getRoleLabel(member.role ?? '')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status:</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(member.status)}
                    <Badge
                      variant={member.status === 'active' ? 'success' : 'danger'}
                      className="capitalize"
                    >
                      {member.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Joined:</span>
                  <span className="text-gray-900">{format(new Date(member.joinDate), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {expandedRowId === member.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
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

                    {user?.role === 'super_admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setSelectedRole(member.role ?? 'user');
                          setShowRoleModal(true);
                        }}
                        className="flex items-center gap-1"
                      >
                        <Crown className="h-3 w-3" />
                        Role
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 xl:px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Member</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left hidden xl:table-cell">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left hidden 2xl:table-cell">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-left hidden xl:table-cell">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</div>
                </th>
                <th className="px-4 xl:px-6 py-3 text-center">
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
                  <td className="px-4 xl:px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                        {/* Show contact info on smaller screens */}
                        <div className="text-xs text-gray-400 xl:hidden mt-1">
                          {member.phone && <div>📞 {member.phone}</div>}
                          <div className="2xl:hidden">📍 {member.location}</div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 hidden xl:table-cell">
                    <div className="text-sm text-gray-500">{member.phone || 'N/A'}</div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 hidden 2xl:table-cell">
                    <div className="text-sm text-gray-900">{member.location}</div>
                  </td>
                  <td className="px-4 xl:px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getModeColor(member.defaultMode)}`}>
                      {getModeLabel(member.defaultMode)}
                    </span>
                  </td>
                  <td className="px-4 xl:px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role ?? '')}`}>
                      {getRoleLabel(member.role ?? '')}
                    </span>
                  </td>
                  <td className="px-4 xl:px-6 py-4">
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
                  <td className="px-4 xl:px-6 py-4 hidden xl:table-cell">
                    <div className="text-sm text-gray-900">
                      {format(new Date(member.joinDate), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 text-center">
                    {expandedRowId === member.id ? (
                      <div className="flex justify-center gap-1 flex-wrap">
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

                        {user?.role === 'super_admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setSelectedRole(member.role ?? 'user');
                              setShowRoleModal(true);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Crown className="h-3 w-3" />
                            Role
                          </Button>
                        )}

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

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex-1">
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

      {/* Role Assignment Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent>
          <DialogHeader>
            <h3 className="text-lg font-semibold">Assign User Role</h3>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Name
                </label>
                <input
                  type="text"
                  value={selectedMember.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={selectedMember.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Role
                </label>
                <div className="mb-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedMember.role ?? '')}`}>
                    {getRoleLabel(selectedMember.role ?? '')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Role
                </label>
                <select
                  value={selectedRole || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedRole(value === '' ? 'user' : value as 'admin' | 'super_admin');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Regular User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Changing user roles will affect their access permissions.
                  Admin users can manage members and orders, while Super Admins have full system access.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRoleModal(false);
                setSelectedMember(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (selectedMember) {
                  handleRoleChange(selectedMember.id, selectedRole);
                }
              }}
              disabled={!selectedMember || selectedRole === selectedMember.role}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




