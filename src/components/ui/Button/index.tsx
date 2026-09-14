import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'link' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  icon?: IoniconsName;
  style?: StyleProp<ViewStyle>;
}

/** Botão base da app, com variantes de estilo (primary, secondary, link, ghost). */
export function Button({ label, variant = 'primary', icon, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();

  const containerStyle =
    variant === 'primary'
      ? [styles.container, styles.filled, { backgroundColor: disabled ? theme.textMuted : theme.primary }]
      : variant === 'secondary'
        ? [styles.container, styles.outline, { borderColor: disabled ? theme.textMuted : theme.primary }]
        : variant === 'ghost'
          ? [styles.container, styles.ghost]
          : [styles.container, styles.link];

  const textColor =
    variant === 'primary'
      ? theme.onPrimary
      : disabled
        ? theme.textMuted
        : variant === 'ghost'
          ? theme.textNav
          : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [...containerStyle, pressed && !disabled && styles.pressed, style]}
      {...rest}>
      {icon && <Ionicons name={icon} size={18} color={textColor} />}
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.six,
  },
  filled: {},
  outline: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  link: {
    paddingHorizontal: Spacing.two,
    backgroundColor: 'transparent',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
});
