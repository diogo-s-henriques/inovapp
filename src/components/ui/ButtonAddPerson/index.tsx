import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToggleState } from '@/hooks/use-toggle-state';

export interface ButtonAddPersonProps {
  added?: boolean;
  defaultAdded?: boolean;
  onToggle?: (added: boolean) => void;
}

/**
 * Botão circular para adicionar/remover uma pessoa (ex.: numa lista de conexões).
 *
 * Os dois sinais são **ícones de contorno** (`add-outline` / `checkmark-outline`) e não os
 * caracteres `+` e `✓` num `Text`: eram a única coisa da app desenhada com um glifo de texto, e num
 * conjunto de ícones linear notava-se - o `+` de uma fonte não tem o mesmo traço dos outros.
 */
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
      <Ionicons
        name={isAdded ? 'checkmark-outline' : 'add-outline'}
        size={IconSize.ui}
        color={isAdded ? theme.onPrimary : theme.primary}
      />
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
});
