import coursesByType from '@/constants/courses.json';
import type { CourseSelection, CourseType } from '@/types/profile';

export const COURSES_BY_TYPE = coursesByType as Record<CourseType, string[]>;

export const YEAR_OPTIONS = ['1º ano', '2º ano', '3º ano', '4º ano'];

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
 * As áreas seguem a oferta real da escola - os cursos estão ligados a elas em `COURSE_AREAS`, logo
 * abaixo - para que quem procura reconheça a disciplina pelo nome que ela tem no curso.
 *
 * A lista é curta de propósito - uma disciplina por cada coisa que alguém pediria ajuda a estudar.
 * Nomes que são a mesma coisa em sítios diferentes ("Cálculo" e "Análise Matemática") não entram
 * duas vezes: quem ensina escolhe o nome que está aqui e é esse que aparece na pesquisa.
 *
 * **Aeronáutica e engenharia/energia são áreas diferentes de propósito.** São dois grupos de cursos
 * que se cruzam pouco: quem tira Energias Renováveis e Ambiente não procura um tutor de navegação
 * aérea, e um único saco "Engenharia e Aeronáutica" fazia os dois aparecerem como matches um do
 * outro. O mesmo vale para a separação entre gestão, educação, saúde e ciências sociais.
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
    id: 'aeronautica',
    label: 'Aeronáutica e Espaço',
    subjects: [
      'Aerodinâmica',
      'Navegação Aérea',
      'Manutenção de Aeronaves',
      'Operações Aeroportuárias',
      'Regulamentação Aeronáutica',
      'Drones e Operações Aéreas',
      'Meteorologia',
    ],
  },
  {
    id: 'engenharia-energia',
    label: 'Engenharia, Energia e Ambiente',
    subjects: [
      'Eletrotecnia',
      'Eletrónica',
      'Termodinâmica',
      'Materiais',
      'Automação e Robótica',
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
      'Gestão Autárquica',
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
      'Produção Gráfica',
      'Multimédia',
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
      'Biblioteconomia',
    ],
  },
  {
    id: 'saude',
    label: 'Saúde',
    subjects: [
      'Anatomia',
      'Fisiologia',
      'Ótica e Optometria',
      'Terapia Visual',
      'Saúde Pública',
      'Gestão de Serviços de Saúde',
    ],
  },
  {
    id: 'linguas-escrita',
    label: 'Línguas e Escrita',
    subjects: ['Inglês', 'Espanhol', 'Português', 'Redação', 'Literatura'],
  },
];

/**
 * A área de interesse de cada curso do ISEC.
 *
 * Não é a lista de cadeiras do curso - é o mapa que liga os **cursos** às áreas de cima: um aluno
 * que entra em "Licenciatura em Gestão Hoteleira" já tem `turismo-hotelaria` e `gestao-economia`
 * como interesses, mesmo antes de escolher uma disciplina. É isso que faz os Matches funcionarem
 * por área e não só por disciplina exata: quem procura apoio em Hotelaria encontra quem ensina
 * Turismo, e não só quem ensina exatamente a mesma cadeira.
 *
 * As chaves são os nomes de `src/constants/courses.json` (normalizados na leitura, por isso não
 * dependem de acentos nem de maiúsculas). Os cursos que só aparecem na oferta online com um nome
 * ligeiramente diferente caem nas pistas de `COURSE_AREA_HINTS`, tal como os perfis antigos.
 *
 * Um curso pode pertencer a mais do que uma área - e é isso que se espera de "Gestão e Comunicação
 * de um Projeto de Design Aplicado", que precisa das duas.
 */
