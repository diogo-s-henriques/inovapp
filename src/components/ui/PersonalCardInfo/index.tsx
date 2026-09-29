import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { joinCourseAndYear } from '@/constants/profile';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Mostra o nome e o par curso/ano de um utilizador, sem imagem de perfil. */
export interface PersonalCardInfoProps extends ViewProps {
  name: string;
  course: string;
  year: string;
}

export function PersonalCardInfo({ name, course, year, style, ...rest }: PersonalCardInfoProps) {
  const theme = useTheme();
  // Curso/ano vazios mostravam um "·" solto (ex.: perfis ainda sem curso definido) - agora é o
  // `joinCourseAndYear` que decide, para o mesmo cuidado valer em todo o lado.
  const details = joinCourseAndYear(course, year);

  return (
    <View style={[styles.container, style]} {...rest}>
      <Text style={[styles.name, { color: theme.textPrimary }]}>{name}</Text>
      {details.length > 0 && <Text style={[styles.details, { color: theme.textMuted }]}>{details}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    fontSize: 13,
    fontWeight: '400',
  },
});
