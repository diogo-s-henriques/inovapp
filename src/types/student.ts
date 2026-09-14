export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  course: string;
  year: string;
  tags: string[];
  image?: string;
  // Indica se este estudante já foi adicionado à lista de contactos do utilizador atual.
  added?: boolean;
}

export interface FilterGroup {
  id: string;
  title: string;
  options: string[];
}

export interface StudentFilters {
  query?: string;
  course?: string;
  tags?: string[];
}
