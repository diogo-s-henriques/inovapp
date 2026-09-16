import { create } from 'zustand';

import type { AppUser } from '@/types/auth';
import type { ProfileSetupData } from '@/types/profile';

interface AuthState {
  initializing: boolean;
  /**
   * Se a app já ouviu a primeira resposta sobre a sessão - com ou sem utilizador.
   *
   * Não é um estado de carregamento, é **memória**: serve para distinguir duas esperas iguais por
   * dentro e opostas por fora. No arranque, estar à espera da resposta é estar atrás do splash; a
   * seguir a um "Entrar", a mesma espera acontece com o formulário à frente dos olhos, e é ele que
   * tem de ficar (ver `signing-in` em src/lib/auth-gate.ts).
   *
   * Quem a escreve é o `useAuthSync`, no instante em que a resposta chega; quem a lê é o
   * `authStage`. Não se deriva do `initializing` de propósito: esse fica verdadeiro até a leitura
   * do perfil responder, e uma mudança de ordem ali (que parece uma simplificação) passava a
   * mostrar o ecrã de entrada a quem já tinha sessão.
   */
  bootstrapped: boolean;
  user: AppUser | null;
  profile: ProfileSetupData | null;
  profileCompleted: boolean | null;
  authError: string | null;
  setInitializing: (initializing: boolean) => void;
  setBootstrapped: (bootstrapped: boolean) => void;
  setUser: (user: AppUser | null) => void;
  setProfile: (profile: ProfileSetupData | null) => void;
  setProfileCompleted: (profileCompleted: boolean | null) => void;
  setAuthError: (authError: string | null) => void;
}

// Estado global de autenticação (Zustand), preenchido por useAuthSync (src/auth/listener.ts).
export const useAuthStore = create<AuthState>((set) => ({
  initializing: true,
  bootstrapped: false,
  user: null,
  profile: null,
  profileCompleted: null,
  authError: null,
  setInitializing: (initializing) => set({ initializing }),
  setBootstrapped: (bootstrapped) => set({ bootstrapped }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setProfileCompleted: (profileCompleted) => set({ profileCompleted }),
  setAuthError: (authError) => set({ authError }),
}));
