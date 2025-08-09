import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, Trash2, Crown, Store, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, addMonths } from 'date-fns';

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
import { deleteUserWithCascade } from '../services/dataService';
import { useAuditLog } from '../hooks/useAuditLog';
import { updateUserRole, roleLabels, roleDescriptions } from '../utils/roleManagement';
import { exportWithLoading, generateFilename, formatDateForExport, formatBooleanForExport, EXPORT_COLUMNS } from '../utils/exportUtils';
import { AdminLocationModal } from '../components/admin/AdminLocationModal';
import { UserProfileModal } from '../components/shared/UserProfileModal';
import {
  getAdminAssignedLocation,
  formatLocationDisplay,
  AdminLocation,
  applyLocationFilter,
  getAdminLocationFilter
} from '../services/locationAdminService';

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
  isSeller: boolean;
  sellerInfo?: {
    storeName?: string;
    isApproved?: boolean;
  };
  fullAddress?: string;
  coordinates?: any;
  // Individual address fields
  street_address?: string;
  apartment_unit?: string;
  city?: string;
  state?: string;
  district?: string;
  country?: string;
  zipcode?: string;
}


export function Members() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { logUserDeleted, logRoleChanged, logDataExported } = useAuditLog();

  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'buyer' | 'seller' | 'both'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin' | 'super_admin'>('user');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [showAdminLocationModal, setShowAdminLocationModal] = useState(false);
  const [adminLocationModalMode, setAdminLocationModalMode] = useState<'promote' | 'edit'>('promote');
  const [selectedMemberForAdmin, setSelectedMemberForAdmin] = useState<Member | null>(null);
  // const [featuredSellers, setFeaturedSellers] = useState<Set<string>>(new Set());
  // const [processingFeatured, setProcessingFeatured] = useState<string | null>(null);


  // // Load featured sellers
  // const loadFeaturedSellers = async () => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('featured_sellers')
  //       .select('user_id')
  //       .eq('is_active', true);

  //     if (error) throw error;

  //     const featuredUserIds = new Set(data?.map(fs => fs.user_id) || []);
  //     setFeaturedSellers(featuredUserIds);
  //   } catch (error) {
  //     console.error('Error loading featured sellers:', error);
  //   }
  // };

  // // Toggle featured seller status
  // const toggleFeaturedStatus = async (userId: string, userName: string) => {
  //   if (!user?.id) return;

  //   try {
  //     setProcessingFeatured(userId);

  //     const { data, error } = await supabase.rpc('toggle_featured_seller', {
  //       p_user_id: userId,
  //       p_admin_id: user.id,
  //       p_notes: `Featured/unfeatured by ${user.email} from Members section`
  //     });

  //     if (error) throw error;

  //     if (data?.success) {
  //       // Update local state
  //       const newFeaturedSellers = new Set(featuredSellers);
  //       if (data.action === 'featured') {
  //         newFeaturedSellers.add(userId);
  //         alert(`${userName} has been added to featured sellers!`);
  //       } else {
  //         newFeaturedSellers.delete(userId);
  //         alert(`${userName} has been removed from featured sellers.`);
  //       }
  //       setFeaturedSellers(newFeaturedSellers);
  //     } else {
  //       alert(data?.message || 'Failed to update featured status');
  //     }
  //   } catch (error) {
  //     console.error('Error toggling featured status:', error);
  //     alert('Failed to update featured status');
  //   } finally {
  //     setProcessingFeatured(null);
  //   }
  // };

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Get admin's assigned location for filtering
        let adminLocation: AdminLocation | null = null;
        if (user?.role === 'admin' && user?.id) {
          adminLocation = await getAdminAssignedLocation(user.id);
          console.log('Members - Admin location filter:', adminLocation);
        }

        // First, try to get users from the database including role
        let usersData: any[] = [];
        let usersError: any = null;

        try {
          let userQuery = supabase
            .from('users')
            .select('id, full_name, email, mobile_phone, street_address, apartment_unit, city, state, district, country, zip_code, postal_code, coordinates, created_at, default_mode, role, admin_assigned_location');

          // Apply location filter for regional admins
          if (adminLocation) {
            userQuery = applyLocationFilter(userQuery, adminLocation);
          }

          const result = await userQuery;
          usersData = result.data || [];
          usersError = result.error;
        } catch (err) {
          // If role column doesn't exist, try without it
          console.log('Role column might not exist, trying without it...');
          let fallbackQuery = supabase
            .from('users')
            .select('id, full_name, email, mobile_phone, street_address, apartment_unit, city, state, district, country, zip_code, postal_code, coordinates, created_at, default_mode');

          // Apply location filter for regional admins even in fallback
          if (adminLocation) {
            fallbackQuery = applyLocationFilter(fallbackQuery, adminLocation);
          }

          const result = await fallbackQuery;
          usersData = result.data || [];
          usersError = result.error;
        }

        if (usersError) {
          console.error('Failed to fetch members:', usersError);
          setLoading(false);
          return;
        }

        // Get seller profiles to identify sellers
        const { data: sellerProfiles, error: sellerError } = await supabase
          .from('seller_profiles')
          .select('user_id, store_name, is_approved');

        if (sellerError) {
          console.error('Failed to fetch seller profiles:', sellerError);
        }

        const formatted = usersData.map((row) => {
          // Get role from database, default to 'user' if not set
          const userRole = row.role || 'user';

          // Check if user is a seller
          const sellerProfile = sellerProfiles?.find(sp => sp.user_id === row.id);
          const isSeller = !!sellerProfile;

          // Determine defaultMode based on database field, seller status, or role
          let defaultMode: 'buyer' | 'seller' | 'both';
          if (row.default_mode && ['buyer', 'seller', 'both'].includes(row.default_mode)) {
            // Use the default_mode from database if it exists and is valid
            defaultMode = row.default_mode as 'buyer' | 'seller' | 'both';
          } else if (userRole === 'super_admin' || userRole === 'admin') {
            // Admins can be both buyers and sellers
            defaultMode = 'both';
          } else if (isSeller) {
            // If user has a seller profile, they can be both buyer and seller
            defaultMode = 'both';
          } else {
            // For regular users without a specified mode, default to 'buyer'
            defaultMode = 'buyer';
          }

          // Build full address string from all available fields
          const addressParts = [
            row.street_address,
            row.apartment_unit,
            row.city,
            row.district,
            row.state,
            row.country,
            row.postal_code || row.zip_code
          ].filter(Boolean);

          const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not provided';
          const shortLocation = `${row.city || ''}, ${row.state || ''}`.replace(/^,\s*|,\s*$/g, '');

          return {
            id: row.id,
            name: row.full_name || 'Unknown',
            email: row.email || '',
            phone: row.mobile_phone || '',
            status: 'active' as 'active',
            location: shortLocation || 'Location not provided',
            joinDate: row.created_at,
            lastActive: row.created_at,
            defaultMode: defaultMode,
            role: userRole as 'user' | 'admin' | 'super_admin',
            isSeller: isSeller,
            sellerInfo: sellerProfile ? {
              storeName: sellerProfile.store_name,
              isApproved: sellerProfile.is_approved
            } : undefined,
            // Full address for modal display
            fullAddress: fullAddress,
            coordinates: row.coordinates,
            // Individual address fields
            street_address: row.street_address,
            apartment_unit: row.apartment_unit,
            city: row.city,
            state: row.state,
            district: row.district,
            country: row.country,
            zipcode: row.postal_code || row.zip_code
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
    // loadFeaturedSellers();
  }, [user?.role]);






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
    const matchesUserType = userTypeFilter === 'all' ||
      (userTypeFilter === 'buyer' && !member.isSeller && member.defaultMode === 'buyer') ||
      (userTypeFilter === 'seller' && member.isSeller && member.defaultMode !== 'buyer') ||
      (userTypeFilter === 'both' && member.isSeller && member.defaultMode === 'both');

    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.sellerInfo?.storeName && member.sellerInfo.storeName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesUserType && matchesSearch;
  });

  const handleDeleteMember = async (memberId: string) => {
    // Only super admin can delete members
    if (user?.role !== 'super_admin') {
      alert('Only Super Admins can delete members.');
      return;
    }

    const memberToDelete = members.find(m => m.id === memberId);
    const memberName = memberToDelete?.name || 'this member';

    const confirmed = window.confirm(
      `Are you sure you want to delete ${memberName}?\n\n` +
      'This will permanently remove:\n' +
      '• The user account\n' +
      '• All their products/listings\n' +
      '• All their orders and interests\n' +
      '• All their reviews and feedback\n' +
      '• Their seller profile (if applicable)\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) return;

    // Show loading state
    const originalMembers = [...members];
    setMembers(members.map(m =>
      m.id === memberId
        ? { ...m, isDeleting: true }
        : m
    ));

    try {
      const result = await deleteUserWithCascade(memberId);

      if (result.success) {
        // Log successful deletion
        await logUserDeleted(memberId, {
          name: memberName,
          email: memberToDelete?.email,
          deleted_by: user?.id,
          cascade_deleted: ['products', 'orders', 'reviews', 'feedback', 'seller_profile']
        });

        setMembers(members.filter((m) => m.id !== memberId));
        alert(`${memberName} and all related data have been deleted successfully.`);
      } else {
        // Restore original state on error
        setMembers(originalMembers);
        alert(`Failed to delete ${memberName}: ${result.error}`);
      }
    } catch (error: any) {
      // Restore original state on error
      setMembers(originalMembers);
      console.error('Error deleting member:', error);
      alert(`Failed to delete ${memberName}: ${error.message || 'Unknown error'}`);
    }
  };

  const handlePromoteToAdmin = (member: Member) => {
    setSelectedMemberForAdmin(member);
    setAdminLocationModalMode('promote');
    setShowAdminLocationModal(true);
  };

  const handleEditAdminLocation = (member: Member) => {
    setSelectedMemberForAdmin(member);
    setAdminLocationModalMode('edit');
    setShowAdminLocationModal(true);
  };

  const handleAdminLocationSuccess = () => {
    // Refresh the members list
    window.location.reload();
  };


  const handleRoleChange = async (memberId: string, newRole: 'user' | 'admin' | 'super_admin') => {
    try {
      // Only super admin can change roles
      if (user?.role !== 'super_admin') {
        alert('Only Super Admins can assign roles.');
        return;
      }

      // Get member details for confirmation
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      // Confirmation dialog with role details
      const confirmed = window.confirm(
        `Are you sure you want to change ${member.name}'s role from ${getRoleLabel(member.role || 'user')} to ${roleLabels[newRole]}?\n\n` +
        `${roleDescriptions[newRole]}`
      );

      if (!confirmed) return;

      // Use the utility function to update role
      const result = await updateUserRole(memberId, newRole);

      if (!result.success) {
        alert(result.error || 'Failed to update user role.');
        return;
      }

      // Update local state
      setMembers(members.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      ));

      alert(`User role updated to ${roleLabels[newRole]} successfully.`);
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

  const getUserTypeColor = (member: Member) => {
    if (member.isSeller && member.defaultMode === 'both') {
      return 'bg-purple-100 text-purple-800';
    } else if (member.isSeller || member.defaultMode === 'seller') {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  const getUserTypeLabel = (member: Member) => {
    if (member.isSeller && member.defaultMode === 'both') {
      return 'Buyer & Seller';
    } else if (member.isSeller || member.defaultMode === 'seller') {
      return 'Seller';
    } else {
      return 'Buyer';
    }
  };



  const handleExportMembers = async () => {
    const filename = generateFilename('members');

    // Transform members data for export
    const exportData = filteredMembers.map(member => ({
      full_name: member.name,
      email: member.email,
      role: member.role || 'user',
      defaultMode: member.defaultMode,
      phone: member.phone,
      address: '', // Not available in current data
      city: '', // Not available in current data
      state: '', // Not available in current data
      country: member.location,
      zipcode: '', // Not available in current data
      created_at: member.joinDate,
      updated_at: member.lastActive,
      is_seller: member.isSeller,
      seller_status: member.isSeller ? (member.sellerInfo?.isApproved ? 'Approved' : 'Pending') : 'N/A',
      user_type: getUserTypeLabel(member)
    }));

    // Custom export columns for members
    const exportColumns = [
      ...EXPORT_COLUMNS.USERS,
      { key: 'is_seller', label: 'Is Seller', formatter: formatBooleanForExport },
      { key: 'seller_status', label: 'Seller Status' },
      { key: 'user_type', label: 'User Type' }
    ];

    await exportWithLoading(
      () => Promise.resolve(exportData),
      exportColumns,
      filename,
      setExporting,
      (count) => {
        setExportMessage(`Successfully exported ${count} members`);
        setTimeout(() => setExportMessage(null), 3000);
      },
      (error) => {
        setExportMessage(`Export failed: ${error}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
        <span className="mt-3 text-sm sm:text-base text-gray-600 text-center">Loading members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">Members</h2>
              {user?.role === 'super_admin' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
                  <Crown className="h-3 w-3" />
                  Super Admin
                </span>
              )}
              {user?.role === 'admin' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                  <AlertTriangle className="h-3 w-3" />
                  Admin (View Only)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
              <span>Total: {members.length}</span>
              <span>Buyers: {members.filter(m => !m.isSeller && m.defaultMode === 'buyer').length}</span>
              <span>Sellers: {members.filter(m => m.isSeller).length}</span>
              <span>Both: {members.filter(m => m.isSeller && m.defaultMode === 'both').length}</span>
            </div>

            {user?.role === 'super_admin' && (
              <p className="text-xs sm:text-sm text-green-600 mt-2 flex items-start gap-1">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                <span>Full access: Edit, delete, and assign user roles</span>
              </p>
            )}
            {user?.role === 'admin' && (
              <p className="text-xs sm:text-sm text-orange-600 mt-2 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
                <span>Limited access: View members only - no editing, deleting, or role assignment</span>
              </p>
            )}
          </div>

          <div className="flex justify-center sm:justify-end">
            <button
              onClick={handleExportMembers}
              disabled={exporting || filteredMembers.length === 0}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm w-full sm:w-auto justify-center"
            >
              <Download className={`h-3 w-3 sm:h-4 sm:w-4 ${exporting ? 'animate-spin' : ''}`} />
              {exporting ? 'Exporting...' : 'Export Members'}
            </button>
          </div>
        </div>
      </div>

      {/* Export Message */}
      {exportMessage && (
        <div className={`p-4 rounded-lg ${
          exportMessage.includes('failed') || exportMessage.includes('Error')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {exportMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={userTypeFilter}
                onChange={(e) => setUserTypeFilter(e.target.value as typeof userTypeFilter)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All User Types</option>
                <option value="buyer">Buyers Only</option>
                <option value="seller">Sellers Only</option>
              </select>

            </div>
          </div>
        </div>

        {/* Mobile Card Layout */}
        <div className="block lg:hidden">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="text-gray-400 mb-4">
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No members found</h3>
              <p className="text-xs text-gray-500 text-center">
                {searchTerm || userTypeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No members have been added yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSelectedMember(member);
                  setShowProfileModal(true);
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{member.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{member.email}</p>
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="text-gray-900">{member.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Address:</span>
                    <span className="text-gray-900 text-right">{member.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Type:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getUserTypeColor(member)}`}>
                      {member.isSeller && <Store className="h-3 w-3" />}
                      {getUserTypeLabel(member)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Role:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role ?? '')}`}>
                      {getRoleLabel(member.role ?? '')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Joined:</span>
                    <span className="text-gray-900">
                      {format(new Date(member.joinDate), 'MMM d, yyyy')}
                    </span>
                  </div>
                  {member.isSeller && member.sellerInfo?.storeName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Store:</span>
                      <span className="text-gray-900 flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        {member.sellerInfo.storeName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Mobile Actions */}
                {user?.role === 'admin' ? (
                  <div className="mt-3 text-center">
                    <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                      View Only
                    </span>
                  </div>
                ) : user?.role === 'super_admin' ? (
                  <div className="mt-3 space-y-2">
                    {/* Role Management Buttons */}
                    {member.role === 'user' && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handlePromoteToAdmin(member);
                          }}
                          className="flex items-center gap-1 text-purple-600 hover:text-purple-700 text-xs min-w-[160px]"
                        >
                          <Crown className="h-3 w-3" />
                          Promote to Regional Admin
                        </Button>
                      </div>
                    )}

                    {member.role === 'admin' && (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleEditAdminLocation(member);
                          }}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs min-w-[120px]"
                        >
                          <Crown className="h-3 w-3" />
                          Edit Location
                        </Button>
                      </div>
                    )}

                    {/* Delete Button */}
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleDeleteMember(member.id);
                        }}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs min-w-[80px]"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden lg:block">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-gray-400 mb-4">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm">
                {searchTerm || userTypeFilter !== 'all'
                  ? 'Try adjusting your search or filters to find members'
                  : 'No members have been added to the system yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Member</div>
                    </th>
                    <th className="px-3 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</div>
                    </th>
                    <th className="px-3 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</div>
                    </th>
                    <th className="px-3 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">User Type</div>
                    </th>
                    <th className="px-3 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</div>
                    </th>

                    <th className="px-3 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</div>
                    </th>
                    <th className="px-3 py-3 text-center">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</div>
                    </th>
                  </tr>
                </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedMember(member);
                    setShowProfileModal(true);
                  }}
                >
                  <td className="px-3 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-500">{member.phone}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">{member.location}</div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getUserTypeColor(member)}`}>
                        {member.isSeller && <Store className="h-3 w-3" />}
                        {getUserTypeLabel(member)}
                      </span>
                      {member.isSeller && member.sellerInfo?.storeName && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {member.sellerInfo.storeName}
                        </div>
                      )}
                      {/* {getSellerStatus(member) && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSellerStatus(member)?.color}`}>
                          {getSellerStatus(member)?.label}
                        </span>
                      )} */}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role ?? '')}`}>
                      {getRoleLabel(member.role ?? '')}
                    </span>
                  </td>

                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {format(new Date(member.joinDate), 'MMM d, yyyy')}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-center">
                    {user?.role === 'admin' ? (
                      // Admin users can only view - no actions available
                      <div className="flex justify-center">
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          View Only
                        </span>
                      </div>
                    ) : user?.role === 'super_admin' ? (
                      // Super admin has full access to all members (buyers and sellers)
                      expandedRowId === member.id ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          {/* Role Management Buttons */}
                          {member.role === 'user' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handlePromoteToAdmin(member);
                              }}
                              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 min-w-[160px]"
                            >
                              <Crown className="h-3 w-3" />
                              Promote to Regional Admin
                            </Button>
                          )}

                          {member.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handleEditAdminLocation(member);
                              }}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 min-w-[120px]"
                            >
                              <Crown className="h-3 w-3" />
                              Edit Location
                            </Button>
                          )}

                          {/* Delete Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              handleDeleteMember(member.id);
                            }}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700 min-w-[80px]"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click
                              setExpandedRowId(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            setExpandedRowId(member.id);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      )
                    ) : null}
                  </td>

                </tr>
              ))}
            </tbody>
              </table>
            </div>
          )}
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
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'user' | 'admin' | 'super_admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="user">User - Basic access only</option>
                  <option value="admin">Admin - View-only admin features</option>
                  <option value="super_admin">Super Admin - Full system access</option>
                </select>
              </div>

              {/* Role Descriptions */}
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Role Permissions:</h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs w-fit">User</span>
                      <span className="flex-1">Basic platform access, can buy/sell products</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs w-fit">Admin</span>
                      <span className="flex-1">View members, orders, and interests - no editing/deleting capabilities</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs w-fit">Super Admin</span>
                      <span className="flex-1">Full system access, can edit/delete members, assign roles, direct password changes</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Role changes take effect immediately and will affect the user's access permissions.
                  {selectedRole === 'super_admin' && (
                    <span className="block mt-1 font-medium">
                      Super Admin role grants full system access including direct password management.
                    </span>
                  )}
                  {selectedRole === 'admin' && (
                    <span className="block mt-1">
                      Admin role provides view-only access to admin features without editing capabilities.
                    </span>
                  )}
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

      {/* Admin Location Modal */}
      {selectedMemberForAdmin && (
        <AdminLocationModal
          isOpen={showAdminLocationModal}
          onClose={() => {
            setShowAdminLocationModal(false);
            setSelectedMemberForAdmin(null);
          }}
          onSuccess={handleAdminLocationSuccess}
          user={{
            id: selectedMemberForAdmin.id,
            name: selectedMemberForAdmin.name,
            email: selectedMemberForAdmin.email,
            role: selectedMemberForAdmin.role,
          }}
          mode={adminLocationModalMode}
        />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        user={selectedMember ? {
          id: selectedMember.id,
          name: selectedMember.name,
          email: selectedMember.email,
          phone: selectedMember.phone,
          defaultMode: selectedMember.defaultMode,
          role: selectedMember.role,
          address: selectedMember.fullAddress,
          street_address: selectedMember.street_address,
          apartment_unit: selectedMember.apartment_unit,
          city: selectedMember.city,
          state: selectedMember.state,
          district: selectedMember.district,
          country: selectedMember.country,
          zipcode: selectedMember.zipcode,
          coordinates: selectedMember.coordinates,
          registrationDate: selectedMember.joinDate,
          lastActive: selectedMember.lastActive,
          store_name: selectedMember.sellerInfo?.storeName,
          is_approved: selectedMember.sellerInfo?.isApproved
        } : null}
        title="Member Profile"
      />

    </div>
  );
}


//members

