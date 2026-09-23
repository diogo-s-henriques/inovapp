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
const STRIP_HEIGHT = 56;
const STRIP_ASPECT_RATIO = 1093 / 131;

/**
 * Largura de uma cópia da faixa, a partir da altura pedida.
 *
 * Existe como função porque **o passo do ciclo tem de sair da mesma altura que desenha as cópias**.
 * Este componente aceita `height` desde o início, mas o ciclo andava sempre a largura do valor por
 * omissão. Enquanto ninguém passou outra altura, as duas coincidiam e não se notava; a partir do
 * momento em que a faixa é maior, o passo e as cópias deixavam de bater certo e via-se uma
 * **costura** a cada volta (a imagem salta para trás do que devia).
 */
function stripWidthFor(height: number): number {
  return height * STRIP_ASPECT_RATIO;
}

/** Duração de uma volta à velocidade definida, para uma dada largura. */
function loopDurationFor(width: number): number {
  return Math.round((width / STRIP_SPEED_PER_SECOND) * 1000);
}

/**
 * A velocidade da faixa, em pontos por segundo.
 *
 * É a velocidade que se escolhe, e não a **duração** da volta - que é o que aqui estava antes. Uma
 * duração é o tempo que a faixa leva a andar *uma largura*, e a largura depende da altura: aumentar
 * a faixa deixava-a maior **e** mais rápida sem ninguém ter pedido, o que fazia de qualquer ajuste
 * ao tamanho um ajuste escondido à velocidade. Com a velocidade como valor de entrada, cada uma
 * mexe só no que é dela.
 *
 * Aos 50 pt/s a volta completa dá-se em ~9,3 s (na altura de 56) - entre os ~35 pt/s da primeira
 * versão e os 72 pt/s que duraram uma volta.
 */
const STRIP_SPEED_PER_SECOND = 50;

// O PNG (e não o WebP que aqui esteve) tem o fundo **transparente**: o ficheiro anterior era um
// VP8 sem canal alfa, por isso trazia uma tarja branca colada que se via sobre o cinzento do ecrã.
// O fundo foi tirado com `scripts/png-transparent-background.js` (ver o README), não à mão: a
// mesma passagem serve para os próximos logótipos que cheguem com fundo branco.
const stripImage = require('../../../../assets/Parceiros/parceiros.png');

/**
 * Quantas cópias da faixa são precisas para a janela nunca mostrar um vazio.
 *
 * O ciclo anda exatamente uma largura de faixa; no ponto mais deslocado, a janela é coberta pelas
 * cópias que ficam à direita, ou seja `(cópias - 1) * largura >= largura da janela`.
 */
function copiesForWindow(windowWidth: number, stripWidth: number): number {
  return Math.max(2, Math.ceil(windowWidth / stripWidth) + 1);
}

/** A definição do sistema "reduzir movimento" - quem a tem ligada vê a faixa parada. */
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
 * estava - não há salto nem intervalo a branco.
 */
export function PartnersMarquee({ height = STRIP_HEIGHT }: PartnersMarqueeProps) {
  const reduceMotion = useReduceMotion();
  const stripWidth = stripWidthFor(height);
  const scroll = useSharedValue(-stripWidth);
  const [windowWidth, setWindowWidth] = useState(stripWidth);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scroll);
      return;
    }

    // O valor de partida volta a ser -largura antes de arrancar: se a altura mudar, a posição que
    // ficou a meio da volta anterior já não corresponde à grelha nova.
    scroll.value = -stripWidth;
    scroll.value = withRepeat(
      withTiming(0, { duration: loopDurationFor(stripWidth), easing: Easing.linear }),
      -1,
      false,
    );

    return () => cancelAnimation(scroll);
  }, [reduceMotion, scroll, stripWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scroll.value }],
  }));

  const stripStyle = { height, width: stripWidth };

  if (reduceMotion) {
    return <Image source={stripImage} style={[styles.strip, stripStyle, styles.staticStrip]} resizeMode="contain" />;
  }

  return (
    <View
      style={[styles.window, { height }]}
      onLayout={(event) => setWindowWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.row, animatedStyle]}>
        {Array.from({ length: copiesForWindow(windowWidth, stripWidth) }, (_, index) => (
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
