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

/**
 * Curso e ano numa linha, com o separador só quando há mesmo dois valores.
 *
 * O curso é opcional no perfil e um professor não tem curso nem ano: sem o filtro, a linha mostrava
 * um `" · "` (ou um `", "`) órfão por baixo do nome, a apontar para o nada.
 */
export function joinCourseAndYear(course?: string, year?: string): string {
  return [course, year].filter(Boolean).join(' · ');
}

/**
 * Uma área de interesse: um rótulo e as disciplinas que lhe pertencem.
 *
 * O `id` é o que fica estável - o rótulo pode ser reescrito sem estragar nada. Uma disciplina
 * pertence **a uma só área** (é o que permite usar a área como sinal de match: ver `subjectAreaOf`),
 * e é isso que faz da lista achatada (`SUBJECT_OPTIONS`) uma coisa derivada e sem duplicados.
 *
 * Os rótulos estão em português como as próprias disciplinas (não passam pelo i18n). Traduzir isto
 * é traduzir a lista toda, incluindo as disciplinas já gravadas nos perfis - trabalho à parte.
 */
export interface SubjectArea {
  id: string;
  label: string;
  subjects: string[];
}

/**
 * As áreas seguem a oferta real da escola (aeronáutica, proteção civil, ótica, gestão, educação,
 * design/multimédia) para que quem procura reconheça a disciplina pelo nome que ela tem no curso.
 *
 * A lista é curta de propósito - uma disciplina por cada coisa que alguém pediria ajuda a estudar.
 * Nomes que são a mesma coisa em sítios diferentes ("Cálculo" e "Análise Matemática") não entram
 * duas vezes: quem ensina escolhe o nome que está aqui e é esse que aparece na pesquisa.
 */
export const SUBJECT_AREAS: SubjectArea[] = [
  {
    id: 'matematica',
    label: 'Matemática e Estatística',
    subjects: ['Matemática', 'Cálculo', 'Álgebra Linear', 'Estatística', 'Probabilidades'],
  },
  {
    id: 'ciencias-naturais',
    label: 'Física e Ciências Naturais',
    subjects: ['Física', 'Química', 'Biologia', 'Geologia', 'Astronomia', 'Ciências do Ambiente'],
  },
  {
    id: 'programacao-dados',
    label: 'Programação e Dados',
    subjects: [
      'Programação',
      'Algoritmos e Estruturas de Dados',
      'Bases de Dados',
      'Redes de Computadores',
      'Inteligência Artificial',
      'Análise de Dados',
      'Segurança Informática',
      'Desenvolvimento Web',
      'Desenvolvimento Móvel',
    ],
  },
  {
    id: 'engenharia-aeronautica',
    label: 'Engenharia e Aeronáutica',
    subjects: [
      'Eletrotecnia',
      'Eletrónica',
      'Termodinâmica',
      'Materiais',
      'Automação e Robótica',
      'Aerodinâmica',
      'Navegação Aérea',
      'Manutenção de Aeronaves',
      'Energias Renováveis',
    ],
  },
  {
    id: 'protecao-civil',
    label: 'Proteção Civil e Segurança',
    subjects: [
      'Proteção Civil',
      'Primeiros Socorros',
      'Combate a Incêndios',
      'Segurança Contra Incêndio',
      'Gestão de Riscos',
      'Socorro e Emergência',
      'Direito da Segurança',
    ],
  },
  {
    id: 'gestao-economia',
    label: 'Gestão e Economia',
    subjects: [
      'Economia',
      'Contabilidade',
      'Gestão Financeira',
      'Marketing',
      'Gestão de Projetos',
      'Recursos Humanos',
      'Empreendedorismo',
      'Logística',
    ],
  },
  {
    id: 'turismo-hotelaria',
    label: 'Turismo e Hotelaria',
    subjects: ['Turismo', 'Gestão Hoteleira', 'Restauração', 'Transporte Aéreo', 'Protocolo e Eventos'],
  },
  {
    id: 'direito-sociais',
    label: 'Direito e Ciências Sociais',
    subjects: [
      'Direito',
      'Direito Constitucional',
      'Direito do Trabalho',
      'Sociologia',
      'Psicologia',
      'Intervenção Social',
    ],
  },
  {
    id: 'comunicacao-design',
    label: 'Comunicação e Design',
    subjects: [
      'Comunicação',
      'Jornalismo',
      'Marketing Digital',
      'Design Gráfico',
      'Ilustração',
      'Fotografia',
      'Vídeo e Edição',
      'UX/UI',
    ],
  },
  {
    id: 'educacao',
    label: 'Educação',
    subjects: [
      'Didática',
      'Psicologia da Educação',
      'Educação Especial',
      'Supervisão Pedagógica',
      'Leitura e Escrita',
      'Educação de Infância',
    ],
  },
  {
    id: 'saude',
    label: 'Saúde',
    subjects: ['Anatomia', 'Fisiologia', 'Ótica e Optometria', 'Terapia Visual', 'Saúde Pública'],
  },
  {
    id: 'linguas-escrita',
    label: 'Línguas e Escrita',
    subjects: ['Inglês', 'Espanhol', 'Português', 'Redação', 'Literatura'],
  },
];

/** Lista achatada, pela ordem das áreas: é o que os chips, os seletores e os filtros usam. */
export const SUBJECT_OPTIONS = SUBJECT_AREAS.flatMap((area) => area.subjects);

/** A área de uma disciplina, ou nada se ela já não estiver na lista (perfis antigos). */
export function subjectAreaOf(subject: string): SubjectArea | undefined {
  return SUBJECT_AREAS.find((area) => area.subjects.includes(subject));
}

export const PERIOD_OPTIONS = ['Manhãs', 'Tardes', 'Fins de tarde', 'Fins de semana'];

export const MODALITY_OPTIONS = ['Presencial', 'Online', 'Ambos'];

/** Opção de participação: só o modo e o ícone são fixos no código. Todas as etiquetas
 * (chip, papel, título/subtítulo do cartão) vêm do i18n - ver `participationModes` em
 * src/i18n/translations.ts - para acompanharem o idioma escolhido. */
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
