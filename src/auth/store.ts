import { create } from 'zustand';

import type { AppUser } from '@/types/auth';
import type { ProfileSetupData } from '@/types/profile';

interface AuthState {
  initializing: boolean;
  user: AppUser | null;
  profile: ProfileSetupData | null;
  profileCompleted: boolean | null;
  authError: string | null;
  setInitializing: (initializing: boolean) => void;
  setUser: (user: AppUser | null) => void;
  setProfile: (profile: ProfileSetupData | null) => void;
  setProfileCompleted: (profileCompleted: boolean | null) => void;
  setAuthError: (authError: string | null) => void;
}

// Estado global de autenticação (Zustand), preenchido por useAuthSync (src/auth/listener.ts).
export const useAuthStore = create<AuthState>((set) => ({
  initializing: true,
  user: null,
  profile: null,
  profileCompleted: null,
  authError: null,
  setInitializing: (initializing) => set({ initializing }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setProfileCompleted: (profileCompleted) => set({ profileCompleted }),
  setAuthError: (authError) => set({ authError }),
}));
