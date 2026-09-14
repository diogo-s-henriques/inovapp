import type { AccountRole } from '@/constants/auth';

export interface AppUser {
  uid: string;
  email: string | null;
  fullName?: string;
  photoUri?: string;
  // Ausente enquanto o utilizador ainda não concluiu a configuração do perfil.
  role?: AccountRole;
}
