import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Logótipo da INOVAPP nos ecrãs de entrada.
 *
 * O `require` vive ao nível do módulo - a Metro resolve-o uma vez, quando o bundle carrega, em vez
 * de a cada render. O ficheiro é a versão reduzida (331x72) do logótipo: o original tinha
 * 1898x413 px e obrigava a descodificar 3 MB de bitmap para desenhar 120x24 pt.
 */
const LOGO_SOURCE = require('../../../../assets/images/logo_dark.png');

/** Proporção do ficheiro (331x72). Fixar a altura é o que mantém a forma certa em qualquer ecrã. */
const LOGO_ASPECT_RATIO = 331 / 72;

export interface LogoProps {
  /** Altura em pontos; a largura resulta da proporção do ficheiro. */
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export function Logo({ height = 24, style }: LogoProps) {
  return (
    <Image
      source={LOGO_SOURCE}
      accessibilityRole="image"
      accessibilityLabel="INOVAPP"
      resizeMode="contain"
      // No Android o `Image` anima a entrada com um fade de 300 ms por omissão. Num logótipo
      // pequeno isso lê-se como "demora a carregar" - e é independente do tamanho do ficheiro,
      // que foi o que tornou esta demora difícil de identificar. Aqui a entrada é imediata: o
      // `fade` que interessa (entrar/sair da app) é o da transição de ecrã, não o do logótipo.
      fadeDuration={0}
      // A largura é derivada da altura (e não um valor solto) para a caixa coincidir com o
      // desenho: com um valor fixo, o `contain` encaixava-o de qualquer maneira mas a caixa
      // ficava maior do que o logótipo, o que desalinhava o cabeçalho em ecrãs estreitos.
      style={[styles.logo, { height, width: height * LOGO_ASPECT_RATIO }, style]}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // 'flexShrink: 0' porque a caixa do logótipo está numa linha com o seletor de idioma: sem
    // isto, o React Native encolhia-a primeiro e o logótipo aparecia deformado em ecrãs estreitos.
    flexShrink: 0,
  },
});