export const COURSE_AREAS: Record<string, string[]> = {
  // CTeSP
  'CTeSP em Apoio à Infância': ['educacao'],
  'CTeSP em Comunicação e Marketing': ['comunicacao-design', 'gestao-economia'],
  'CTeSP em Desenvolvimento de Produtos Multimédia': ['comunicacao-design', 'programacao-dados'],
  'CTeSP em Desenvolvimento de Produtos Turísticos': ['turismo-hotelaria', 'gestao-economia'],
  'CTeSP em Energias Renováveis e Ambiente': ['engenharia-energia', 'ciencias-naturais'],
  'CTeSP em Gestão de Tecnologia e Inovação': ['gestao-economia', 'programacao-dados'],
  'CTeSP em Gestão Financeira e Contabilidade': ['gestao-economia'],
  'CTeSP em Gestão Hoteleira': ['turismo-hotelaria', 'gestao-economia'],
  'CTeSP em Intervenção Social e Comunitária': ['direito-sociais'],
  'CTeSP em Marketing Digital': ['comunicacao-design', 'gestao-economia'],
  'CTeSP em Operações com Aeronaves Não Tripuladas': ['aeronautica'],
  'CTeSP em Produção Gráfica e Digital': ['comunicacao-design'],
  'CTeSP em Proteção Civil e Socorro': ['protecao-civil'],
  'CTeSP em Reparação e Manutenção de Aeronaves': ['aeronautica', 'engenharia-energia'],
  'CTeSP em Turismo e Transporte Aéreo': ['turismo-hotelaria', 'aeronautica'],

  // Licenciaturas
  'Licenciatura em Ciência e Visualização de Dados': ['programacao-dados', 'matematica'],
  'Licenciatura em Ciências Aeronáuticas e do Espaço': ['aeronautica', 'ciencias-naturais'],
  'Licenciatura em Comunicação Global': ['comunicacao-design', 'linguas-escrita'],
  'Licenciatura em Design e Produção Gráfica': ['comunicacao-design'],
  'Licenciatura em Educação Básica': ['educacao'],
  'Licenciatura em Energias Renováveis e Ambiente': ['engenharia-energia', 'ciencias-naturais'],
  'Licenciatura em Engenharia de Proteção Civil': ['protecao-civil', 'engenharia-energia'],
  'Licenciatura em Gestão Aeronáutica': ['aeronautica', 'gestao-economia'],
  'Licenciatura em Gestão Autárquica': ['gestao-economia', 'direito-sociais'],
  'Licenciatura em Gestão da Proteção Civil e Segurança Comunitária': ['protecao-civil', 'gestao-economia'],
  'Licenciatura em Gestão de Dados e Tecnologias em Saúde': ['programacao-dados', 'saude'],
  'Licenciatura em Gestão Hoteleira': ['turismo-hotelaria', 'gestao-economia'],
  'Licenciatura em Ótica e Optometria': ['saude'],

  // Mestrados
  'Mestrado em Educação Pré-Escolar': ['educacao'],
  'Mestrado em Educação Pré-Escolar e Ensino do 1.º Ciclo': ['educacao'],
  'Mestrado em Ensino do 1.º Ciclo do Ensino Básico e de Português e História e...': [
    'educacao',
    'linguas-escrita',
  ],
  'Mestrado em Gestão Autárquica': ['gestao-economia', 'direito-sociais'],
  'Mestrado em Gestão da Sustentabilidade do Transporte Aéreo': [
    'aeronautica',
    'gestao-economia',
    'ciencias-naturais',
  ],
  'Mestrado em Gestão Integrada dos Serviços de Saúde': ['saude', 'gestao-economia'],
  'Mestrado em Operações de Transporte Aéreo': ['aeronautica', 'gestao-economia'],
  'Mestrado em Riscos e Proteção Civil': ['protecao-civil', 'gestao-economia'],

  // Pós-graduações
  'Pós-Graduação em Administração e Gestão em Educação': ['educacao', 'gestao-economia'],
  'Pós-Graduação em Arte de Contar Estórias': ['educacao', 'linguas-escrita'],
  'Pós-Graduação em Coordenadores Municipais de Proteção Civil': ['protecao-civil', 'gestao-economia'],
  'Pós-Graduação em Design Gráfico para a Comunicação Visual': ['comunicacao-design'],
  'Pós-Graduação em Diretor de Segurança': ['protecao-civil', 'direito-sociais'],
  'Pós-Graduação em Educação Especial: Domínio Cognitivo e Motor': ['educacao', 'saude'],
  'Pós-Graduação em Ensino Outdoor': ['educacao', 'ciencias-naturais'],
  'Pós-Graduação em Gestão dos Serviços de Saúde': ['saude', 'gestao-economia'],
  'Pós-Graduação em Gestão e Comunicação de um Projeto de Design Aplicado': [
    'comunicacao-design',
    'gestao-economia',
  ],
  'Pós-Graduação em Gestão e Investigação dos Serviços Óticos-Optométricos': ['saude', 'gestao-economia'],
  'Pós-Graduação em Ilustração de Narrativas Visuais': ['comunicacao-design'],
  'Pós-Graduação em Investigação e Gestão do Design': ['comunicacao-design'],
  'Pós-Graduação em Marketing Digital': ['comunicacao-design', 'gestao-economia'],
  'Pós-Graduação em Organização e Dinamização de Bibliotecas Escolares': ['educacao', 'linguas-escrita'],
  'Pós-Graduação em Segurança contra Incêndio em Edifícios': ['protecao-civil'],
  'Pós-Graduação em Supervisão Pedagógica': ['educacao'],
  'Pós-Graduação em Terapia Visual e Treino Visual Desportivo': ['saude'],
};

/** Nome de curso comparável: sem acentos, sem maiúsculas e com espaços colapsados. */
function normalizeCourseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const COURSE_AREAS_BY_NORMALIZED_NAME: Record<string, string[]> = Object.fromEntries(
  Object.entries(COURSE_AREAS).map(([name, areaIds]) => [normalizeCourseName(name), areaIds]),
);

/**
 * Pistas para nomes de curso que não estão em `COURSE_AREAS`: perfis antigos e a oferta online com
 * um nome ligeiramente diferente do que o seletor guarda. Não substituem o mapa - só entram quando
 * não há correspondência exata.
 */
