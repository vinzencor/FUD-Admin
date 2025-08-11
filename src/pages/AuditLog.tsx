import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  User, 
  Activity,
  TrendingUp,
  Eye,
  Calendar
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import {
  fetchAllActivities,
  getAuditLogStats,
  AuditLogEntry,
  AuditLogFilter,
  AUDIT_ACTIONS,
  RESOURCE_TYPES
} from '../services/auditLogService';
import { exportWithLoading, generateFilename } from '../utils/exportUtils';
import { checkAuditLogTableExists } from '../utils/createAuditLogTable';
import { AuditLogSetup } from '../components/admin/AuditLogSetup';
import { ActivitySummary, ActivityTimeline } from '../components/admin/ActivitySummary';

export function AuditLog() {
  const user = useAuthStore((state) => state.user);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  
  // Filter states
  const [filter, setFilter] = useState<AuditLogFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [pageSize] = useState(50);
  
  // Statistics
  const [stats, setStats] = useState({
    totalEvents: 0,
    todayEvents: 0,
    criticalEvents: 0,
    topActions: [] as Array<{ action: string; count: number }>,
    topUsers: [] as Array<{ user_name: string; count: number }>
  });

  const [activityStats, setActivityStats] = useState({
    user_registered: 0,
    order_placed: 0,
    product_created: 0,
    order_status_changed: 0,
    user_role_changed: 0,
    system_initialized: 0,
    total: 0
  });

  useEffect(() => {
    checkTableAndLoad();
  }, []);

  useEffect(() => {
    if (tableExists) {
      loadAuditLogs();
      loadStats();
    }
  }, [currentPage, filter, tableExists]);

  const checkTableAndLoad = async () => {
    try {
      const exists = await checkAuditLogTableExists();
      setTableExists(exists);

      if (exists) {
        loadAuditLogs();
        loadStats();
      } else {
        setShowSetup(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking audit log table:', err);
      setShowSetup(true);
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchAllActivities(filter, currentPage, pageSize);
      
      if (result.error) {
        setError(result.error);
      } else {
        setAuditLogs(result.data);
        setTotalLogs(result.total);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await getAuditLogStats();
      setStats(statsData);

      // Load activity breakdown stats
      await loadActivityStats();
    } catch (err) {
      console.error('Failed to load audit stats:', err);
    }
  };

  const loadActivityStats = async () => {
    try {
      // Get activity breakdown from Supabase
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error loading activity stats:', error);
        return;
      }

      if (data) {
        const breakdown = data.reduce((acc: any, log: any) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {});

        setActivityStats({
          user_registered: breakdown.user_registered || 0,
          order_placed: breakdown.order_placed || 0,
          product_created: breakdown.product_created || 0,
          order_status_changed: breakdown.order_status_changed || 0,
          user_role_changed: breakdown.user_role_changed || 0,
          system_initialized: breakdown.system_initialized || 0,
          total: data.length
        });
      }
    } catch (error) {
      console.error('Error loading activity stats:', error);
    }
  };

  const handleSearch = () => {
    setFilter({ ...filter, search_term: searchTerm });
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof AuditLogFilter, value: string) => {
    setFilter({ ...filter, [key]: value || undefined });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilter({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleExport = async () => {
    const columns = [
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'user_name', label: 'User' },
      { key: 'action', label: 'Action' },
      { key: 'resource_type', label: 'Resource Type' },
      { key: 'severity', label: 'Severity' },
      { key: 'details', label: 'Details' },
      { key: 'ip_address', label: 'IP Address' }
    ];

    await exportWithLoading(
      () => Promise.resolve(auditLogs),
      columns,
      generateFilename('audit_logs'),
      setExporting
    );
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      return details;
    }
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  const handleSetupComplete = () => {
    setTableExists(true);
    setShowSetup(false);
    checkTableAndLoad();
  };

  // Show setup component if table doesn't exist
  if (showSetup || tableExists === false) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-600" />
              Audit Log Setup
            </h2>
            <p className="text-gray-600 mt-1">Initialize the audit logging system</p>
          </div>
        </div>
        <AuditLogSetup onSetupComplete={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Audit Log
          </h2>
          <p className="text-gray-600 mt-1">Monitor all system activities and user actions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || auditLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      

      {/* Statistics Cards */}
      

      {/* Search and Filters */}
      <div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filter.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                {Object.values(AUDIT_ACTIONS).map(action => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
              <select
                value={filter.resource_type || ''}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {Object.values(RESOURCE_TYPES).map(type => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filter.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Audit Events</h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {auditLogs.length} of {totalLogs.toLocaleString()} events
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading audit logs...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12 text-red-600">
            <AlertTriangle className="h-8 w-8 mr-2" />
            <span>{error}</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Activity className="h-8 w-8 mr-2" />
            <span>No audit logs found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                          <div className="text-sm text-gray-500">{log.user_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-medium">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {log.resource_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || 'Unknown'}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="mt-1 text-sm text-gray-900">{formatTimestamp(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Severity</label>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(selectedLog.severity)}`}>
                    {selectedLog.severity}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.user_name}</p>
                  <p className="text-xs text-gray-500">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.resource_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.resource_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">IP Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLog.ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">User Agent</label>
                  <p className="mt-1 text-sm text-gray-900 truncate" title={selectedLog.user_agent}>
                    {selectedLog.user_agent || 'Unknown'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Details</label>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(JSON.parse(selectedLog.details || '{}'), null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
