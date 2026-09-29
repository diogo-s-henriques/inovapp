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
 * - **Ano**, só para estudantes. Não é decorativo: diz que a pessoa é aluna da escola, e é o papel
 *   (docente do ISEC ou aluno) que decide de que lado da app ela fica - ver `getAccountRole` em
 *   src/constants/auth.ts.
 * - **Curso**, ninguém: é opcional de propósito (quem o preenche aparece na pesquisa por curso).
 *
 * O assistente tem passos diferentes para cada papel - um professor tem três (perfil, disciplinas,
 * disponibilidade) e um aluno tem dois (perfil, objetivos) -, mas só o primeiro tem campos
 * obrigatórios: os outros têm "Saltar por agora" ou nada para preencher. É por isso que a única
 * decisão aqui é sobre o passo 1.
 */
/**
 * Quantos passos tem o assistente de perfil, por papel.
 *
 * Um **aluno** tem dois (o perfil e os objetivos de aprendizagem) e um **docente** tem três (o
 * perfil, as disciplinas que ensina e a disponibilidade): o terceiro passo só existe para quem
 * aparece na descoberta, e quem procura não tem nada que responder lá. Era aqui que vivia o passo
 * do modo de participação, que deixou de existir quando o papel passou a vir do email.
 *
 * Vive com as outras regras do assistente porque é a decisão que diz ao ecrã onde acaba o fluxo -
 * uma troca destas não rebenta nada, deixa um passo a mais ou a menos (ver src/app/profile-setup.tsx).
 */
export function setupSteps(isProfessor: boolean): number {
  return isProfessor ? 3 : 2;
}

export interface SetupStepParams {
  isProfessor: boolean;
  /** Passo em que o assistente está; acima do total é o ecrã final de conclusão. */
  step: number;
  fullName: string;
  year?: string;
}

/** A partir do passo 1 não se pede nada: os passos seguintes não têm campos obrigatórios. */
export function canContinueSetup({ isProfessor, step, fullName, year }: SetupStepParams): boolean {
  if (step === 1) return fullName.trim().length > 0 && (isProfessor || !!year);

  // Os passos seguintes (disciplinas e disponibilidade) não exigem nada, e o ecrã final usa o
  // mesmo botão a dizer "Concluir".
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
