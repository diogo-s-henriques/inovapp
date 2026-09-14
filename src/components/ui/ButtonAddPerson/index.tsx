import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToggleState } from '@/hooks/use-toggle-state';

export interface ButtonAddPersonProps {
  added?: boolean;
  defaultAdded?: boolean;
  onToggle?: (added: boolean) => void;
}

/** Botão circular para adicionar/remover uma pessoa (ex.: numa lista de conexões). */
export function ButtonAddPerson({ added, defaultAdded = false, onToggle }: ButtonAddPersonProps) {
  const theme = useTheme();
  const [isAdded, toggle] = useToggleState(added, defaultAdded, onToggle);

  return (
    <Pressable
      onPress={toggle}
      accessibilityLabel={isAdded ? 'Remover utilizador' : 'Adicionar utilizador'}
      accessibilityRole="button"
      accessibilityState={{ selected: isAdded }}
      style={[
        styles.action,
        isAdded
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.surface, borderColor: theme.primary },
      ]}>
      <Text style={[styles.actionText, { color: isAdded ? theme.onPrimary : theme.primary }]}>
        {isAdded ? '✓' : '+'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: Spacing.five,
    height: Spacing.five,
    borderRadius: Spacing.five / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
