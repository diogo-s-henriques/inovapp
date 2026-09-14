import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/** Cartão de secção com etiqueta opcional acima do conteúdo. */
export interface SectionCardProps extends ViewProps {
  label?: string;
}

export function SectionCard({ label, children, style, ...rest }: SectionCardProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper} {...rest}>
      {label && (
        <ThemedText type="small" themeColor="textMuted">
          {label}
        </ThemedText>
      )}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
