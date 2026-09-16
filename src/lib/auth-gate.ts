import type { AppUser } from '@/types/auth';

/**
 * Que ecrãs a app mostra, decidido num sítio só.
 *
 * Existe pela mesma razão que o `matchesView`: esta decisão estava espalhada por dentro dos
 * `guard` do `Stack` no `_layout.tsx`, onde não há forma de a testar - e é uma decisão que falha
 * mal, porque o sintoma de uma guarda errada é um ecrã que aparece quando não devia (ou a app
 * presa no splash). Aqui é uma função de valores para valor.
 */
export type AuthStage =
  | 'loading'
  | 'signed-out'
  | 'signing-in'
  | 'verify-email'
  | 'profile-setup'
  | 'app';

export interface AuthGateInput {
  /** Enquanto o Firebase não disse se há sessão, não se decide nada. */
  initializing: boolean;
  user: AppUser | null;
  /** `null` enquanto a subscrição ao perfil não respondeu. */
  profileCompleted: boolean | null;
  /**
   * Se a app já mostrou um ecrã nesta execução - ou seja, se já passou do arranque.
   *
   * Existe para distinguir **duas esperas iguais por dentro e opostas por fora**. No arranque, estar
   * à espera da resposta do perfil é estar atrás do splash: não há ecrã nenhum para mostrar e
   * mostrar o errado por um instante é pior do que não mostrar nada. Depois de alguém carregar em
   * "Entrar", a mesma espera acontece **com o ecrã de entrada já à frente dos olhos**, e aí o que
   * não pode acontecer é o ecrã desaparecer e ficar um vazio até a Home existir.
   */
  bootstrapped: boolean;
}

export function authStage({ initializing, user, profileCompleted, bootstrapped }: AuthGateInput): AuthStage {
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

  /**
   * Sem resposta sobre o perfil: quem espera é o arranque ou o ecrã de entrada.
   *
   * Mostrar a configuração de perfil a quem já o tem, ou a app a quem não tem, é mostrar o ecrã
   * errado por um instante - por isso nunca se adivinha. O que muda com o `bootstrapped` é **o que
   * fica à espera**:
   *
   * - no arranque, `loading` (o splash continua a tapar tudo, que é o que se quer);
   * - a seguir a um "Entrar", `signing-in` - o ecrã de entrada fica onde está e é ele que se
   *   dissolve quando a Home chega. Foi isto que faltava na primeira versão: este intervalo era
   *   `loading`, o `Stack` inteiro era desmontado por causa disso (ver o `isReady` no
   *   `src/app/_layout.tsx`), e a transição que devia ser um `fade` era um corte seco com um ecrã
   *   vazio no meio.
   */
  if (profileCompleted === null) return bootstrapped ? 'signing-in' : 'loading';

  if (!profileCompleted) return 'profile-setup';
  return 'app';
}
