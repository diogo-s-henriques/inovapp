import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface EditButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  /**
   * Descrição para leitores de ecrã: o botão diz "Editar", mas o que edita é o perfil — sem isto,
   * quem não vê a página ouve um botão chamado "Editar" sem saber o que vai editar.
   */
  accessibilityLabel: string;
}

/**
 * O botão de editar do perfil, que vive **dentro do bloco da identidade** (`identityExtra` do
 * `ScreenHero`), por baixo do nome e do curso.
 *
 * Chegou a ser maior ("Editar Perfil") e a estar ao lado do nome: tirou-lhe a linha inteira de que
 * o nome precisa. Aqui é um botão pequeno de contorno com o lápis e a palavra, na coluna do texto —
 * fica perto da fotografia e do nome, que é onde se procura, sem competir com eles.
 *
 * O fundo é **branco** e não transparente: assenta sobre o tom claro do bloco (a mesma superfície
 * do resto da app), e é o que o separa de um fundo que também é claro.
 */
export function EditButton({ label, accessibilityLabel, ...rest }: EditButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
      {...rest}>
      <Ionicons name="pencil-outline" size={IconSize.ui} color={theme.textPrimary} />
      <ThemedText type="smallBold" themeColor="textPrimary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.six,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
