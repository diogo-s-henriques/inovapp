/**
 * Double de `src/lib/firebase.ts`.
 *
 * O módulo real lê as variáveis `EXPO_PUBLIC_FIREBASE_*` e chama `initializeApp`, o que num
 * processo de Node rebenta (não há env nem app para inicializar). Nenhuma função testada aqui
 * usa estas ligações — o `db` existe só para satisfazer o import de `src/lib/matching.ts`, e é
 * o double do `firebase/firestore` que responde às leituras.
 */
export const auth = null;
export const db = { __testDouble: 'lib-firebase' };
