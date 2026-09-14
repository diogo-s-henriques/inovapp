// Dados submetidos ao avaliar uma sessão de mentoria concluída.
export interface NewRatingData {
  rating: number;
  subject: string;
  tags: string[];
  comment: string;
}
