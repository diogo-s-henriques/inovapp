import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import coursesByType from '@/constants/courses.json';
import type { CourseSelection, CourseType, ParticipationMode } from '@/types/profile';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export const COURSES_BY_TYPE = coursesByType as Record<CourseType, string[]>;

export const YEAR_OPTIONS = ['1º ano', '2º ano', '3º ano', '4º ano'];

// Só é possível ser mentor a partir do 2º ano (índice 1 em YEAR_OPTIONS).
export function isEligibleToTeach(year?: string): boolean {
  const index = YEAR_OPTIONS.indexOf(year ?? '');
  return index >= 1;
}

export function formatCourseAndYear(course?: CourseSelection, year?: string): string {
  if (!course) return '';
  return year ? `${course.name}, ${year}` : course.name;
}

export const SUBJECT_OPTIONS = [
  'Matemática',
  'Física',
  'Química',
  'Programação',
  'Inglês',
  'Estatística',
  'Contabilidade',
  'Direito',
  'Biologia',
  'Cálculo',
  'Redação',
  'Economia',
];

export const PERIOD_OPTIONS = ['Manhãs', 'Tardes', 'Fins de tarde', 'Fins de semana'];

export const MODALITY_OPTIONS = ['Presencial', 'Online', 'Ambos'];

/** Opção de participação: só o modo e o ícone são fixos no código. Todas as etiquetas
 * (chip, papel, título/subtítulo do cartão) vêm do i18n — ver `participationModes` em
 * src/i18n/translations.ts — para acompanharem o idioma escolhido. */
export interface ParticipationModeOption {
  mode: ParticipationMode;
  icon: IoniconsName;
}

export const PARTICIPATION_MODES: ParticipationModeOption[] = [
  { mode: 'learn', icon: 'document-text-outline' },
  { mode: 'teach', icon: 'person-outline' },
  { mode: 'both', icon: 'people-outline' },
];

export function canTeach(mode?: ParticipationMode): boolean {
  return mode === 'teach' || mode === 'both';
}

export function canLearn(mode?: ParticipationMode): boolean {
  return mode === 'learn' || mode === 'both';
}
