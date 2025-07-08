import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchFarmerRevenueData, fetchLocationStats, ReportData, LocationStats } from '../../services/dataService';
import { exportWithLoading, generateFilename, formatCurrencyForExport, ExportColumn } from '../../utils/exportUtils';

interface ChartData {
  name: string;
  orders: number;
  revenue: number;
  farmers?: number;
}

export function Reports() {
  const [reportType, setReportType] = useState<'farmers' | 'state' | 'country'>('farmers');
  const [metric, setMetric] = useState<'orders' | 'revenue' | 'farmers'>('revenue');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Data states
  const [farmerData, setFarmerData] = useState<ReportData[]>([]);
  const [locationData, setLocationData] = useState<{
    byState: LocationStats[];
    byCountry: LocationStats[];
  }>({ byState: [], byCountry: [] });

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      console.log('Loading real report data...');

      const [farmers, locations] = await Promise.all([
        fetchFarmerRevenueData(),
        fetchLocationStats()
      ]);

      console.log('Loaded farmers data:', farmers.length);
      console.log('Loaded locations data:', locations.byState.length, locations.byCountry.length);

      setFarmerData(farmers);
      setLocationData(locations);

      // Show message if no real data is available
      if (farmers.length === 0) {
        setMessage('No transaction data available yet. Reports will populate as sellers are approved and orders are processed.');
      } else {
        setMessage(`Showing real data from ${farmers.length} active sellers with transaction history.`);
      }

    } catch (err) {
      console.error('Error loading report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
      setFarmerData([]);
      setLocationData({ byState: [], byCountry: [] });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentData = (): ChartData[] => {
    switch (reportType) {
      case 'farmers':
        return farmerData.slice(0, 10).map(farmer => ({
          name: farmer.business_name || farmer.farmer_name,
          orders: farmer.total_orders,
          revenue: farmer.total_revenue,
          farmers: 1
        }));
      case 'state':
        return locationData.byState.slice(0, 10).map(state => ({
          name: state.location,
          orders: state.total_orders,
          revenue: state.total_revenue,
          farmers: state.unique_farmers
        }));
      case 'country':
        return locationData.byCountry.slice(0, 10).map(country => ({
          name: country.location,
          orders: country.total_orders,
          revenue: country.total_revenue,
          farmers: country.unique_farmers
        }));
      default:
        return [];
    }
  };

  const getExportColumns = (): ExportColumn[] => {
    switch (reportType) {
      case 'farmers':
        return [
          { key: 'farmer_name', label: 'Farmer Name' },
          { key: 'business_name', label: 'Business Name' },
          { key: 'city', label: 'City' },
          { key: 'state', label: 'State' },
          { key: 'country', label: 'Country' },
          { key: 'total_orders', label: 'Total Orders' },
          { key: 'accepted_orders', label: 'Accepted Orders' },
          { key: 'total_revenue', label: 'Total Revenue', formatter: formatCurrencyForExport }
        ];
      case 'state':
        return [
          { key: 'location', label: 'State' },
          { key: 'total_orders', label: 'Total Orders' },
          { key: 'total_revenue', label: 'Total Revenue', formatter: formatCurrencyForExport },
          { key: 'unique_farmers', label: 'Unique Farmers' }
        ];
      case 'country':
        return [
          { key: 'location', label: 'Country' },
          { key: 'total_orders', label: 'Total Orders' },
          { key: 'total_revenue', label: 'Total Revenue', formatter: formatCurrencyForExport },
          { key: 'unique_farmers', label: 'Unique Farmers' }
        ];
      default:
        return [];
    }
  };

  const getExportData = () => {
    switch (reportType) {
      case 'farmers':
        return farmerData;
      case 'state':
        return locationData.byState;
      case 'country':
        return locationData.byCountry;
      default:
        return [];
    }
  };

  const handleExport = async () => {
    const data = getExportData();
    const columns = getExportColumns();
    const filename = generateFilename(`${reportType}-report`);

    if (reportType === 'farmers') {
      await exportWithLoading<ReportData>(
        () => Promise.resolve(data as ReportData[]),
        columns,
        filename,
        setExporting,
        (count) => setMessage(`Successfully exported ${count} records`),
        (error) => setError(error)
      );
    } else {
      await exportWithLoading<LocationStats>(
        () => Promise.resolve(data as LocationStats[]),
        columns,
        filename,
        setExporting,
        (count) => setMessage(`Successfully exported ${count} records`),
        (error) => setError(error)
      );
    }

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const currentData = getCurrentData();

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
          <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
          <p className="text-gray-600 mt-1">Revenue and performance analytics based on accepted orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadReportData}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || currentData.length === 0}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Download className={`h-5 w-5 mr-2 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : 'Export Report'}
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

      <div className="flex gap-4 mb-6">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="farmers">Top Farmers by Revenue</option>
          <option value="state">By State</option>
          <option value="country">By Country</option>
        </select>

        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="revenue">Revenue</option>
          <option value="orders">Orders</option>
          {(reportType === 'state' || reportType === 'country') && <option value="farmers">Farmers</option>}
        </select>
      </div>

      {currentData.length > 0 ? (
        <>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">
              {reportType === 'farmers' ? 'Top 10 Farmers by Revenue' :
               reportType === 'state' ? 'Top 10 States by Revenue' :
               'Top 10 Countries by Revenue'}
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      metric === 'revenue' ? `$${(value / 1000).toFixed(0)}k` : value.toString()
                    }
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      metric === 'revenue' ? `$${Number(value).toLocaleString()}` : value,
                      name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Farmers'
                    ]}
                  />
                  <Legend />
                  <Bar dataKey={metric} fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Detailed Data</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {reportType === 'farmers' ? 'Farmer/Business' :
                       reportType === 'state' ? 'State' : 'Country'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Revenue
                    </th>
                    {(reportType === 'state' || reportType === 'country') && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Farmers
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${item.revenue.toLocaleString()}
                      </td>
                      {(reportType === 'state' || reportType === 'country') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.farmers}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transaction Data Available</h3>
          <p className="text-gray-500 mb-4">
            Reports will populate automatically as real business activity occurs in the system.
          </p>
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-2">Reports are generated from:</p>
            <ul className="text-left space-y-1">
              <li>• Approved seller profiles</li>
              <li>• Active product listings</li>
              <li>• Accepted buyer interests</li>
              <li>• Completed transactions</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}