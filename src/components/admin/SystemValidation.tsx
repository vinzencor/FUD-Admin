import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw,
  FileText,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { runAdminAssignmentTests, TestResult } from '../../tests/adminAssignmentTests';

export function SystemValidation() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      const results = await runAdminAssignmentTests();
      setTestResults(results);
      setLastRunTime(new Date());
    } catch (error) {
      console.error('Error running tests:', error);
      setTestResults([{
        testName: 'Test Execution',
        passed: false,
        message: `Failed to run tests: ${error}`,
        details: error
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleDetails = (testName: string) => {
    setShowDetails(prev => ({
      ...prev,
      [testName]: !prev[testName]
    }));
  };

  const getTestSummary = () => {
    const total = testResults.length;
    const passed = testResults.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    return { total, passed, failed, passRate };
  };

  const generateReport = () => {
    const summary = getTestSummary();
    
    let report = `# Admin Assignment System Validation Report\n\n`;
    report += `**Generated**: ${new Date().toLocaleString()}\n\n`;
    report += `## Summary\n`;
    report += `- Total Tests: ${summary.total}\n`;
    report += `- Passed: ${summary.passed}\n`;
    report += `- Failed: ${summary.failed}\n`;
    report += `- Pass Rate: ${summary.passRate.toFixed(1)}%\n\n`;
    
    report += `## Test Results\n\n`;
    
    testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      report += `### ${result.testName} - ${status}\n`;
      report += `${result.message}\n\n`;
      
      if (result.details) {
        report += `**Details**: \`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`\n\n`;
      }
    });

    return report;
  };

  const downloadReport = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-assignment-validation-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const summary = getTestSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-blue-600" />
              System Validation
            </h2>
            <p className="text-gray-600 mt-1">
              Validate the enhanced admin assignment functionality and location-based access control
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Validation
                </>
              )}
            </Button>
            
            {testResults.length > 0 && (
              <Button
                variant="outline"
                onClick={downloadReport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
            )}
          </div>
        </div>
        
        {lastRunTime && (
          <div className="mt-4 text-sm text-gray-500">
            Last run: {lastRunTime.toLocaleString()}
          </div>
        )}
      </div>

      {/* Test Summary */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Test Summary</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.passRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Pass Rate</div>
            </div>
          </div>

          {/* Overall Status */}
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            summary.passRate === 100 
              ? 'bg-green-50 border border-green-200' 
              : summary.passRate >= 80 
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
          }`}>
            {summary.passRate === 100 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">All tests passed! System is functioning correctly.</span>
              </>
            ) : summary.passRate >= 80 ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">Most tests passed. Some issues may need attention.</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-800">Multiple test failures detected. System needs attention.</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Detailed Test Results</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {testResults.map((result, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      
                      <h4 className="font-medium text-gray-900">{result.testName}</h4>
                      
                      <Badge className={`text-xs ${
                        result.passed 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 text-sm">{result.message}</p>
                    
                    {result.details && (
                      <div className="mt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDetails(result.testName)}
                          className="flex items-center gap-2 text-xs"
                        >
                          {showDetails[result.testName] ? (
                            <>
                              <EyeOff className="h-3 w-3" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <Eye className="h-3 w-3" />
                              Show Details
                            </>
                          )}
                        </Button>
                        
                        {showDetails[result.testName] && (
                          <div className="mt-2 p-3 bg-gray-50 rounded border text-xs">
                            <pre className="whitespace-pre-wrap text-gray-700">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {testResults.length === 0 && !isRunning && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Validation Instructions
          </h3>
          
          <div className="space-y-4 text-sm text-gray-600">
            <p>
              This validation suite tests the enhanced admin assignment functionality including:
            </p>
            
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>User Address Services</strong> - Dynamic user data fetching with address information</li>
              <li><strong>Location Filtering</strong> - Geographic filtering for regional admin access control</li>
              <li><strong>Super Admin Privileges</strong> - Unrestricted access for super administrators</li>
              <li><strong>Geocoding Services</strong> - Address-to-coordinate conversion for map display</li>
              <li><strong>Access Control</strong> - Location-based permissions and restrictions</li>
              <li><strong>Admin Assignment Workflow</strong> - Complete user selection and role assignment process</li>
            </ul>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
              <p className="text-blue-800">
                <strong>Note:</strong> These tests validate the core functionality using your actual database. 
                Make sure you have proper test data and permissions before running the validation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
