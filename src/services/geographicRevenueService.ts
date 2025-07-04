import { supabase } from '../supabaseClient';
import { GeographicRevenueData, AdminPerformanceData } from '../components/reports/GeographicRevenueReport';
import { getAllAdminUsers, AdminUser } from './locationAdminService';

/**
 * Mock data for geographic revenue reporting
 * In a real implementation, this would fetch from orders, payments, and user tables
 */

export async function getGeographicRevenueData(): Promise<GeographicRevenueData[]> {
  try {
    // For now, return mock data based on actual countries in the database
    const { data: countries, error } = await supabase
      .from('users')
      .select('country, city, state')
      .not('country', 'is', null)
      .not('city', 'is', null);

    if (error) {
      console.error('Error fetching location data:', error);
      return getMockGeographicData();
    }

    // Group by country and city
    const locationMap = new Map<string, Set<string>>();
    countries?.forEach(user => {
      if (user.country && user.city) {
        if (!locationMap.has(user.country)) {
          locationMap.set(user.country, new Set());
        }
        locationMap.get(user.country)?.add(user.city);
      }
    });

    // Generate revenue data based on actual locations
    const revenueData: GeographicRevenueData[] = [];
    
    for (const [country, cities] of locationMap.entries()) {
      const countryData: GeographicRevenueData = {
        country,
        cities: Array.from(cities).map(city => ({
          name: city,
          totalRevenue: Math.floor(Math.random() * 100000) + 10000, // Mock revenue
          orderCount: Math.floor(Math.random() * 500) + 50,
          userCount: Math.floor(Math.random() * 200) + 20,
          districts: [
            {
              name: `${city} Downtown`,
              totalRevenue: Math.floor(Math.random() * 50000) + 5000,
              orderCount: Math.floor(Math.random() * 250) + 25,
              streets: [
                {
                  name: `Main Street, ${city}`,
                  totalRevenue: Math.floor(Math.random() * 25000) + 2500,
                  orderCount: Math.floor(Math.random() * 125) + 12,
                  adminName: 'Regional Admin'
                },
                {
                  name: `King Street, ${city}`,
                  totalRevenue: Math.floor(Math.random() * 20000) + 2000,
                  orderCount: Math.floor(Math.random() * 100) + 10
                }
              ]
            },
            {
              name: `${city} Suburbs`,
              totalRevenue: Math.floor(Math.random() * 30000) + 3000,
              orderCount: Math.floor(Math.random() * 150) + 15,
              streets: [
                {
                  name: `First Avenue, ${city}`,
                  totalRevenue: Math.floor(Math.random() * 15000) + 1500,
                  orderCount: Math.floor(Math.random() * 75) + 7
                },
                {
                  name: `Park Road, ${city}`,
                  totalRevenue: Math.floor(Math.random() * 12000) + 1200,
                  orderCount: Math.floor(Math.random() * 60) + 6
                }
              ]
            }
          ]
        }))
      };
      revenueData.push(countryData);
    }

    return revenueData.length > 0 ? revenueData : getMockGeographicData();
  } catch (error) {
    console.error('Error in getGeographicRevenueData:', error);
    return getMockGeographicData();
  }
}

export async function getAdminPerformanceData(): Promise<AdminPerformanceData[]> {
  try {
    const adminUsers = await getAllAdminUsers();
    const regionalAdmins = adminUsers.filter(admin => 
      admin.role === 'admin' && admin.assignedLocation
    );

    return regionalAdmins.map(admin => {
      const baseRevenue = Math.floor(Math.random() * 50000) + 10000;
      const orderCount = Math.floor(Math.random() * 200) + 20;
      
      return {
        adminId: admin.id,
        adminName: admin.name,
        assignedLocation: {
          country: admin.assignedLocation?.country || 'Unknown',
          city: admin.assignedLocation?.city || 'Unknown',
          district: admin.assignedLocation?.district || 'Unknown',
          streets: admin.assignedLocation?.streets || []
        },
        totalRevenue: baseRevenue,
        orderCount: orderCount,
        userCount: Math.floor(Math.random() * 100) + 10,
        averageOrderValue: orderCount > 0 ? baseRevenue / orderCount : 0
      };
    });
  } catch (error) {
    console.error('Error in getAdminPerformanceData:', error);
    return [];
  }
}

