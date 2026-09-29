import type { AccountRole } from '@/constants/auth';
import type { Translations } from '@/i18n/translations';

/**
 * O papel de alguém, em texto, para se mostrar por baixo do nome.
 *
 * São dois, e só dois: um **Tutor** é um docente do ISEC (o papel que o domínio do email decide -
 * ver `getAccountRole` em src/constants/auth.ts) e um **Tutorando** é qualquer outra conta, que é
 * quem procura apoio. Não há escolha a fazer em lado nenhum: o papel de uma conta é o mesmo do
 * primeiro ao último ecrã, e não muda com o que a pessoa faz dentro da app.
 *
 * O que isto garante, e é a razão de o texto viver num sítio só: um professor nunca é "Tutorando"
 * (nem quem se registe com um email de aluno chega a "Tutor"), e todos os ecrãs que mostram o
 * papel de alguém - a Home, o Perfil, os cartões da descoberta - dizem a mesma coisa.
 *
 * Recebe o dicionário em vez de o ir buscar, para poder ser testada com um dicionário fixo (é
 * pura: sem React e sem base de dados). O `getTranslations()` só é usado por quem a chama de
 * código fora de componentes.
 */
export function roleLabel(accountRole: AccountRole | undefined, i18n: Translations): string {
  return accountRole === 'professor' ? i18n.roles.tutor : i18n.roles.tutee;
}