const COURSE_AREA_HINTS: { keyword: string; areaIds: string[] }[] = [
  { keyword: 'aeronaut', areaIds: ['aeronautica'] },
  { keyword: 'aeronave', areaIds: ['aeronautica'] },
  { keyword: 'aereo', areaIds: ['aeronautica'] },
  { keyword: 'aerea', areaIds: ['aeronautica'] },
  { keyword: 'espaco', areaIds: ['aeronautica'] },
  { keyword: 'protecao civil', areaIds: ['protecao-civil'] },
  { keyword: 'seguranca', areaIds: ['protecao-civil'] },
  { keyword: 'energia', areaIds: ['engenharia-energia'] },
  { keyword: 'ambiente', areaIds: ['engenharia-energia', 'ciencias-naturais'] },
  { keyword: 'dados', areaIds: ['programacao-dados'] },
  { keyword: 'tecnologia', areaIds: ['programacao-dados', 'gestao-economia'] },
  { keyword: 'inovacao', areaIds: ['programacao-dados', 'gestao-economia'] },
  { keyword: 'marketing', areaIds: ['comunicacao-design', 'gestao-economia'] },
  { keyword: 'comunicacao', areaIds: ['comunicacao-design'] },
  { keyword: 'design', areaIds: ['comunicacao-design'] },
  { keyword: 'grafic', areaIds: ['comunicacao-design'] },
  { keyword: 'multimedia', areaIds: ['comunicacao-design', 'programacao-dados'] },
  { keyword: 'turismo', areaIds: ['turismo-hotelaria'] },
  { keyword: 'hoteleir', areaIds: ['turismo-hotelaria'] },
  { keyword: 'gestao', areaIds: ['gestao-economia'] },
  { keyword: 'contabilidade', areaIds: ['gestao-economia'] },
  { keyword: 'financ', areaIds: ['gestao-economia'] },
  { keyword: 'economia', areaIds: ['gestao-economia'] },
  { keyword: 'educacao', areaIds: ['educacao'] },
  { keyword: 'ensino', areaIds: ['educacao'] },
  { keyword: 'infancia', areaIds: ['educacao'] },
  { keyword: 'pedagog', areaIds: ['educacao'] },
  { keyword: 'escolar', areaIds: ['educacao'] },
  { keyword: 'social', areaIds: ['direito-sociais'] },
  { keyword: 'comunitaria', areaIds: ['direito-sociais'] },
  { keyword: 'autarquica', areaIds: ['gestao-economia', 'direito-sociais'] },
  { keyword: 'saude', areaIds: ['saude'] },
  { keyword: 'otic', areaIds: ['saude'] },
  { keyword: 'optometr', areaIds: ['saude'] },
  { keyword: 'terapia', areaIds: ['saude'] },
  { keyword: 'direito', areaIds: ['direito-sociais'] },
  { keyword: 'biblioteca', areaIds: ['educacao', 'linguas-escrita'] },
  { keyword: 'lingua', areaIds: ['linguas-escrita'] },
  { keyword: 'portugues', areaIds: ['linguas-escrita'] },
  { keyword: 'ingles', areaIds: ['linguas-escrita'] },
];

/**
 * As áreas de um curso. Vazio quando o curso não está na lista - um perfil sem curso (ou com um
 * curso que já não existe) simplesmente não acrescenta áreas ao interesse.
 */
export function courseAreaIds(courseName?: string): string[] {
  if (!courseName?.trim()) return [];

  const normalized = normalizeCourseName(courseName);
  const exact = COURSE_AREAS_BY_NORMALIZED_NAME[normalized];
  if (exact) return [...exact];

  const areaIds = new Set<string>();
  COURSE_AREA_HINTS.forEach(({ keyword, areaIds: hintAreaIds }) => {
    if (normalized.includes(keyword)) hintAreaIds.forEach((id) => areaIds.add(id));
  });
  return [...areaIds];
}

/** As áreas de uma lista de disciplinas, contando cada área uma só vez. */
export function subjectAreaIds(subjects: string[]): string[] {
  const areaIds = new Set<string>();
  subjects.forEach((subject) => {
    const area = subjectAreaOf(subject);
    if (area) areaIds.add(area.id);
  });
  return [...areaIds];
}

/**
 * As áreas de interesse de um perfil: as do **curso** mais as das disciplinas escolhidas.
 *
 * É esta a união que a descoberta usa. O curso dá o contexto largo (quem está em Gestão Hoteleira
 * interessa-se por Turismo e por Gestão) e as disciplinas afinam-no (quem escolheu "Cálculo" quer
 * Matemática). Nenhum dos dois exclui o outro.
 */
export function interestAreaIds(subjects: string[], courseName?: string): string[] {
  return [...new Set([...courseAreaIds(courseName), ...subjectAreaIds(subjects)])];
}

/** Lista achatada, pela ordem das áreas: é o que os chips, os seletores e os filtros usam. */
export const SUBJECT_OPTIONS = SUBJECT_AREAS.flatMap((area) => area.subjects);

/** A área de uma disciplina, ou nada se ela já não estiver na lista (perfis antigos). */
export function subjectAreaOf(subject: string): SubjectArea | undefined {
  return SUBJECT_AREAS.find((area) => area.subjects.includes(subject));
}

export const PERIOD_OPTIONS = ['Manhãs', 'Tardes', 'Fins de tarde', 'Fins de semana'];

export const MODALITY_OPTIONS = ['Presencial', 'Online', 'Ambos'];
