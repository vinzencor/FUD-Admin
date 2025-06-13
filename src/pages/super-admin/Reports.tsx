import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Filter } from 'lucide-react';

// Mock data for demonstration
const mockData = {
  byState: [
    { name: 'California', orders: 150, revenue: 15000, farmers: 45 },
    { name: 'Texas', orders: 120, revenue: 12000, farmers: 35 },
    { name: 'Florida', orders: 90, revenue: 9000, farmers: 25 },
    { name: 'New York', orders: 80, revenue: 8000, farmers: 20 },
  ],
  byProduct: [
    { name: 'Vegetables', orders: 200, revenue: 20000 },
    { name: 'Fruits', orders: 180, revenue: 18000 },
    { name: 'Dairy', orders: 150, revenue: 15000 },
    { name: 'Eggs', orders: 100, revenue: 10000 },
  ],
  byTime: [
    { name: 'Jan', orders: 50, revenue: 5000 },
    { name: 'Feb', orders: 60, revenue: 6000 },
    { name: 'Mar', orders: 75, revenue: 7500 },
    { name: 'Apr', orders: 90, revenue: 9000 },
  ],
};

export function Reports() {
  const [reportType, setReportType] = useState<'state' | 'product' | 'time'>('state');
  const [metric, setMetric] = useState<'orders' | 'revenue' | 'farmers'>('revenue');

  const handleExport = () => {
    const data = mockData[`by${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`];
    const csv = [
      ['Name', 'Orders', 'Revenue', ...(reportType === 'state' ? ['Farmers'] : [])].join(','),
      ...data.map((item: any) => 
        [item.name, item.orders, item.revenue, ...(reportType === 'state' ? [item.farmers] : [])].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const currentData = mockData[`by${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Reports</h2>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Download className="h-5 w-5 mr-2" />
          Export Report
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="state">By State</option>
          <option value="product">By Product</option>
          <option value="time">By Time Period</option>
        </select>

        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="revenue">Revenue</option>
          <option value="orders">Orders</option>
          {reportType === 'state' && <option value="farmers">Farmers</option>}
        </select>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
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
                  {reportType === 'state' ? 'State' : reportType === 'product' ? 'Product' : 'Period'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Revenue
                </th>
                {reportType === 'state' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Farmers
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.map((item: any) => (
                <tr key={item.name}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${item.revenue.toLocaleString()}
                  </td>
                  {reportType === 'state' && (
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
    </div>
  );
}