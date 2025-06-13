import React, { useState } from 'react';
import { MessageSquare, User, Store, Search, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Feedback {
  id: string;
  type: 'customer' | 'farmer';
  userName: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  date: string;
  region: string;
}

const mockFeedback: Feedback[] = [
  {
    id: '1',
    type: 'customer',
    userName: 'John Doe',
    subject: 'Delivery Issue',
    message: 'My order was delayed by 2 days without any notification.',
    status: 'new',
    date: '2024-03-10',
    region: 'California'
  },
  {
    id: '2',
    type: 'farmer',
    userName: 'Green Valley Farm',
    subject: 'Technical Problem',
    message: 'Unable to update product prices in the system.',
    status: 'in_progress',
    date: '2024-03-09',
    region: 'Texas'
  },
  {
    id: '3',
    type: 'customer',
    userName: 'Sarah Smith',
    subject: 'Product Quality',
    message: 'Received damaged fruits in my last order.',
    status: 'resolved',
    date: '2024-03-08',
    region: 'California'
  },
  {
    id: '4',
    type: 'farmer',
    userName: 'Fresh Fields',
    subject: 'Account Access',
    message: 'Need help resetting my password.',
    status: 'new',
    date: '2024-03-11',
    region: 'Florida'
  }
];

export function Feedback() {
  const user = useAuthStore((state) => state.user);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedback);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: Feedback['status']) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = (feedbackId: string, newStatus: Feedback['status']) => {
    setFeedbacks(feedbacks.map(feedback =>
      feedback.id === feedbackId ? { ...feedback, status: newStatus } : feedback
    ));
  };

  const filteredFeedback = feedbacks.filter(feedback => {
    // Filter by region for admin users
    if (user?.role === 'admin' && user.regions) {
      if (!user.regions.some(r => r.name === feedback.region)) {
        return false;
      }
    }

    // Filter by status
    if (selectedStatus !== 'all' && feedback.status !== selectedStatus) {
      return false;
    }

    // Filter by type
    if (selectedType !== 'all' && feedback.type !== selectedType) {
      return false;
    }

    // Search term
    const searchLower = searchTerm.toLowerCase();
    return (
      feedback.userName.toLowerCase().includes(searchLower) ||
      feedback.subject.toLowerCase().includes(searchLower) ||
      feedback.message.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Feedback Management</h2>
        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">All Types</option>
            <option value="customer">Customer</option>
            <option value="farmer">Farmer</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Search by name, subject, or message..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="grid gap-4">
        {filteredFeedback.map((feedback) => (
          <div key={feedback.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                {feedback.type === 'customer' ? (
                  <User className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                ) : (
                  <Store className="h-10 w-10 text-gray-400 bg-gray-100 rounded-full p-2" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">{feedback.userName}</h3>
                    <span className="text-sm text-gray-500">({feedback.type})</span>
                  </div>
                  <p className="text-sm text-gray-500">{feedback.date}</p>
                  {user?.role === 'super_admin' && (
                    <p className="text-sm text-gray-500">Region: {feedback.region}</p>
                  )}
                </div>
              </div>
              <select
                value={feedback.status}
                onChange={(e) => handleStatusChange(feedback.id, e.target.value as Feedback['status'])}
                className={`px-3 py-1 rounded-full text-sm ${getStatusColor(feedback.status)}`}
              >
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900">{feedback.subject}</h4>
              <p className="mt-1 text-gray-600">{feedback.message}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700">
                Add Response
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}