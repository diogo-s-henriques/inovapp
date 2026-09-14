// Representa um estudante sugerido no ecrã de correspondência (match) entre mentores e tutorandos.
export interface MatchCandidate {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  course: string;
  year: string;
  subjects: string[];
  availability: string;
  availabilityPeriods: string[];
  availabilityModality: string[];
  description: string;
  // Número de sessões já dadas como mentor; usado como indicador de experiência.
  sessionsGiven: number;
  responseTime: string;
  image?: string;
}
