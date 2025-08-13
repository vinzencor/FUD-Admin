import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabaseClient';
import { isUserSuspended } from '../services/suspensionService';

/**
 * Enhanced auth hook that handles suspension checking without breaking auth state
 */
export function useAuthWithSuspension() {
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [suspensionError, setSuspensionError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndSuspension = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth session error:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // If no session, we're done
        if (!session?.user) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // If user is already in auth store, check suspension
        if (user && session.user.id === user.id) {
          // Only check suspension for non-super-admin users
          if (user.role !== 'super_admin') {
            try {
              const suspended = await isUserSuspended(user.id);
              
              if (suspended && mounted) {
                console.log('🚫 User is suspended, signing out');
                setSuspensionError('Your account has been suspended. Please contact an administrator.');
                logout();
                await supabase.auth.signOut();
              }
            } catch (suspensionCheckError) {
              console.warn('⚠️ Suspension check failed:', suspensionCheckError);
              // Don't block user if suspension check fails
            }
          }
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initial check
    checkAuthAndSuspension();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          setSuspensionError(null);
        }
        
        // Small delay to ensure auth store is updated
        setTimeout(() => {
          if (mounted) {
            checkAuthAndSuspension();
          }
        }, 100);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [user, logout]);

  return {
    user,
    isLoading,
    suspensionError,
    clearSuspensionError: () => setSuspensionError(null)
  };
}

/**
 * Simple auth hook without suspension checking (for components that don't need it)
 */
export function useSimpleAuth() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Simple auth check error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    isLoading
  };
}
