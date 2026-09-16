import { canLearn, canTeach } from '@/constants/profile';
import type { AccountRole } from '@/constants/auth';
import type { ParticipationMode } from '@/types/profile';
import type { Translations } from '@/i18n/translations';

/**
 * O papel de alguém, em texto, para se mostrar por baixo do nome.
 *
 * Três decisões que se lêem no código:
 *
 * - **"Mentor" é sempre um aluno** a ensinar outro aluno. Um professor (`@iseclisboa.pt`, papel
 *   determinado pelo domínio do email - ver src/constants/auth.ts) nunca é "Mentor", é "Tutor".
 * - **Quem ensina e aprende ao mesmo tempo** não escolhe um dos dois rótulos: diz os dois
 *   ("Mentor e Tutorando"), porque é isso que é.
 * - Sem modo definido, cai em "Tutorando" - quem não disse o que quer está, por omissão, à
 *   procura de apoio.
 *
 * Recebe o dicionário em vez de o ir buscar, para poder ser testada com um dicionário fixo (é
 * pura: sem React e sem base de dados). O `getTranslations()` só é usado por quem a chama de
 * código fora de componentes.
 */
export function roleLabel(
  mode: ParticipationMode | undefined,
  accountRole: AccountRole | undefined,
  i18n: Translations,
): string {
  const teachLabel = accountRole === 'professor' ? i18n.roles.tutor : i18n.roles.mentor;
  if (canTeach(mode) && canLearn(mode)) return i18n.roles.withTutee(teachLabel);
  if (canTeach(mode)) return teachLabel;
  return i18n.roles.tutee;
}
