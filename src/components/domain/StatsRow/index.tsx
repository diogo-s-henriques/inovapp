import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface StatItem {
  value: number;
  /** Fica por baixo do número e pode ocupar duas linhas. */
  label: string;
}

export interface StatsRowProps {
  items: StatItem[];
  style?: StyleProp<ViewStyle>;
}

/**
 * Números do perfil, lado a lado em caixas iguais.
 *
 * As caixas são todas do mesmo tamanho (`flex: 1`) de propósito: com números de um e de dois
 * dígitos, caixas ajustadas ao conteúdo fariam a linha tremer a cada sessão concluída.
 */
export function StatsRow({ items, style }: StatsRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, style]}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="subtitle" themeColor="primaryDark" style={styles.value}>
            {item.value}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" style={styles.label}>
            {item.label}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  value: {
    fontSize: 22,
  },
  label: {
    textAlign: 'center',
  },
});
