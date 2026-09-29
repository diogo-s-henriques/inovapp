import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useToggleState } from '@/hooks/use-toggle-state';

/**
 * Etiqueta de perfil com três modos: removível (quando há onRemove), seletor
 * alternável (interactive, por omissão true) ou puramente estática (interactive={false}).
 */
export interface TagProfileProps extends ViewProps {
  title: string;
  selected?: boolean;
  defaultSelected?: boolean;
  onToggle?: (selected: boolean) => void;
  interactive?: boolean;
  onRemove?: () => void;
  /**
   * Etiqueta destacada sem ser interactiva: usada nos cartões para marcar o que tem a ver com quem
   * está a ver (as disciplinas em comum), sem a transformar num botão que não faz nada.
   */
  highlight?: boolean;
}

export function TagProfile({
  title,
  selected,
  defaultSelected = false,
  onToggle,
  interactive = true,
  onRemove,
  highlight,
  style,
  ...rest
}: TagProfileProps) {
  const theme = useTheme();
  const [isToggled, toggleSelected] = useToggleState(selected, defaultSelected, onToggle);
  const isSelected = interactive && isToggled;
  // O destaque e a escolha dão o mesmo aspecto de propósito: num cartão, "isto é teu" e numa
  // lista, "isto está escolhido" são a mesma ideia - o que é meu (ver a nota no comentário acima).
  const isEmphasized = isSelected || !!highlight;

  const tagStyle = [
    styles.tag,
    isEmphasized
      ? { backgroundColor: theme.primary, borderColor: theme.primary }
      : { backgroundColor: theme.surface, borderColor: theme.border },
    style,
  ];

  // onRemove tem prioridade sobre o comportamento de alternância normal
  if (onRemove) {
    return (
      <Pressable
        onPress={onRemove}
        accessibilityLabel={`Remover ${title}`}
        accessibilityRole="button"
        style={tagStyle}
        {...rest}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>{title} ×</Text>
      </Pressable>
    );
  }

  const label = (
    <Text numberOfLines={1} style={[styles.label, { color: isEmphasized ? theme.onPrimary : theme.textPrimary }]}>
      {title}
      {isSelected ? ' ✓' : ''}
    </Text>
  );

  if (!interactive) {
    return (
      <View style={tagStyle} {...rest}>
        {label}
      </View>
    );
  }

  return (
    <Pressable
      onPress={toggleSelected}
      accessibilityLabel={isSelected ? `Remover ${title}` : `Adicionar ${title}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={tagStyle}
      {...rest}>
      {label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
