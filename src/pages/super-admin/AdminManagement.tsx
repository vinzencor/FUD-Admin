import React, { useState, useEffect } from 'react';
import { 
  UserCog, 
  Search, 
  Filter, 
  MapPin, 
  Crown, 
  Trash2, 
  Edit, 
  Download, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  Activity,
  UserPlus
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../store/authStore';
import {
  getAllAdminUsers,
  getAdminActivityStats,
  demoteAdminToUser,
  debugDatabaseUsers,
  assignAdminRole,
  formatLocationDisplay,
  formatLocationDisplayDetailed,
  formatLocationCompact,
  AdminUser,
  AdminActivityStats,
  AdminLocation
} from '../../services/locationAdminService';
import { AdminLocationModal } from '../../components/admin/AdminLocationModal';
import { EnhancedAdminAssignment } from '../../components/admin/EnhancedAdminAssignment';
import { exportWithLoading, generateFilename, ExportColumn } from '../../utils/exportUtils';

export function AdminManagement() {
  const user = useAuthStore((state) => state.user);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'super_admin'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [adminStats, setAdminStats] = useState<Map<string, AdminActivityStats>>(new Map());
  const [demoting, setDemoting] = useState<string | null>(null); // Track which admin is being demoted
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<'manage' | 'assign'>('manage');

  // Redirect if not super admin
  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      window.location.href = '/admin/dashboard';
    }
  }, [user]);

  useEffect(() => {
    loadAdmins();
  }, []);

  // Function to assign super admin role
  const assignSuperAdminRole = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      console.log('Assigning super admin role...');
      const result = await assignAdminRole('rahulpradeepan77@gmail.com', 'super_admin');

      if (result.success) {
        setSuccessMessage(result.message);
        // Reload admin users after assignment
        await loadAdmins();
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error assigning super admin role:', error);
      setError('Failed to assign super admin role');
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      console.log('Loading admin users...');

      // Debug database contents
      await debugDatabaseUsers();

      const adminUsers = await getAllAdminUsers();
      console.log('Fetched admin users:', adminUsers);

      if (adminUsers.length === 0) {
        console.log('No admin users found in database');
        setError('No admin users found in the database. Please assign admin roles to users first.');
        setSuccessMessage(null);
      } else {
        console.log('Successfully loaded admin users:', adminUsers.length);
        console.log('Admin users details:', adminUsers.map(admin => ({
          name: admin.name,
          email: admin.email,
          role: admin.role,
          hasLocation: !!admin.assignedLocation,
          assignedBy: admin.assignedByName
        })));

        // Clear any previous errors
        setError(null);

        // Show success message for real data
        setSuccessMessage(`Successfully loaded ${adminUsers.length} admin user(s) from database.`);
      }

      setAdmins(adminUsers);

      // Load activity stats for each admin
      const statsMap = new Map<string, AdminActivityStats>();
      for (const admin of adminUsers) {
        if (admin.role === 'admin') {
          try {
            const stats = await getAdminActivityStats(admin.id);
            statsMap.set(admin.id, stats);
          } catch (statsError) {
            console.error(`Error loading stats for admin ${admin.id}:`, statsError);
            // Continue loading other stats even if one fails
          }
        }
      }
      setAdminStats(statsMap);

    } catch (err) {
      console.error('Error loading admins:', err);
      setError('Failed to load admin users. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteAdmin = async (adminId: string, adminName: string, adminRole: string) => {
    // Prevent self-demotion
    if (adminId === user?.id) {
      setError('You cannot remove your own admin privileges! Please ask another super admin to do this.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    // Clear any existing messages
    setError(null);
    setSuccessMessage(null);

    const roleLabel = adminRole === 'super_admin' ? 'Super Admin' : 'Regional Admin';
    const confirmed = window.confirm(
      `⚠️ REMOVE ADMIN PRIVILEGES\n\n` +
      `Admin: ${adminName}\n` +
      `Current Role: ${roleLabel}\n\n` +
      `This action will:\n` +
      `• Remove their admin/super_admin role\n` +
      `• Convert them to a regular user\n` +
      `• Clear their location assignment (if any)\n` +
      `• Remove access to admin features\n` +
      `• Keep their user account and data intact\n\n` +
      `The user will still exist in the system but will lose all admin privileges.\n\n` +
      `Are you sure you want to proceed?`
    );

    if (!confirmed) return;

    try {
      setDemoting(adminId);
      const success = await demoteAdminToUser(adminId);

      if (success) {
        // Remove from admin list
        setAdmins(admins.filter(admin => admin.id !== adminId));

        // Show success message
        setSuccessMessage(
          `✅ ${adminName} has been successfully converted to a regular user. ` +
          `They no longer have admin privileges but their account remains active.`
        );

        // Clear success message after 7 seconds
        setTimeout(() => setSuccessMessage(null), 7000);
      } else {
        setError('Failed to remove admin privileges. Please try again or contact support.');
        setTimeout(() => setError(null), 5000);
      }
    } catch (error) {
      console.error('Error demoting admin:', error);
      setError('An unexpected error occurred while removing admin privileges. Please try again.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setDemoting(null);
    }
  };

  const handleEditLocation = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowLocationModal(true);
  };

  const handleLocationModalSuccess = () => {
    loadAdmins(); // Refresh the list
  };

  const handleExportAdmins = async () => {
    const filename = generateFilename('admin-management');
    
    const exportColumns: ExportColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'assignedLocationDisplay', label: 'Assigned Location' },
      { key: 'managedUsers', label: 'Managed Users' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Promoted Date' }
    ];

    const exportData = filteredAdmins.map(admin => ({
      ...admin,
      assignedLocationDisplay: formatLocationDisplay(admin.assignedLocation),
      managedUsers: adminStats.get(admin.id)?.managedUsers || 0,
      createdAt: new Date(admin.createdAt).toLocaleDateString()
    }));
    
    await exportWithLoading(
      () => Promise.resolve(exportData),
      exportColumns,
      filename,
      setExporting,
      (count) => {
        setExportMessage(`Successfully exported ${count} admin records`);
        setTimeout(() => setExportMessage(null), 3000);
      },
      (error) => {
        setExportMessage(`Export failed: ${error}`);
        setTimeout(() => setExportMessage(null), 5000);
      }
    );
  };

  // Filter admins based on search and filters
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
    
    const matchesLocation = !locationFilter || 
                           formatLocationDisplay(admin.assignedLocation).toLowerCase().includes(locationFilter.toLowerCase());
    
    return matchesSearch && matchesRole && matchesLocation;
  });

  const getRoleBadgeColor = (role: string) => {
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
        return 'Regional Admin';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
        <span className="mt-3 text-sm sm:text-base text-gray-600 text-center">Loading admin users...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Admins</h3>
        <p className="text-sm text-gray-500 text-center mb-4">{error}</p>
        <Button onClick={loadAdmins} className="flex items-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <UserCog className="h-6 w-6 text-purple-600" />
                Admin Management
              </h2>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 flex items-center gap-1 w-fit">
                <Crown className="h-3 w-3" />
                Super Admin Only
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-600">
              <span>Total Admins: {admins.length}</span>
              <span>Regional Admins: {admins.filter(a => a.role === 'admin').length}</span>
              <span>Super Admins: {admins.filter(a => a.role === 'super_admin').length}</span>
            </div>
            
            <p className="text-xs sm:text-sm text-green-600 mt-2 flex items-start gap-1">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
              <span>Manage Regional admin users, their locations, and permissions</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            <Button
              onClick={loadAdmins}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={handleExportAdmins}
              disabled={exporting || filteredAdmins.length === 0}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm w-full sm:w-auto justify-center"
            >
              <Download className={`h-3 w-3 sm:h-4 sm:w-4 ${exporting ? 'animate-spin' : ''}`} />
              {exporting ? 'Exporting...' : 'Export Admins'}
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {exportMessage && (
        <div className={`p-4 rounded-lg ${
          exportMessage.includes('failed') || exportMessage.includes('Error')
            ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {exportMessage}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm">{successMessage}</div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Manage Regional Admins
              </div>
            </button>
            <button
              onClick={() => setActiveTab('assign')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assign'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 " />
                Assign New Regional Admin
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'assign' ? (
        <EnhancedAdminAssignment
          onAdminAssigned={() => {
            loadAdmins();
            setActiveTab('manage');
          }}
          onError={(error) => setError(error)}
          onSuccess={(message) => setSuccessMessage(message)}
        />
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search admins by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Regional Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
              <input
                type="text"
                placeholder="Filter by location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Mobile Card Layout */}
        <div className="block lg:hidden">
          {filteredAdmins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="text-gray-400 mb-4">
                <UserCog className="h-12 w-12" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Regional admins found</h3>
              <p className="text-xs text-gray-500 text-center mb-4">
                {searchTerm || roleFilter !== 'all' || locationFilter
                  ? 'Try adjusting your search or filters'
                  : 'No admin users have been created yet'
                }
              </p>
              {!searchTerm && roleFilter === 'all' && !locationFilter && (
                <button
                  onClick={assignSuperAdminRole}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white text-xs rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Assigning...' : 'Assign Super Admin Role'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {filteredAdmins.map((admin) => {
                const stats = adminStats.get(admin.id);
                return (
                  <div
                    key={admin.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                          {admin.name}
                          {admin.id === user?.id && (
                            <span className="text-xs text-purple-600">(You)</span>
                          )}
                          {admin.email === 'rahulpradeepan77@gmail.com' && (
                            <span className="text-xs text-blue-600">(System Admin)</span>
                          )}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{admin.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getRoleBadgeColor(admin.role)}`}>
                          {getRoleLabel(admin.role)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location:</span>
                        <span className="text-gray-900 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {admin.role === 'super_admin'
                            ? 'Global Access'
                            : admin.assignedLocation
                              ? formatLocationDisplay(admin.assignedLocation)
                              : 'No assignment'
                          }
                        </span>
                      </div>

                      {admin.role === 'admin' && admin.assignedLocation?.streets && admin.assignedLocation.streets.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Streets:</span>
                          <span className="text-gray-900 text-xs">
                            {admin.assignedLocation.streets.length > 2
                              ? `${admin.assignedLocation.streets.slice(0, 2).join(', ')} +${admin.assignedLocation.streets.length - 2} more`
                              : admin.assignedLocation.streets.join(', ')
                            }
                          </span>
                        </div>
                      )}

                      {admin.role === 'admin' && admin.assignedByName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Assigned by:</span>
                          <span className="text-gray-900 text-xs">{admin.assignedByName}</span>
                        </div>
                      )}

                      {admin.role === 'admin' && admin.assignedDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Assigned:</span>
                          <span className="text-gray-900 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(admin.assignedDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {admin.role === 'admin' && stats && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Manages:</span>
                          <span className="text-gray-900 flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {stats.managedUsers} users
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-500">Promoted:</span>
                        <span className="text-gray-900 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Actions */}
                    {admin.id !== user?.id && (
                      <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {admin.role === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLocation(admin)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs"
                          >
                            <Edit className="h-3 w-3" />
                            Edit Location
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDemoteAdmin(admin.id, admin.name, admin.role)}
                          disabled={demoting === admin.id}
                          className="flex items-center gap-1 text-red-600 hover:text-red-700 text-xs"
                        >
                          {demoting === admin.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3" />
                              Remove Regional Admin
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden lg:block">
          {filteredAdmins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-gray-400 mb-4">
                <UserCog className="h-16 w-16" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Regional admins found</h3>
              <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
                {searchTerm || roleFilter !== 'all' || locationFilter
                  ? 'Try adjusting your search or filters to find admin users'
                  : 'No admin users have been created in the system yet'
                }
              </p>
              {!searchTerm && roleFilter === 'all' && !locationFilter && (
                <button
                  onClick={assignSuperAdminRole}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <UserCog className="h-4 w-4" />
                  {loading ? 'Assigning...' : 'Assign Super Admin Role'}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Location</div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment Details</div>
                    </th>
                    <th className="px-6 py-3 text-left">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</div>
                    </th>
                    <th className="px-6 py-3 text-center">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAdmins.map((admin) => {
                    const stats = adminStats.get(admin.id);
                    return (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {admin.name}
                                {admin.id === user?.id && (
                                  <span className="text-xs text-purple-600 font-normal">(You)</span>
                                )}
                                {admin.email === 'rahulpradeepan77@gmail.com' && (
                                  <span className="text-xs text-blue-600 font-normal">(System Admin)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{admin.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getRoleBadgeColor(admin.role)}>
                            {getRoleLabel(admin.role)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                              {admin.role === 'super_admin'
                                ? 'Global Access'
                                : admin.assignedLocation
                                  ? formatLocationDisplay(admin.assignedLocation)
                                  : 'No assignment'
                              }
                            </div>
                            {admin.role === 'admin' && admin.assignedLocation?.streets && admin.assignedLocation.streets.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1 ml-6">
                                {admin.assignedLocation.streets.length > 3
                                  ? `${admin.assignedLocation.streets.slice(0, 3).join(', ')} +${admin.assignedLocation.streets.length - 3} more`
                                  : admin.assignedLocation.streets.join(', ')
                                }
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {admin.role === 'admin' ? (
                            <div className="text-sm text-gray-900">
                              {admin.assignedByName && (
                                <div className="flex items-center mb-1">
                                  <Crown className="h-3 w-3 text-gray-400 mr-2" />
                                  <span className="text-xs">By: {admin.assignedByName}</span>
                                </div>
                              )}
                              {admin.assignedDate && (
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 text-gray-400 mr-2" />
                                  <span className="text-xs">{new Date(admin.assignedDate).toLocaleDateString()}</span>
                                </div>
                              )}
                              {!admin.assignedByName && !admin.assignedDate && (
                                <span className="text-xs text-gray-500">No assignment data</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {admin.role === 'admin' && stats ? (
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center">
                                <Users className="h-4 w-4 text-gray-400 mr-2" />
                                {stats.managedUsers} users
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Global Access</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {admin.id !== user?.id ? (
                            <div className="flex items-center justify-center space-x-2">
                              {admin.role === 'admin' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditLocation(admin)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit Location
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDemoteAdmin(admin.id, admin.name, admin.role)}
                                disabled={demoting === admin.id}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                {demoting === admin.id ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Removing...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-3 w-3" />
                                    Remove Admin
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                                Current User
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Admin Location Modal */}
      {selectedAdmin && (
        <AdminLocationModal
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={handleLocationModalSuccess}
          user={{
            id: selectedAdmin.id,
            name: selectedAdmin.name,
            email: selectedAdmin.email,
            role: selectedAdmin.role,
            currentLocation: selectedAdmin.assignedLocation ?? undefined,
          }}
          mode="edit"
        />
      )}
        </>
      )}
    </div>
  );
}
