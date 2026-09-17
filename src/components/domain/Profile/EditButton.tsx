import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * O lápis do botão, no tamanho da letra que ele acompanha - e não nos 22 dos ícones de interface
 * (`IconSize.ui`).
 *
 * É a segunda vez que um ícone da app não segue o tamanho único, e pela mesma razão da primeira (o
 * visto da caixa de seleção): este não é um símbolo de interface ao lado de outros, é parte de uma
 * **linha de texto**. A 22, o lápis ficava mais alto do que a palavra "Editar" e do que o papel que
 * ele acompanha - o botão parecia de outra linha. A 15, ao lado de uma letra de 13, lê-se como o
 * que é.
 */
const LINK_ICON_SIZE = 15;

export interface EditButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  /**
   * Descrição para leitores de ecrã: o botão diz "Editar", mas o que edita é o perfil - sem isto,
   * quem não vê a página ouve um botão chamado "Editar" sem saber o que vai editar.
   */
  accessibilityLabel: string;
}

/**
 * O botão de editar do perfil, que vive **na linha do papel** do bloco da identidade
 * (`subtitleAction` do `ScreenHero`), à direita do que lá estiver ("Tutor", o curso).
 *
 * Chegou a ser maior ("Editar Perfil") e a estar ao lado do nome: tirou-lhe a linha inteira de que
 * o nome precisa. Depois viveu **por baixo** do nome, e esse foi o tempo em que a Home e o Perfil
 * tiveram cabeçalhos de alturas diferentes: uma quarta linha no bloco empurrava a fotografia e o
 * ícone do canto para baixo, e os dois ecrãs deixavam de estar alinhados. Na linha do papel o botão
 * não acrescenta altura nenhuma - a linha já lá estava -, e fica a um dedo do nome e da fotografia,
 * que é onde se procura.
 *
 * **É um link, e do tamanho do texto ao lado** (a mesma letra do papel - `HERO_SUBTITLE_FONT_SIZE`
 * em `ScreenHero`): sem caixa, sem contorno e sem fundo, na cor do acento. Não é só uma questão de
 * gosto - é a segunda metade do alinhamento dos dois cabeçalhos. Uma pastilha de contorno (a que
 * aqui esteve, branca e com 32 px de altura) é mais alta do que a linha em que se senta, e era ela
 * a decidir a altura dessa linha no Perfil: o bloco crescia lá e não na Home, e voltava a
 * desalinhar a fotografia e o sino. Assim, o botão cabe dentro da linha do texto e é o texto que
 * manda na altura - nos dois ecrãs.
 *
 * O `hitSlop` de 8 aumenta a área de toque sem alargar a caixa: ao lado de uma palavra de 13 px, o
 * alvo é pequeno, e é o toque que não pode ser.
 */
export function EditButton({ label, accessibilityLabel, ...rest }: EditButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      {...rest}>
      <Ionicons name="pencil-outline" size={LINK_ICON_SIZE} color={theme.primary} />
      <ThemedText type="smallBold" themeColor="primary">
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
  },
  pressed: {
    opacity: 0.6,
  },
});
