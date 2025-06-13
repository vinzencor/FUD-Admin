import React, { useState } from 'react';
import { Calendar, Search, Filter, Download } from 'lucide-react';
import { useActivityLogStore, ActivityType } from '../../store/activityLogStore';

const activityTypeLabels: Record<ActivityType, string> = {
  farmer_approval: 'Farmer Approval',
  farmer_suspension: 'Farmer Suspension',
  order_status_change: 'Order Status Change',
  farmer_edit: 'Farmer Edit',
};

const getActivityTypeColor = (type: ActivityType) => {
  switch (type) {
    case 'farmer_approval':
      return 'bg-green-100 text-green-800';
    case 'farmer_suspension':
      return 'bg-red-100 text-red-800';
    case 'order_status_change':
      return 'bg-blue-100 text-blue-800';
    case 'farmer_edit':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function ActivityLog() {
  const logs = useActivityLogStore((state) => state.logs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ActivityType>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || log.type === selectedType;

    const matchesDate =
      (!dateRange.start || new Date(log.timestamp) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(log.timestamp) <= new Date(dateRange.end));

    return matchesSearch && matchesType && matchesDate;
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Admin', 'Email', 'Action Type', 'Description'].join(','),
      ...filteredLogs.map((log) =>
        [
          new Date(log.timestamp).toLocaleString(),
          log.adminName,
          log.adminEmail,
          activityTypeLabels[log.type],
          log.description,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Activity Log</h2>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Download className="h-5 w-5 mr-2" />
          Export Log
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by admin or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as 'all' | ActivityType)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Activities</option>
          {Object.entries(activityTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Action Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.adminName}</div>
                    <div className="text-sm text-gray-500">{log.adminEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getActivityTypeColor(
                        log.type
                      )}`}
                    >
                      {activityTypeLabels[log.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{log.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.metadata.orderId && (
                      <div>Order ID: {log.metadata.orderId}</div>
                    )}
                    {log.metadata.farmerId && (
                      <div>Farmer ID: {log.metadata.farmerId}</div>
                    )}
                    {log.metadata.oldStatus && log.metadata.newStatus && (
                      <div>
                        Status: {log.metadata.oldStatus} → {log.metadata.newStatus}
                      </div>
                    )}
                    {log.metadata.region && <div>Region: {log.metadata.region}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}