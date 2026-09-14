import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';

/** Cabeçalho de secção com título e ação opcional (ex.: "Ver todos"). */
export interface SectionHeaderProps extends ViewProps {
  title: string;
  actionLabel?: string;
  onPressAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onPressAction, style, ...rest }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]} {...rest}>
      <ThemedText type="subtitle">{title}</ThemedText>
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
});
