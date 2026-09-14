import type { AccountRole } from '@/constants/auth';

export type ParticipationMode = 'learn' | 'teach' | 'both';

export type CourseType = 'CTeSP' | 'Licenciatura' | 'Mestrado' | 'Pós-Graduação';

export interface CourseSelection {
  type: CourseType;
  name: string;
}

// Dados recolhidos durante o fluxo de configuração inicial do perfil.
export interface ProfileSetupData {
  photoUri?: string;
  fullName: string;
  role?: AccountRole;
  /** Aplicável apenas a estudantes. */
  course?: CourseSelection;
  /** Aplicável apenas a estudantes; um dos valores de YEAR_OPTIONS. */
  year?: string;
  about: string;
  learningSubjects: string[];
  participationMode?: ParticipationMode;
  teachingSubjects: string[];
  availabilityPeriods: string[];
  availabilityModality: string[];
}
