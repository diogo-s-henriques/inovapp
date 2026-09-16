import { Keyboard } from 'react-native';

/**
 * O que põe um ecrã a fechar o teclado quando se toca fora de um campo.
 *
 * **Porque é que isto não é um `TouchableWithoutFeedback`.** Era, e estava à volta da app inteira
 * (em src/app/_layout.tsx). Um `Touchable` não se limita a ouvir o toque: fica com ele. Reivindica
 * **todos** os toques que lhe chegam (`Pressability.onStartShouldSetResponder` devolve verdadeiro)
 * e, ao recebê-los, pede ao sistema para bloquear os gestos nativos do que está por dentro
 * (`blockNativeResponder`, o valor que o `onResponderGrant` devolve). No Android isso é um
 * `requestDisallowInterceptTouchEvent`, que é precisamente o que impede um `ScrollView` de apanhar
 * o arrastar: o mesmo toque que fechava o teclado era o toque que não fazia scroll.
 *
 * Estes `props` fazem o mesmo sem tirar o toque a ninguém: põem o ecrã a reivindicar o toque (um
 * `View` que responde `true` a `onStartShouldSetResponder`) mas **não** pedem o bloqueio dos gestos
 * nativos - quem o pedia era o `Touchable`, que aqui não existe. Um toque num botão continua a ser
 * do botão (a negociação do responder pergunta primeiro ao alvo), e um toque que ninguém quis chega
 * ao ecrã e fecha o teclado.
 *
 * Usa-se nos ecrãs **sem lista** - entrar, criar conta, esqueceu-se da palavra-passe -, onde não há
 * nada para arrastar e por isso o toque não tira nada a ninguém. Nos ecrãs que rolam, o mesmo
 * comportamento é do próprio `ScrollView`, com `keyboardShouldPersistTaps="handled"`: um toque que
 * um botão não trata fecha o teclado, e um arrastar continua a ser um arrastar.
 */
export const keyboardDismissProps = {
  onStartShouldSetResponder: () => true,
  // `Keyboard.dismiss()` e não a referência `Keyboard.dismiss`: quem chama isto é o responder do
  // sistema, e o teclado deve ser lido no momento do toque (não no momento em que este módulo é
  // carregado). É também o que deixa um teste espiar a chamada.
  onResponderRelease: () => Keyboard.dismiss(),
} as const;
