import type { ParticipationMode } from '@/types/profile';

/**
 * As regras de "posso avançar?" do assistente de perfil e de "posso guardar?" na edição, fora dos
 * ecrãs que as usam.
 *
 * Estão aqui, e não no meio do JSX, pela mesma razão que o `matchesView` está em src/lib/matching.ts:
 * são decisões pequenas com consequências grandes e nenhuma delas rebenta nada se for trocada - o
 * botão fica só ativo a mais ou a menos, e o erro aparece semanas depois, numa conta sem ano.
 * Assim testam-se sem React, sem base de dados e sem ecrã nenhum (ver tests/lib/profile-form.test.mts).
 *
 * O que é obrigatório, e porquê:
 *
 * - **Nome**, para toda a gente. É o que aparece em todos os cartões e no chat.
 * - **Ano**, só para estudantes. Não é decorativo: é ele que decide se a pessoa pode ser mentora
 *   (ver `isEligibleToTeach`) e é o que dá sentido à escolha de modo no passo 3.
 * - **Modo de participação**, no último passo dos estudantes: sem ele não se sabe se a pessoa quer
 *   ser acompanhada, acompanhar, ou as duas coisas.
 * - **Curso**, ninguém: é opcional de propósito (quem o preenche aparece na pesquisa por curso).
 */
export interface SetupStepParams {
  isProfessor: boolean;
  /** Passo em que o assistente está; acima do total é o ecrã final de conclusão. */
  step: number;
  fullName: string;
  year?: string;
  participationMode?: ParticipationMode;
}

export function canContinueSetup({ isProfessor, step, fullName, year, participationMode }: SetupStepParams): boolean {
  const hasName = fullName.trim().length > 0;

  if (step === 1) return hasName && (isProfessor || !!year);
  if (step === 3) return isProfessor || !!participationMode;

  // Passo 2 (as disciplinas que quer aprender) tem "Saltar por agora": nada ali é obrigatório. O
  // ecrã final também passa por aqui - o botão que o desenha é o mesmo, a dizer "Concluir".
  return true;
}

export interface SaveProfileParams {
  saving: boolean;
  isProfessor: boolean;
  fullName: string;
  year?: string;
  hasChanges: boolean;
}

/**
 * Se o "Guardar" da edição de perfil está ativo.
 *
 * O ano continua obrigatório aqui, e não só na criação: uma conta que já existisse sem ano (de
 * antes desta regra) guardava uma edição qualquer e ficava sem ano para sempre. O curso não entra -
 * é opcional nos dois sítios.
 */
export function canSaveProfile({ saving, isProfessor, fullName, year, hasChanges }: SaveProfileParams): boolean {
  if (saving || !hasChanges) return false;
  if (fullName.trim().length === 0) return false;
  return isProfessor || !!year;
}
