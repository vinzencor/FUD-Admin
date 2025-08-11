// Featured Sellers API Integration Example
// Use this code in your main FUD application to fetch and display featured sellers

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client (use your actual URL and anon key)
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

/**
 * Fetch featured sellers for home page display
 * @param {number} limit - Number of featured sellers to fetch (default: 10)
 * @returns {Promise<Array>} Featured sellers data
 */
export async function getFeaturedSellersForHome(limit = 10) {
  try {
    const { data, error } = await supabase.rpc('get_featured_sellers_for_home', {
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching featured sellers:', error);
    return [];
  }
}

/**
 * Example React component for displaying featured sellers on home page
 */
export function FeaturedSellersSection() {
  const [featuredSellers, setFeaturedSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedSellers();
  }, []);

  const loadFeaturedSellers = async () => {
    try {
      setLoading(true);
      const sellers = await getFeaturedSellersForHome(6); // Get top 6 featured sellers
      setFeaturedSellers(sellers);
    } catch (error) {
      console.error('Error loading featured sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading featured sellers...</p>
      </div>
    );
  }

  if (featuredSellers.length === 0) {
    return null; // Don't show section if no featured sellers
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Sellers</h2>
          <p className="mt-2 text-gray-600">Discover our top-rated sellers and their amazing products</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredSellers.map((seller) => (
            <div key={seller.user_id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              {/* Seller Image - Natural Height */}
              <div className="bg-gray-200 relative">
                {seller.store_cover_image || seller.profile_image ? (
                  <img
                    src={seller.store_cover_image || seller.profile_image}
                    alt={seller.store_name || seller.full_name}
                    className="w-full h-auto object-contain"
                    style={{ minHeight: '200px', maxHeight: '400px' }}
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
                    <span className="text-white text-2xl font-bold">
                      {(seller.store_name || seller.full_name).charAt(0)}
                    </span>
                  </div>
                )}
                
                {/* Featured Badge */}
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                  ⭐ Featured
                </div>
              </div>

              {/* Seller Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {seller.store_name || seller.full_name}
                </h3>
                
                {seller.store_description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                    {seller.store_description}
                  </p>
                )}

                {/* Location */}
                <div className="flex items-center text-gray-500 text-sm mb-2">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {[seller.city, seller.state, seller.country].filter(Boolean).join(', ')}
                </div>

                {/* Rating */}
                {seller.average_rating && (
                  <div className="flex items-center mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(seller.average_rating) 
                              ? 'text-yellow-400' 
                              : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {seller.average_rating.toFixed(1)} ({seller.total_reviews} reviews)
                    </span>
                  </div>
                )}

                {/* Action Button */}
                <button
                  onClick={() => {
                    // Navigate to seller's profile/store page
                    window.location.href = `/seller/${seller.user_id}`;
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  View Store
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-8">
          <button
            onClick={() => {
              // Navigate to all sellers page
              window.location.href = '/sellers';
            }}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"
          >
            View All Sellers
            <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Example usage in your main app's home page
 */
export function HomePage() {
  return (
    <div>
      {/* Other home page sections */}
      <HeroSection />
      
      {/* Featured Sellers Section */}
      <FeaturedSellersSection />
      
      {/* Other sections */}
      <FeaturedProductsSection />
      <FeaturedServicesSection />
    </div>
  );
}

/**
 * Alternative: Fetch featured sellers and their products/services
 */
export async function getFeaturedContent() {
  try {
    // Get featured sellers
    const featuredSellers = await getFeaturedSellersForHome(10);
    
    if (featuredSellers.length === 0) {
      return { sellers: [], products: [], services: [] };
    }

    // Get user IDs of featured sellers
    const sellerIds = featuredSellers.map(seller => seller.user_id);

    // Fetch products from featured sellers (if you have a products table)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('seller_id', sellerIds)
      .eq('is_active', true)
      .limit(20);

    // Fetch services from featured sellers (if you have a services table)
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .in('seller_id', sellerIds)
      .eq('is_active', true)
      .limit(20);

    return {
      sellers: featuredSellers,
      products: products || [],
      services: services || []
    };
  } catch (error) {
    console.error('Error fetching featured content:', error);
    return { sellers: [], products: [], services: [] };
  }
}

// CSS for line-clamp utility (add to your CSS file)
/*
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
*/
