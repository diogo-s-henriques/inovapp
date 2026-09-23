import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * Crédito da INOVEDU ("powered by INOVEDU") no fundo dos ecrãs de entrada.
 *
 * O logótipo é o **PNG com fundo transparente**, e não o WebP que chegou de origem: o WebP era um
 * VP8 sem canal alfa, por isso trazia um retângulo branco colado ao desenho - e sobre o
 * cinzento-claro destes ecrãs vê-se logo, que foi o que já aconteceu à faixa dos parceiros. O fundo
 * foi tirado com `scripts/png-transparent-background.js`, a mesma passagem usada lá, e não à mão.
 * (O WebP original fica onde está: é a fonte de onde se volta a gerar este, se um dia mudar.)
 */
const LOGO_SOURCE = require('../../../../assets/Parceiros/inovedu-2c475acd.png');

/** Proporção do ficheiro (200x59). Fixar a altura é o que mantém a forma certa em qualquer ecrã. */
const LOGO_ASPECT_RATIO = 200 / 59;

/**
 * O texto do crédito faz parte do lockup da marca, e é por isso que **não passa pelo i18n**: anda
 * colado ao logótipo, não com o idioma da app - como o `accessibilityLabel="INOVAPP"` do `Logo`.
 */
const CREDIT = 'powered by';

export interface PoweredByProps {
  /** Altura do logótipo em pontos; a largura resulta da proporção do ficheiro. */
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function PoweredBy({ height = 16, style }: PoweredByProps) {
  return (
    <View style={[styles.row, style]}>
      <ThemedText type="small" themeColor="textMuted">
        {CREDIT}
      </ThemedText>
      <Image
        source={LOGO_SOURCE}
        accessibilityRole="image"
        accessibilityLabel="INOVEDU"
        resizeMode="contain"
        // Como no `Logo`: no Android a entrada animada com fade lê-se como \"demora a carregar\", e
        // isso não tem nada a ver com o tamanho do ficheiro.
        fadeDuration={0}
        style={[styles.logo, { height, width: height * LOGO_ASPECT_RATIO }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    // A margem lateral é daqui, e não de quem chama: este bloco é filho do ecrã (que não tem
    // `padding`, para a faixa dos parceiros poder ir de ponta a ponta).
    paddingHorizontal: Spacing.five,
  },
  logo: {
    // O logótipo está numa linha: sem isto, o React Native encolhia-o primeiro em ecrãs estreitos.
    flexShrink: 0,
  },
});
