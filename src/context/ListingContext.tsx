import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext"; // Updated to use relative import since it's in the same directory
import { supabase } from "../supabaseClient";
// Define types for your context
interface ListingContextType {  listings: any[];
  loading: boolean;  error: string | null;
  fetchListings: () => Promise<void>;  // Add other methods you need
}
// Create context with a default value
const ListingContext = createContext<ListingContextType | undefined>(undefined);
// Provider component
export const ListingProvider = ({ children }: { children: ReactNode }) => {  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const fetchListings = async () => {    try {
      setLoading(true);      setError(null);
            const { data, error } = await supabase
        .from('listings')        .select('*');
            if (error) throw error;
            setListings(data || []);
    } catch (err) {      console.error('Error fetching listings:', err);
      setError('Failed to fetch listings');    } finally {
      setLoading(false);    }
  };
  useEffect(() => {    if (user) {
      fetchListings();    }
  }, [user]);
  const value = {    listings,
    loading,    error,
    fetchListings  };
  return (
    <ListingContext.Provider value={value}>      {children}
    </ListingContext.Provider>  
  );
};

// Custom hook to use the context
export const useListings = () => {
  const context = useContext(ListingContext);  
  if (context === undefined) {
    throw new Error('useListings must be used within a ListingProvider');  
  }
  return context;
};




































