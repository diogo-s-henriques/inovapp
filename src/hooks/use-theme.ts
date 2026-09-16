import { Colors } from '@/constants/theme';

// Devolve sempre a paleta clara: o modo escuro ainda não está implementado,
// não é um esquecimento - é uma limitação intencional da versão atual.
export function useTheme() {
  return Colors;
}
