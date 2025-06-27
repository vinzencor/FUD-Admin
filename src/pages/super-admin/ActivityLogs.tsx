import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fetchActivityLogs, ActivityLogData } from '../../services/dataService';
import { exportWithLoading, generateFilename, formatDateForExport, ExportColumn } from '../../utils/exportUtils';

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    loadActivityLogs();
  }, []);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchActivityLogs();
      setLogs(data);
    } catch (err) {
      console.error('Error loading activity logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const exportColumns: ExportColumn[] = [
    { key: 'timestamp', label: 'Timestamp', formatter: formatDateForExport },
    { key: 'user_name', label: 'User Name' },
    { key: 'user_email', label: 'User Email' },
    { key: 'action', label: 'Action' },
    { key: 'details', label: 'Details' },
    { key: 'entity_type', label: 'Entity Type' },
    { key: 'status', label: 'Status' }
  ];

  const handleExport = async () => {
    const filename = generateFilename('activity-logs');

    await exportWithLoading(
      () => Promise.resolve(filteredLogs),
      exportColumns,
      filename,
      setExporting,
      (count) => setMessage(`Successfully exported ${count} activity logs`),
      (error) => setError(error)
    );

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDateRange =
      (!dateRange.start || new Date(log.timestamp) >= new Date(dateRange.start)) &&
      (!dateRange.end || new Date(log.timestamp) <= new Date(dateRange.end));

    const matchesAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter.toLowerCase());

    return matchesSearch && matchesDateRange && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'user registration':
        return 'bg-green-100 text-green-800';
      case 'seller registration':
        return 'bg-blue-100 text-blue-800';
      case 'interest created':
        return 'bg-yellow-100 text-yellow-800';
      case 'interest status update':
        return 'bg-purple-100 text-purple-800';
      case 'product review':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Activity Logs</h2>
          <p className="text-gray-600 mt-1">System activities and user actions ({logs.length} total)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadActivityLogs}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || filteredLogs.length === 0}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Download className={`h-5 w-5 mr-2 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : 'Export Logs'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Actions</option>
          <option value="registration">User Registration</option>
          <option value="seller">Seller Registration</option>
          <option value="interest">Interest Activities</option>
          <option value="review">Product Reviews</option>
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {filteredLogs.length > 0 ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {log.user_name || 'System'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {log.user_email || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.status && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        log.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Logs Found</h3>
          <p className="text-gray-500">
            {searchTerm || actionFilter !== 'all' || dateRange.start || dateRange.end
              ? 'No activities match your current filters.'
              : 'No system activities recorded yet.'}
          </p>
        </div>
      )}
    </div>
  );
}