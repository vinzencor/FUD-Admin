import React, { useState } from 'react';
import { fetchAllSellers, fetchFarmerRevenueData, fetchLocationStats, fetchActivityLogs, fetchAllFeedback } from '../services/dataService';

export function DebugDataService() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testFunction = async (name: string, fn: () => Promise<any>) => {
    try {
      setLoading(name);
      setError(null);
      console.log(`Testing ${name}...`);
      
      const result = await fn();
      console.log(`${name} result:`, result);
      
      setResults(prev => ({ ...prev, [name]: result }));
    } catch (err) {
      console.error(`${name} error:`, err);
      setError(`${name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Data Service Debug Page</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          Testing {loading}...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => testFunction('fetchAllSellers', fetchAllSellers)}
          disabled={!!loading}
          className="p-4 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test fetchAllSellers
        </button>

        <button
          onClick={() => testFunction('fetchFarmerRevenueData', fetchFarmerRevenueData)}
          disabled={!!loading}
          className="p-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Test fetchFarmerRevenueData
        </button>

        <button
          onClick={() => testFunction('fetchLocationStats', fetchLocationStats)}
          disabled={!!loading}
          className="p-4 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          Test fetchLocationStats
        </button>

        <button
          onClick={() => testFunction('fetchActivityLogs', fetchActivityLogs)}
          disabled={!!loading}
          className="p-4 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
        >
          Test fetchActivityLogs
        </button>

        <button
          onClick={() => testFunction('fetchAllFeedback', fetchAllFeedback)}
          disabled={!!loading}
          className="p-4 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Test fetchAllFeedback
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(results).map(([name, result]) => (
          <div key={name} className="border rounded p-4">
            <h3 className="font-bold text-lg mb-2">{name}</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
