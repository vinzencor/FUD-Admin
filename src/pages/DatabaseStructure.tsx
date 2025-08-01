import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Database, Table, Tag } from 'lucide-react';

export function DatabaseStructure() {
  const [tables, setTables] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [sellerProfiles, setSellerProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDatabaseStructure();
  }, []);

  const loadDatabaseStructure = async () => {
    try {
      setLoading(true);
      
      // Get table names
      const { data: tablesData, error: tablesError } = await supabase
        .rpc('get_table_names');

      if (tablesError) {
        console.error('Error fetching tables:', tablesError);
        // Try alternative method
        const { data: altTablesData, error: altError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
        
        if (!altError) {
          setTables(altTablesData || []);
        }
      } else {
        setTables(tablesData || []);
      }

      // Check if products table exists and fetch data
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .limit(10);

      if (!productsError) {
        setProducts(productsData || []);
      } else {
        console.log('Products table might not exist:', productsError);
      }

      // Fetch seller profiles to see features/products
      const { data: sellersData, error: sellersError } = await supabase
        .from('seller_profiles')
        .select('*')
        .limit(10);

      if (!sellersError) {
        setSellerProfiles(sellersData || []);
      }

    } catch (error) {
      console.error('Error loading database structure:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading database structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="h-8 w-8" />
            Database Structure & Products
          </h1>
          <p className="mt-2 text-gray-600">
            Explore the database structure and product information.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Table className="h-5 w-5" />
                Database Tables ({tables.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tables.map((table, index) => (
                  <div key={index} className="p-2 bg-gray-50 rounded border">
                    <span className="text-sm font-mono text-gray-900">
                      {table.table_name || table}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Products Table ({products.length})
              </h2>
            </div>
            <div className="p-6">
              {products.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {products.map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                      )}
                      {product.tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(Array.isArray(product.tags) ? product.tags : [product.tags]).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        ID: {product.id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No products table found or no products available</p>
                </div>
              )}
            </div>
          </div>

          {/* Seller Profiles */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Seller Profiles ({sellerProfiles.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sellerProfiles.map((seller) => (
                  <div key={seller.id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900">{seller.store_name}</h3>
                    {seller.description && (
                      <p className="text-sm text-gray-600 mt-1">{seller.description}</p>
                    )}
                    
                    {/* Features as Products */}
                    {seller.features && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Features/Products:</p>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(seller.features) ? seller.features : [seller.features]).map((feature, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      <div>User ID: {seller.user_id}</div>
                      <div>Approved: {seller.is_approved ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Raw Data Display */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Raw Data Sample
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Seller Profile</h3>
                <div className="bg-gray-100 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 overflow-auto">
                    {JSON.stringify(sellerProfiles[0] || {}, null, 2)}
                  </pre>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Sample Product</h3>
                <div className="bg-gray-100 rounded-lg p-4">
                  <pre className="text-xs text-gray-700 overflow-auto">
                    {JSON.stringify(products[0] || { message: "No products table found" }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