function getMockGeographicData(): GeographicRevenueData[] {
  return [
    {
      country: 'United States',
      cities: [
        {
          name: 'New York',
          totalRevenue: 125000,
          orderCount: 450,
          userCount: 180,
          districts: [
            {
              name: 'Manhattan',
              totalRevenue: 75000,
              orderCount: 270,
              streets: [
                {
                  name: 'Broadway',
                  totalRevenue: 45000,
                  orderCount: 162,
                  adminName: 'John Smith'
                },
                {
                  name: 'Wall Street',
                  totalRevenue: 30000,
                  orderCount: 108
                }
              ]
            },
            {
              name: 'Brooklyn',
              totalRevenue: 50000,
              orderCount: 180,
              streets: [
                {
                  name: 'Atlantic Avenue',
                  totalRevenue: 30000,
                  orderCount: 108
                },
                {
                  name: 'Flatbush Avenue',
                  totalRevenue: 20000,
                  orderCount: 72
                }
              ]
            }
          ]
        },
        {
          name: 'Los Angeles',
          totalRevenue: 98000,
          orderCount: 350,
          userCount: 140,
          districts: [
            {
              name: 'Hollywood',
              totalRevenue: 58000,
              orderCount: 210,
              streets: [
                {
                  name: 'Hollywood Boulevard',
                  totalRevenue: 35000,
                  orderCount: 126,
                  adminName: 'Sarah Johnson'
                },
                {
                  name: 'Sunset Strip',
                  totalRevenue: 23000,
                  orderCount: 84
                }
              ]
            }
          ]
        }
      ]
    },
    {
      country: 'Canada',
      cities: [
        {
          name: 'Toronto',
          totalRevenue: 87000,
          orderCount: 310,
          userCount: 125,
          districts: [
            {
              name: 'Downtown',
              totalRevenue: 52000,
              orderCount: 186,
              streets: [
                {
                  name: 'Yonge Street',
                  totalRevenue: 32000,
                  orderCount: 115,
                  adminName: 'Mike Wilson'
                },
                {
                  name: 'King Street',
                  totalRevenue: 20000,
                  orderCount: 71
                }
              ]
            }
          ]
        }
      ]
    }
  ];
}

/**
 * Export geographic revenue data to CSV
 */
export function exportGeographicRevenueToCSV(data: GeographicRevenueData[]): string {
  const headers = [
    'Country',
    'City',
    'District',
    'Street',
    'Revenue',
    'Orders',
    'Admin'
  ];

  const rows: string[][] = [headers];

  data.forEach(country => {
    country.cities.forEach(city => {
      city.districts.forEach(district => {
        district.streets.forEach(street => {
          rows.push([
            country.country,
            city.name,
            district.name,
            street.name,
            street.totalRevenue.toString(),
            street.orderCount.toString(),
            street.adminName || 'Unassigned'
          ]);
        });
      });
    });
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Export admin performance data to CSV
 */
export function exportAdminPerformanceToCSV(data: AdminPerformanceData[]): string {
  const headers = [
    'Admin Name',
    'Country',
    'City',
    'District',
    'Streets Count',
    'Total Revenue',
    'Order Count',
    'User Count',
    'Average Order Value'
  ];

  const rows: string[][] = [headers];

  data.forEach(admin => {
    rows.push([
      admin.adminName,
      admin.assignedLocation.country,
      admin.assignedLocation.city,
      admin.assignedLocation.district,
      admin.assignedLocation.streets.length.toString(),
      admin.totalRevenue.toString(),
      admin.orderCount.toString(),
      admin.userCount.toString(),
      admin.averageOrderValue.toFixed(2)
    ]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}
