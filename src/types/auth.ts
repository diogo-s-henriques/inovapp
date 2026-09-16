import type { AccountRole } from '@/constants/auth';

export interface AppUser {
  uid: string;
  email: string | null;
  /**
   * Se a caixa de correio institucional foi confirmada (o link que o Firebase manda ao registar).
   *
   * É isto — e não o domínio do email — que prova que o email pertence a quem o escreveu: o papel
   * (Tutorando/Tutor) sai do domínio, mas qualquer pessoa se pode registar com o email de outra
   * enquanto ninguém confirmar nada. Ver `src/lib/auth-gate.ts` e as regras do Firestore.
   */
  emailVerified: boolean;
  fullName?: string;
  photoUri?: string;
  // Ausente enquanto o utilizador ainda não concluiu a configuração do perfil.
  role?: AccountRole;
}
