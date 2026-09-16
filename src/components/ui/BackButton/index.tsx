import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { IconSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * O lado do quadrado do botão de voltar.
 *
 * É um valor do componente, e não de cada ecrã, porque os ecrãs empilhados andaram com **três**
 * botões diferentes a fazer a mesma coisa: um chevron nu de 22 px (Notificações, Sessões,
 * Materiais, conversa), um círculo de 36 px com contorno (Definições) e um círculo de 36 px sobre
 * a fotografia (perfil de outra pessoa). A 36 px o alvo do toque é o recomendado (a norma pede
 * ≥ 44, mas o `hitSlop` de 8 de cada lado leva-o a 52), e é o mesmo tamanho em todo o lado.
 */
export const BACK_BUTTON_SIZE = 36;

export interface BackButtonProps extends Omit<PressableProps, 'onPress' | 'style'> {
  /** Estilo do quadrado do botão (posição, margem). */
  style?: StyleProp<ViewStyle>;
  /**
   * Rótulo acessível ("Voltar", "Voltar às sessões"). Obrigatório: é um ícone sem texto, e sem
   * isto não há nada que um leitor de ecrã anuncie.
   */
  label: string;
  onPress: () => void;
  /**
   * `surface` põe um fundo próprio com contorno — é para quando o botão assenta sobre uma
   * fotografia ou um bloco colorido, onde um chevron nu perde o contraste. `plain` (por omissão)
   * é o mesmo botão sem fundo, para quando já está sobre o fundo do ecrã.
   */
  variant?: 'plain' | 'surface';
}

/**
 * O botão de voltar dos ecrãs empilhados (aqueles a que se chega a partir de outro ecrã).
 *
 * Vive aqui, e não em cada ecrã, pela mesma razão do `ScreenHero` nos separadores: um botão
 * desenhado à mão por ecrã diverge. O `hitSlop` é a única parte invisível — o símbolo tem 22 px e
 * o alvo do toque é bem maior do que ele.
 */
export function BackButton({ label, onPress, variant = 'plain', style, ...rest }: BackButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[
        styles.button,
        variant === 'surface' && {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
        },
        style,
      ]}
      {...rest}>
      <Ionicons name="chevron-back" size={IconSize.ui} color={theme.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BACK_BUTTON_SIZE,
    height: BACK_BUTTON_SIZE,
    borderRadius: BACK_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
