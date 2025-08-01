import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Tag, Store, User } from 'lucide-react';

export function ProductsTest() {
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from products table
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*');

      if (!productsError && productsData) {
        setProducts(productsData);
        console.log('Found products table:', productsData);
      } else {
        console.log('No products table or error:', productsError);
      }

      // Fetch seller profiles with features
      const { data: sellersData, error: sellersError } = await supabase
        .from('seller_profiles')
        .select(`
          id,
          user_id,
          store_name,
          description,
          features,
          is_approved,
          created_at
        `);

      if (!sellersError) {
        setSellers(sellersData || []);
        console.log('Sellers with features:', sellersData);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="h-8 w-8" />
            Products & Features Test
          </h1>
          <p className="mt-2 text-gray-600">
            Testing product data structure and seller features.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Products Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5" />
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
                        <div>ID: {product.id}</div>
                        <div>Seller: {product.seller_id}</div>
                        <div>Price: {product.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No products table found</p>
                  <p className="text-sm mt-2">Products might be stored as features in seller_profiles</p>
                </div>
              )}
            </div>
          </div>

          {/* Seller Features */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Store className="h-5 w-5" />
                Seller Features ({sellers.length})
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sellers.map((seller) => (
                  <div key={seller.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="h-4 w-4 text-gray-600" />
                      <h3 className="font-semibold text-gray-900">{seller.store_name}</h3>
                      {seller.is_approved && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                          Approved
                        </span>
                      )}
                    </div>
                    
                    {seller.description && (
                      <p className="text-sm text-gray-600 mb-3">{seller.description}</p>
                    )}
                    
                    {/* Features as Products */}
                    {seller.features && seller.features.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Features/Products ({seller.features.length}):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {seller.features.map((feature, idx) => (
                            <span key={idx} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full border">
                              <Tag className="h-3 w-3 inline mr-1" />
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No features/products listed
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                      <div>User ID: {seller.user_id}</div>
                      <div>Created: {new Date(seller.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Features Display */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              All Features/Products by Seller
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sellers.filter(seller => seller.features && seller.features.length > 0).map((seller) => (
                <div key={seller.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{seller.store_name}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {seller.features.map((feature, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900">{feature}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Product/Service offered by {seller.store_name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{products.length}</div>
            <div className="text-sm text-gray-600">Products in Products Table</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{sellers.length}</div>
            <div className="text-sm text-gray-600">Total Sellers</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-purple-600">
              {sellers.filter(s => s.features && s.features.length > 0).length}
            </div>
            <div className="text-sm text-gray-600">Sellers with Features</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">
              {sellers.reduce((total, seller) => total + (seller.features ? seller.features.length : 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Features/Products</div>
          </div>
        </div>
      </div>
    </div>
  );
}
