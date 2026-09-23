export const PROFESSOR_EMAIL_DOMAIN = 'iseclisboa.pt';

/** Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 caráter especial. */
export const PASSWORD_REQUIREMENTS_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** Sessão expira 30 dias após o login com "Lembrar" marcado, ou 1 dia caso contrário. */
export const SESSION_MAX_AGE_MS_REMEMBER = 30 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_MS_DEFAULT = 1 * 24 * 60 * 60 * 1000;
export type AccountRole = 'student' | 'professor';

/**
 * O papel de quem não tem email do ISEC.
 *
 * O registo **deixou de estar fechado aos domínios institucionais**, e é isso que torna a
 * distribuição pública da app uma afirmação verdadeira - a revisão da Apple recusava-a com a
 * diretriz 3.2 enquanto as regras do servidor só deixavam entrar dois domínios (o raciocínio todo
 * está no STORE.md). Consequência a assumir: o papel já não pode ser *uma porta de entrada*, e
 * passa a ser o que quase sempre foi na prática - quem entra procura ou dá apoio entre pares.
 *
 * A única distinção que sobrevive é a do **docente do ISEC**, que continua presa ao domínio: é um
 * rótulo que a instituição empresta ("Tutor", ver src/lib/roles.ts), não uma escolha do
 * utilizador. O mesmo par está do lado do servidor, em `roleAllowedForEmail` (firestore.rules).
 */
export const DEFAULT_ACCOUNT_ROLE: AccountRole = 'student';

function getEmailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

/**
 * O papel de uma conta, a partir do email.
 *
 * Devolve **sempre** um papel: já não existe o caso "não é institucional, logo não entra". Um
 * endereço `@iseclisboa.pt` é docente (o domínio do corpo docente do ISEC); tudo o resto é aluno,
 * `@alunos.iseclisboa.pt` incluído - que continua a ser o caso normal de quem estuda no ISEC, e
 * não precisa de um ramo de código só para si.
 */
export function getAccountRole(email: string): AccountRole {
  return getEmailDomain(email) === PROFESSOR_EMAIL_DOMAIN ? 'professor' : DEFAULT_ACCOUNT_ROLE;
}
