import React, { useState } from 'react';
import { Search, Filter, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  products: string[];
  status: 'pending' | 'approved' | 'suspended';
  registrationDate: string;
}

const mockFarmers: Farmer[] = [
  {
    id: '1',
    name: "Green Valley Farm",
    email: "contact@greenvalley.com",
    phone: "(555) 123-4567",
    location: "California, USA",
    products: ["Organic Vegetables", "Fruits", "Herbs"],
    status: 'approved',
    registrationDate: '2024-03-01'
  },
  {
    id: '2',
    name: "Sunrise Dairy",
    email: "info@sunrisedairy.com",
    phone: "(555) 234-5678",
    location: "Wisconsin, USA",
    products: ["Milk", "Cheese", "Yogurt"],
    status: 'pending',
    registrationDate: '2024-03-10'
  },
  {
    id: '3',
    name: "Fresh Fields",
    email: "hello@freshfields.com",
    phone: "(555) 345-6789",
    location: "Oregon, USA",
    products: ["Organic Produce", "Honey", "Eggs"],
    status: 'suspended',
    registrationDate: '2024-02-15'
  }
];

export function Farmers() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmers, setFarmers] = useState<Farmer[]>(mockFarmers);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusIcon = (status: Farmer['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'suspended':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadgeColor = (status: Farmer['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleEditFarmer = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setShowEditModal(true);
  };

  const handleStatusChange = (farmerId: string, newStatus: Farmer['status']) => {
    setFarmers(farmers.map(farmer => 
      farmer.id === farmerId ? { ...farmer, status: newStatus } : farmer
    ));
  };

  const filteredFarmers = statusFilter === 'all' 
    ? farmers 
    : farmers.filter(farmer => farmer.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search farmers..."
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFarmers.map((farmer) => (
              <tr key={farmer.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{farmer.name}</div>
                  <div className="text-sm text-gray-500">{farmer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {farmer.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {farmer.location}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {farmer.products.map((product, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 rounded-full"
                      >
                        {product}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(farmer.status)}
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(farmer.status)}`}>
                      {farmer.status.charAt(0).toUpperCase() + farmer.status.slice(1)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditFarmer(farmer)}
                      className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded"
                    >
                      Edit
                    </button>
                    <select
                      value={farmer.status}
                      onChange={(e) => handleStatusChange(farmer.id, e.target.value as Farmer['status'])}
                      className="text-sm border border-gray-300 rounded px-2"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approve</option>
                      <option value="suspended">Suspend</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditModal && selectedFarmer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Farmer Profile</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  defaultValue={selectedFarmer.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={selectedFarmer.email}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  defaultValue={selectedFarmer.phone}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  defaultValue={selectedFarmer.location}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}