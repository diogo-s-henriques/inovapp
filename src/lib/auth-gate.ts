import type { AppUser } from '@/types/auth';

/**
 * Que ecrãs a app mostra, decidido num sítio só.
 *
 * Existe pela mesma razão que o `matchesView`: esta decisão estava espalhada por dentro dos
 * `guard` do `Stack` no `_layout.tsx`, onde não há forma de a testar - e é uma decisão que falha
 * mal, porque o sintoma de uma guarda errada é um ecrã que aparece quando não devia (ou a app
 * presa no splash). Aqui é uma função de valores para valor.
 */
export type AuthStage = 'loading' | 'signed-out' | 'verify-email' | 'profile-setup' | 'app';

export interface AuthGateInput {
  /** Enquanto o Firebase não disse se há sessão, não se decide nada. */
  initializing: boolean;
  user: AppUser | null;
  /** `null` enquanto a subscrição ao perfil não respondeu. */
  profileCompleted: boolean | null;
}

export function authStage({ initializing, user, profileCompleted }: AuthGateInput): AuthStage {
  if (initializing) return 'loading';
  if (!user) return 'signed-out';

  /**
   * A confirmação do email vem **antes de tudo o resto** - antes do perfil, e antes até de se
   * saber se o perfil existe (que é o que o `profileCompleted === null` significa).
   *
   * Por duas razões, e as duas são de ordem: um email institucional que ninguém provou ser seu não
   * pode chegar a escrever um perfil com o nome de outra pessoa (ver firestore.rules - a mesma
   * exigência está no servidor, e é lá que conta); e este ecrã **não pode depender da leitura do
   * perfil**, senão uma leitura recusada a quem não confirmou deixava a app presa no splash - o
   * próprio ecrã que explica o que fazer nunca chegava a aparecer. Saber se o email está confirmado
   * não precisa do Firestore: vem do token.
   */
  if (!user.emailVerified) return 'verify-email';

  // Sem resposta sobre o perfil continuamos a carregar: mostrar o ecrã de configuração a quem já o
  // tem, ou a app a quem não tem, é mostrar o ecrã errado por um instante.
  if (profileCompleted === null) return 'loading';

  if (!profileCompleted) return 'profile-setup';
  return 'app';
}
