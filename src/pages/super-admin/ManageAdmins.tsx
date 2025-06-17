import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Select from 'react-select';
import { getAllUsers, updateUserRole, assignRegionsToAdmin, updateUserRoleByEmail } from '../../services/adminService';
import { AdminUser } from '../../services/adminService';
import { supabase } from '../../supabaseClient';
import { toast } from 'react-toastify';

interface Region {
  country: string;
  name: string;
}

interface Admin {
  id: string;
  name: string;
  email: string;
  regions: Region[];
  status: 'active' | 'inactive';
}

const countries = [
  {
    label: 'United States',
    options: [
      { value: 'california', label: 'California', country: 'USA' },
      { value: 'texas', label: 'Texas', country: 'USA' },
      { value: 'florida', label: 'Florida', country: 'USA' },
      { value: 'new_york', label: 'New York', country: 'USA' },
    ],
  },
  {
    label: 'Canada',
    options: [
      { value: 'ontario', label: 'Ontario', country: 'Canada' },
      { value: 'quebec', label: 'Quebec', country: 'Canada' },
      { value: 'british_columbia', label: 'British Columbia', country: 'Canada' },
      { value: 'alberta', label: 'Alberta', country: 'Canada' },
    ],
  },
  {
    label: 'United Kingdom',
    options: [
      { value: 'england', label: 'England', country: 'UK' },
      { value: 'scotland', label: 'Scotland', country: 'UK' },
      { value: 'wales', label: 'Wales', country: 'UK' },
    ],
  },
];

export function ManageAdmins() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState<any[]>([]);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const users = await getAllUsers();
      // Filter only admin users
      setAdmins(users.filter(user => user.role === 'admin' || user.role === 'super_admin'));
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingAdmin) {
        // Update existing admin
        await updateUserRole(editingAdmin.id, 'admin');
        await assignRegionsToAdmin(editingAdmin.id, selectedRegions.map(region => ({
          country: region.country,
          name: region.label,
        })));
      } else {
        // Create new admin user
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { 
            name,
            regions: selectedRegions.map(region => ({
              country: region.country,
              name: region.label,
            }))
          },
          app_metadata: { role: 'admin' },
        });
        
        if (error) throw error;
      }
      
      // Refresh admin list
      await fetchAdmins();
      setShowAddModal(false);
      setSelectedRegions([]);
      setEmail('');
      setName('');
      setEditingAdmin(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create/update admin');
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    try {
      // Downgrade to regular user instead of deleting
      await updateUserRole(adminId, 'buyer');
      await fetchAdmins();
    } catch (err) {
      console.error('Error removing admin:', err);
    }
  };

  const handleEditAdmin = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEmail(admin.email);
    setName(admin.name);
    setSelectedRegions(admin.regions?.map(region => ({
      value: region.name.toLowerCase(),
      label: region.name,
      country: region.country,
    })) || []);
    setShowAddModal(true);
  };

  const handleMakeSuperAdmin = async (email: string) => {
    try {
      await updateUserRoleByEmail(email, 'super_admin');
      // Refresh your user list or show success message
      toast.success(`User ${email} has been promoted to Super Admin`);
    } catch (error) {
      console.error('Error making super admin:', error);
      toast.error('Failed to update user role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Manage Regional Admins</h2>
        <button
          onClick={() => {
            setEditingAdmin(null);
            setSelectedRegions([]);
            setShowAddModal(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Admin
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Regions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {admin.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {admin.email}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {admin.regions.map((region, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                      >
                        {region.country} - {region.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    admin.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditAdmin(admin)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
            </h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingAdmin?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter admin name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingAdmin?.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regions
                </label>
                <Select
                  isMulti
                  options={countries}
                  value={selectedRegions}
                  onChange={setSelectedRegions}
                  className="w-full"
                  placeholder="Select regions..."
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAdmin(null);
                    setSelectedRegions([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  {editingAdmin ? 'Save Changes' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

