/**
 * Testes do toque que fecha o teclado (`keyboardDismissProps`).
 *
 * O que aqui se fixa é o contrato que a raiz da app deixou de cumprir: quem fecha o teclado é o
 * próprio ecrã, e não um `Touchable` à volta da app toda a apanhar todos os toques (ver o comentário
 * em src/components/ui/KeyboardDismiss/index.tsx).
 *
 * O gesto em si é do RN - o ecrã reivindica o toque e, quando o solta, o teclado fecha -, e por isso
 * os handlers são chamados aqui à mão: o que se prova é o que a app entrega ao responder do sistema,
 * que é onde isto se decide. O que **não** se consegue testar aqui é a parte que motivou a mudança -
 * um `Touchable` a bloquear os gestos nativos do que tem por dentro: é comportamento de plataforma.
 * Essa parte está presa pelo teste seguinte, que fixa o que estes props são e o que não são.
 */
import { Keyboard } from 'react-native';

import { keyboardDismissProps } from '@/components/ui/KeyboardDismiss';

afterEach(() => {
  jest.restoreAllMocks();
});

it('fecha o teclado quando o toque não é de ninguém', () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});

  keyboardDismissProps.onResponderRelease();

  expect(dismiss).toHaveBeenCalledTimes(1);
});

it('reivindica o toque, que é o que faz o ecrã apanhá-lo', () => {
  expect(keyboardDismissProps.onStartShouldSetResponder()).toBe(true);
});

it('é um toque que não pede o bloqueio dos gestos nativos', () => {
  // Este é o teste que impede a regressão: um `Touchable` é uma reivindicação de toque que, ao ser
  // concedida, pede ao sistema para bloquear os gestos nativos de quem está por dentro
  // (`blockNativeResponder`) - no Android, o arrastar de um `ScrollView`. Estes props são só isto, e
  // é por isso que podem estar num ecrã sem lhe tirar o toque.
  expect(Object.keys(keyboardDismissProps).sort()).toEqual([
    'onResponderRelease',
    'onStartShouldSetResponder',
  ]);
});
