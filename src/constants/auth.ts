export const STUDENT_EMAIL_DOMAIN = 'alunos.iseclisboa.pt';
export const PROFESSOR_EMAIL_DOMAIN = 'iseclisboa.pt';

/** Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 caráter especial. */
export const PASSWORD_REQUIREMENTS_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** Sessão expira 30 dias após o login com "Lembrar" marcado, ou 1 dia caso contrário. */
export const SESSION_MAX_AGE_MS_REMEMBER = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_MS_DEFAULT = 1 * 24 * 60 * 60 * 1000;
export type AccountRole = 'student' | 'professor';

function getEmailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

export function isInstitutionalEmail(email: string): boolean {
  return getAccountRole(email) !== null;
}

// O papel deriva sempre do domínio institucional do email, nunca de uma escolha do utilizador.
export function getAccountRole(email: string): AccountRole | null {
  const domain = getEmailDomain(email);
  if (domain === STUDENT_EMAIL_DOMAIN) return 'student';
  if (domain === PROFESSOR_EMAIL_DOMAIN) return 'professor';
  return null;
}
