import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Region {
  country: string;
  name: string;
  zipCodes: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  regions?: Region[];
  permissions?: {
    canApproveUsers: boolean;
    canManageOrders: boolean;
    canViewAnalytics: boolean;
    canManageFeedback: boolean;
  };
}

interface AuthState {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  updatePermissions: (permissions: User['permissions']) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      updateUser: (user) => set({ user }),
      updatePermissions: (permissions) =>
        set((state) => ({
          user: state.user ? { ...state.user, permissions } : null,
        })),
    }),
    {
      name: 'auth-storage',
    }
  )
);