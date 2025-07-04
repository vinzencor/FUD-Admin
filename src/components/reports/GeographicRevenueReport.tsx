import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Building, 
  Download,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export interface GeographicRevenueData {
  country: string;
  cities: {
    name: string;
    totalRevenue: number;
    orderCount: number;
    userCount: number;
    districts: {
      name: string;
      totalRevenue: number;
      orderCount: number;
      streets: {
        name: string;
        totalRevenue: number;
        orderCount: number;
        adminId?: string;
        adminName?: string;
      }[];
    }[];
  }[];
}

export interface AdminPerformanceData {
  adminId: string;
  adminName: string;
  assignedLocation: {
    country: string;
    city: string;
    district: string;
    streets: string[];
  };
  totalRevenue: number;
  orderCount: number;
  userCount: number;
  averageOrderValue: number;
}

interface GeographicRevenueReportProps {
  data?: GeographicRevenueData[];
  adminPerformance?: AdminPerformanceData[];
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
}

export function GeographicRevenueReport({ 
  data = [], 
  adminPerformance = [],
  loading = false,
  onRefresh,
  onExport 
}: GeographicRevenueReportProps) {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [viewMode, setViewMode] = useState<'geographic' | 'admin'>('geographic');

  // Calculate totals
  const totalRevenue = data.reduce((sum, country) => 
    sum + country.cities.reduce((citySum, city) => citySum + city.totalRevenue, 0), 0
  );

  const totalOrders = data.reduce((sum, country) => 
    sum + country.cities.reduce((citySum, city) => citySum + city.orderCount, 0), 0
  );

  const totalUsers = data.reduce((sum, country) => 
    sum + country.cities.reduce((citySum, city) => citySum + city.userCount, 0), 0
  );

  const selectedCountryData = data.find(c => c.country === selectedCountry);
  const selectedCityData = selectedCountryData?.cities.find(c => c.name === selectedCity);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-blue-600" />
            Geographic Revenue Report
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Revenue breakdown by location and admin performance metrics
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders.toLocaleString()}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{totalUsers.toLocaleString()}</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'geographic' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('geographic')}
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          Geographic View
        </Button>
        <Button
          variant={viewMode === 'admin' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('admin')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Admin Performance
        </Button>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'geographic' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Country Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Countries</h3>
            <div className="space-y-2">
              {data.map((country) => {
                const countryRevenue = country.cities.reduce((sum, city) => sum + city.totalRevenue, 0);
                const countryOrders = country.cities.reduce((sum, city) => sum + city.orderCount, 0);
                
                return (
                  <div
                    key={country.country}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCountry === country.country
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedCountry(country.country);
                      setSelectedCity('');
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{country.country}</span>
                      <Badge variant="secondary">{country.cities.length} cities</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ${countryRevenue.toLocaleString()} • {countryOrders} orders
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* City Selection */}
          {selectedCountryData && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Cities in {selectedCountry}
              </h3>
              <div className="space-y-2">
                {selectedCountryData.cities.map((city) => (
                  <div
                    key={city.name}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCity === city.name
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedCity(city.name)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{city.name}</span>
                      <Badge variant="secondary">{city.districts.length} districts</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ${city.totalRevenue.toLocaleString()} • {city.orderCount} orders
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Details */}
          {selectedCityData && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Districts in {selectedCity}
              </h3>
              <div className="space-y-4">
                {selectedCityData.districts.map((district) => (
                  <div key={district.name} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{district.name}</span>
                      <div className="text-sm text-gray-600">
                        ${district.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {district.streets.map((street) => (
                        <div key={street.name} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{street.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">${street.totalRevenue.toLocaleString()}</span>
                            {street.adminName && (
                              <Badge variant="outline" className="text-xs">
                                {street.adminName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Admin Performance View */
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Admin Performance Metrics</h3>
            <p className="text-sm text-gray-600">Revenue and activity by regional admin</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {adminPerformance.map((admin) => (
                  <tr key={admin.adminId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{admin.adminName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">
                        {admin.assignedLocation.streets.length} streets in {admin.assignedLocation.district}
                      </div>
                      <div className="text-xs text-gray-500">
                        {admin.assignedLocation.city}, {admin.assignedLocation.country}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        ${admin.totalRevenue.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{admin.orderCount}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{admin.userCount}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">${admin.averageOrderValue.toFixed(2)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
