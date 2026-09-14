import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';

// A faixa original tem 1093x131 px. A altura manda: a largura sai das proporções, e é essa largura
// que define o passo do ciclo (uma faixa por volta).
const STRIP_HEIGHT = 42;
const STRIP_ASPECT_RATIO = 1093 / 131;
const STRIP_WIDTH = STRIP_HEIGHT * STRIP_ASPECT_RATIO;
/** Uma volta completa (uma largura de faixa) em 10 s — cerca de 35 px por segundo. */
const LOOP_DURATION_MS = 10_000;

const stripImage = require('../../../../assets/Parceiros/prr-foter-ies-765733f5 (1).webp');

/**
 * Quantas cópias da faixa são precisas para a janela nunca mostrar um vazio.
 *
 * O ciclo anda exatamente uma largura de faixa; no ponto mais deslocado, a janela é coberta pelas
 * cópias que ficam à direita, ou seja `(cópias - 1) * largura >= largura da janela`.
 */
function copiesForWindow(windowWidth: number): number {
  return Math.max(2, Math.ceil(windowWidth / STRIP_WIDTH) + 1);
}

/** A definição do sistema "reduzir movimento" — quem a tem ligada vê a faixa parada. */
function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let actual = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (actual) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      actual = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

export interface PartnersMarqueeProps {
  /** Altura da faixa em píxeis (a largura sai das proporções da imagem). */
  height?: number;
}

/**
 * Faixa de parceiros que corre em ciclo para a direita, no fundo dos ecrãs de entrada.
 *
 * O movimento sem costura não tem truque: são cópias da mesma imagem lado a lado e o ciclo anda
 * exatamente uma largura de faixa, por isso quando ele recomeça o que está à vista é o mesmo que
 * estava — não há salto nem intervalo a branco.
 */
export function PartnersMarquee({ height = STRIP_HEIGHT }: PartnersMarqueeProps) {
  const reduceMotion = useReduceMotion();
  const scroll = useSharedValue(-STRIP_WIDTH);
  const [windowWidth, setWindowWidth] = useState(STRIP_WIDTH);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scroll);
      return;
    }

    scroll.value = withRepeat(withTiming(0, { duration: LOOP_DURATION_MS, easing: Easing.linear }), -1, false);

    return () => cancelAnimation(scroll);
  }, [reduceMotion, scroll]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scroll.value }],
  }));

  const stripStyle = { height, width: height * STRIP_ASPECT_RATIO };

  if (reduceMotion) {
    return <Image source={stripImage} style={[styles.strip, stripStyle, styles.staticStrip]} resizeMode="contain" />;
  }

  return (
    <View
      style={[styles.window, { height }]}
      onLayout={(event) => setWindowWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {Array.from({ length: copiesForWindow(windowWidth) }, (_, index) => (
          <Image key={index} source={stripImage} style={[styles.strip, stripStyle]} resizeMode="contain" />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    alignSelf: 'stretch',
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  row: {
    flexDirection: 'row',
  },
  strip: {
    // O ciclo depende de cada cópia manter a largura: sem isto, o `flexShrink` deixava-as encolher
    // para caber na janela e o ciclo passava a andar a mais.
    flexShrink: 0,
  },
  staticStrip: {
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
});
