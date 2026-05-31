import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  full_name: string;
  phone: string;
  role: 'owner' | 'accountant' | 'manager' | 'courier' | 'cashier' | 'cook';
  branch_id: string | null;
  branch_name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    { name: 'pizza-auth' }
  )
);
