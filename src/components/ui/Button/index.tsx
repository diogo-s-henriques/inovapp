import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'link' | 'ghost' | 'danger' | 'dangerStrong';

/**
 * A cor de um botão que **não** é a ação principal do ecrã.
 *
 * `brand` (por omissão) usa o acento da app; `neutral` usa o quase-preto. Vive aqui, e não numa
 * variante nova, porque a diferença não é o que o botão faz mas de que lado está: as duas decisões
 * de um pedido de conexão ("Recusar"/"Aceitar") são simétricas e nenhuma delas é a ação da app -
 * pintar uma com o acento dava a uma delas uma importância que a outra não tem.
 */
export type ButtonTone = 'brand' | 'neutral';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  icon?: IoniconsName;
  style?: StyleProp<ViewStyle>;
}

/**
 * Botão base da app, com variantes de estilo (primary, secondary, link, ghost, danger,
 * dangerStrong).
 *
 * Os dois vermelhos não são a mesma coisa, e é por isso que são dois. `danger` é o vermelho **suave**
 * (fundo `dangerSoft`, texto `danger`): é o que o "Sair" usa, uma ação que se desfaz entrando outra
 * vez. `dangerStrong` é vermelho **cheio**, branco por cima, e está reservado para o que não se
 * desfaz - apagar a conta. Se os dois fossem iguais, o "Sair" parecia tão definitivo como aquilo, e
 * quem carregasse nele com a mesma confiança carregava no outro.
 */
export function Button({ label, variant = 'primary', tone = 'brand', icon, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const brand = tone === 'brand' ? theme.primary : theme.textPrimary;

  const containerStyle =
    variant === 'primary'
      ? [styles.container, styles.filled, { backgroundColor: disabled ? theme.textMuted : brand }]
      : variant === 'secondary'
        ? [styles.container, styles.outline, { borderColor: disabled ? theme.textMuted : brand }]
        : variant === 'ghost'
          ? [styles.container, styles.ghost]
          : variant === 'danger'
            ? [styles.container, { backgroundColor: theme.dangerSoft }]
            : variant === 'dangerStrong'
              ? [styles.container, { backgroundColor: disabled ? theme.textMuted : theme.danger }]
              : [styles.container, styles.link];

  const textColor =
    variant === 'primary'
      ? theme.onPrimary
      : disabled
        ? theme.textMuted
        : variant === 'ghost'
          ? theme.textNav
          : variant === 'danger'
            ? theme.danger
            : variant === 'dangerStrong'
              ? theme.onPrimary
              : brand;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [...containerStyle, pressed && !disabled && styles.pressed, style]}
      {...rest}>
      {icon && <Ionicons name={icon} size={IconSize.ui} color={textColor} />}
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
