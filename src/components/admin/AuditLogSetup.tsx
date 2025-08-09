import React, { useState, useEffect } from 'react';
import { Shield, Database, CheckCircle, AlertTriangle, Loader2, Activity, Users, ShoppingCart } from 'lucide-react';
import { initializeAuditLogging, checkAuditLogTableExists } from '../../utils/createAuditLogTable';
import { createRetroactiveAuditLogs, getActivitySummary } from '../../services/retroactiveAuditService';

interface AuditLogSetupProps {
  onSetupComplete?: () => void;
}

export function AuditLogSetup({ onSetupComplete }: AuditLogSetupProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activitySummary, setActivitySummary] = useState<any>(null);
  const [isCreatingRetroactiveLogs, setIsCreatingRetroactiveLogs] = useState(false);
  const [retroactiveLogsCreated, setRetroactiveLogsCreated] = useState<number | null>(null);

  useEffect(() => {
    loadActivitySummary();
  }, []);

  const loadActivitySummary = async () => {
    try {
      const summary = await getActivitySummary();
      setActivitySummary(summary);
    } catch (err) {
      console.error('Error loading activity summary:', err);
    }
  };

  const checkTable = async () => {
    try {
      setIsChecking(true);
      setError(null);

      const exists = await checkAuditLogTableExists();
      setTableExists(exists);

      if (exists) {
        setSetupComplete(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check audit log table');
    } finally {
      setIsChecking(false);
    }
  };

  const initializeSystem = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      const result = await initializeAuditLogging();

      if (result.success) {
        setTableExists(true);
        setSetupComplete(true);
        onSetupComplete?.();
      } else {
        setError(result.error || 'Failed to initialize audit logging');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize audit logging');
    } finally {
      setIsInitializing(false);
    }
  };

  const createRetroactiveLogs = async () => {
    try {
      setIsCreatingRetroactiveLogs(true);
      setError(null);

      const result = await createRetroactiveAuditLogs();

      if (result.success) {
        setRetroactiveLogsCreated(result.logsCreated);
        // Refresh activity summary
        await loadActivitySummary();
      } else {
        setError(result.error || 'Failed to create retroactive audit logs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create retroactive audit logs');
    } finally {
      setIsCreatingRetroactiveLogs(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h3 className="text-lg font-medium text-gray-900">Audit Log System Setup</h3>
          <p className="text-sm text-gray-600">Initialize the audit logging system for your application</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">Setup Error</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {setupComplete ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Setup Complete!</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Audit logging system is ready. All user actions and system events will now be tracked.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Database Table Status</p>
                <p className="text-xs text-gray-600">Check if audit_logs table exists</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tableExists === null ? (
                <span className="text-sm text-gray-500">Not checked</span>
              ) : tableExists ? (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Exists
                </span>
              ) : (
                <span className="text-sm text-red-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Missing
                </span>
              )}
              <button
                onClick={checkTable}
                disabled={isChecking}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {isChecking ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Check'
                )}
              </button>
            </div>
          </div>

          {tableExists === false && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Database Setup Required</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    The audit_logs table needs to be created in your Supabase database.
                  </p>

                  <div className="mt-3 p-3 bg-white border border-yellow-300 rounded text-xs">
                    <p className="font-medium text-gray-900 mb-2">Manual Setup Instructions:</p>
                    <ol className="list-decimal list-inside space-y-1 text-gray-700">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to SQL Editor</li>
                      <li>Copy and run the SQL script from: <code className="bg-gray-100 px-1 rounded">/sql/setup-audit-logs.sql</code></li>
                      <li>Click "Check" button above to verify setup</li>
                    </ol>
                  </div>

                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                    <p className="font-medium text-blue-900 mb-1">Quick SQL Script:</p>
                    <pre className="text-blue-800 whitespace-pre-wrap text-xs overflow-x-auto">
{`CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'low',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can access all audit logs" ON audit_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'super_admin'
    )
  );`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Summary */}
      {activitySummary && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Existing Activities Found
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 text-green-600" />
              <span>{activitySummary.users} Users</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-3 w-3 text-green-600" />
              <span>{activitySummary.interests} Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3 text-green-600" />
              <span>{activitySummary.admins} Admins</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-green-600" />
              <span>{activitySummary.listings} Products</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>{activitySummary.reviews} Reviews</span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <Activity className="h-3 w-3 text-green-600" />
              <span>{activitySummary.totalActivities} Total</span>
            </div>
          </div>

          {tableExists && !retroactiveLogsCreated && (
            <div className="mt-3 pt-3 border-t border-green-300">
              <p className="text-xs text-green-800 mb-2">
                Create audit logs for existing activities to have a complete history:
              </p>
              <button
                onClick={createRetroactiveLogs}
                disabled={isCreatingRetroactiveLogs}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
              >
                {isCreatingRetroactiveLogs ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Creating Audit Logs...
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3" />
                    Create Historical Audit Logs
                  </>
                )}
              </button>
            </div>
          )}

          {retroactiveLogsCreated !== null && (
            <div className="mt-3 pt-3 border-t border-green-300">
              <div className="flex items-center gap-2 text-xs text-green-800">
                <CheckCircle className="h-3 w-3" />
                <span>✅ Created {retroactiveLogsCreated} historical audit entries!</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-medium text-blue-900 mb-2">What will be tracked going forward?</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• User login and logout events</li>
          <li>• User creation, updates, and deletions</li>
          <li>• Role changes and admin assignments</li>
          <li>• Product and order management</li>
          <li>• System configuration changes</li>
          <li>• Security events and unauthorized access attempts</li>
          <li>• Data exports and administrative actions</li>
        </ul>
      </div>

      {setupComplete && (
        <div className="mt-4 text-center">
          <button
            onClick={onSetupComplete}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Continue to Audit Log
          </button>
        </div>
      )}
    </div>
  );
}
