import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconBoxSize, IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface HeroActionButtonProps {
  icon: IoniconsName;
  /** Descrição para leitores de ecrã - o ícone sozinho não diz nada. */
  accessibilityLabel: string;
  onPress?: () => void;
  /**
   * Ponto de aviso no canto. Sem `badgeColor`, é da cor do cabeçalho (`heroBottom`): foi uma
   * escolha de quem desenha o ecrã, e vale a pena saber o que custa - um ponto claro sobre o
   * quadrado cinzento quase não se vê, ao contrário do vermelho que lá estava.
   */
  badge?: boolean;
  badgeColor?: string;
}

/**
 * O botão do canto do cabeçalho - o sino na Home, a roda dentada no Perfil.
 *
 * É um quadrado do mesmo lado, do mesmo raio e da mesma cor dos restantes ícones da página
 * (`IconBoxSize`, `primarySoft`), e não um botão só dele: o sino chegou a ser um círculo branco de
 * raio 13 enquanto os atalhos eram quadrados cinzentos de raio 12, tudo no mesmo ecrã. O quadrado
 * cinzento que esteve aqui entretanto foi o que o fez bater certo com os outros; quando os outros
 * passaram a ameixa suave, este veio atrás - senão voltava a haver dois quadrados de cores
 * diferentes na mesma página.
 *
 * O quadrado e o ponto, sobre o cabeçalho, são ambos de baixo contraste - e é aí que esta troca tem
 * de ser lida com medidas, porque a intuição engana:
 *
 * ```
 *                                    quadrado   ponto
 *   ameixa suave sobre o cabeçalho    1,19:1    1,19:1   ← agora
 *   cinzento sobre o cabeçalho        1,05:1    1,05:1   ← antes
 * ```
 *
 * Os dois são quase invisíveis sobre um tom tão claro (o ícone, esse, está a 5,9:1) - mas o tom de
 * ameixa **separa-se mais** do cabeçalho do que o cinzento fazia, ou seja: o quadrado que se vê por
 * forma ganhou alguma cor de graça. Se o ponto das notificações tiver de voltar a chamar atenção,
 * é `badgeColor`, e não o quadrado.
 */
export function HeroActionButton({ icon, accessibilityLabel, onPress, badge, badgeColor }: HeroActionButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.primarySoft },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={IconSize.ui} color={theme.primary} />
      {badge && <View style={[styles.badge, { backgroundColor: badgeColor ?? theme.heroBottom }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: IconBoxSize,
    height: IconBoxSize,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
