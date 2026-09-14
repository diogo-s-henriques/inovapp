import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/** Cabeçalho de secção com título e ação opcional (ex.: "Ver todos"). */
export interface SectionHeaderProps extends ViewProps {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onPressAction, style, ...rest }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, style]} {...rest}>
      <View style={styles.titleGroup}>
        {/* Traço de marca à frente do título da secção: é o que dá à Home um ar próprio sem
            uma faixa colorida a ocupar meio ecrã. */}
        <View style={[styles.accent, { backgroundColor: theme.primary }]} />
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>
      {actionLabel && (
        <Pressable onPress={onPressAction} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <ThemedText type="smallBold" themeColor="primary">
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  accent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
});
