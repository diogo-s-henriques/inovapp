/**
 * Preload dos testes da camada de dados (`npm run test:data`).
 *
 * Corre antes de qualquer módulo da app ser carregado, e faz duas coisas que têm de acontecer
 * nessa ordem:
 *
 * 1. Preenche as variáveis `EXPO_PUBLIC_FIREBASE_*` com valores de emulador. O
 *    `src/lib/firebase.ts` lê-as no momento em que é importado e chama `initializeApp`; sem elas
 *    a inicialização rebentava. Nenhum destes valores sai da máquina - a ligação é desviada para
 *    o emulador logo a seguir (ver tests/data/emulator.mts), e o emulador aceita qualquer chave.
 * 2. Desliga os doubles do Firebase e regista o resolvedor do alias `@/` (ver tests/node-loader.mjs).
 */
process.env.INOVAPP_TEST_REAL_FIREBASE = '1';

process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'emulator-sem-chave-real';
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'inovapp-68021.firebaseapp.com';
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'inovapp-68021';
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'inovapp-68021.appspot.com';
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '000000000000';
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:000000000000:web:emulator';

import { register } from 'node:module';

register('../node-loader.mjs', import.meta.url);
