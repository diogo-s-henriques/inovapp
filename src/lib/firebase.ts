import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// O App Check está desligado nesta build — ver a nota junto ao `activateAppCheck`, no fim do ficheiro.
// import { activateAppCheck } from '@/lib/app-check';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const { getAuth, initializeAuth } = firebaseAuth;

type AuthDependencies = NonNullable<Parameters<typeof initializeAuth>[1]>;

/**
 * A factory de persistência em AsyncStorage existe só no build de React Native do Firebase: na
 * web o `getAuth()` já usa localStorage, e no build de Node - o que os testes da camada de dados
 * usam, ver tests/data/preload.mjs - não existe de todo. Procurá-la no módulo em tempo de
 * execução (em vez de um `import` com nome, que partiria aqueles dois casos) é o que permite
 * tratar cada plataforma pelo que ela realmente tem.
 */
const getReactNativePersistence = (firebaseAuth as unknown as Record<string, unknown>)
  .getReactNativePersistence as
  | ((storage: typeof AsyncStorage) => AuthDependencies['persistence'])
  | undefined;

/**
 * No React Native, `getAuth()` inicializa a Auth **sem persistência nenhuma**: o SDK avisa no
 * terminal ("You are initializing Firebase Auth for React Native without providing AsyncStorage.
 * Auth state will default to memory persistence and will not persist between sessions") e fica só
 * com persistência em memória. Consequência: fechar a app pedia as credenciais outra vez, e as
 * expirações de "Lembrar" (1 dia / 30 dias, ver src/auth/listener.ts) nunca chegavam a ser
 * avaliadas, porque o `lastLoginAt` desaparecia com o processo.
 */
function createAuth(): Auth {
  if (typeof getReactNativePersistence !== 'function') {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    // O Fast Refresh reavalia este módulo com a app (e a Auth) já inicializadas; nesse caso a
    // instância que existe é precisamente a que interessa - voltar a inicializar rebentava com
    // 'auth/already-initialized'. `getAuth` devolve a existente, sem avisar de nada.
    if ((error as { code?: string } | undefined)?.code === 'auth/already-initialized') {
      return getAuth(app);
    }
    throw error;
  }
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Antes da Auth e do Firestore, e de propósito: o App Check cola um token a cada pedido, e um
 * serviço criado primeiro podia mandar a sua primeira leitura sem ele. Numa build sem o módulo
 * nativo isto não faz nada (ver src/lib/app-check.ts).
 *
 * **Desligado nesta build, e a causa já é conhecida.** Isto começou por ser um teste (a app fechava
 * no arranque e o App Check era a única peça nova do lado nativo), mas o fecho acabou por revelar-se
 * outra coisa: o plugin do `@react-native-firebase/app-check` inseria um **segundo**
 * `FirebaseApp.configure()` no `AppDelegate`, e o FirebaseCore lança uma excepção Objective-C na
 * segunda (`App named __FIRAPP_DEFAULT has already been configured`). O plugin saiu do `app.json`
 * (ver o README, em "App Check") e a app voltou a abrir.
 *
 * Fica desligado **de propósito nesta submissão**: com o plugin fora, a linha
 * `RNFBAppCheckModule.sharedInstance()` que registava a fábrica do atestador no arranque também
 * desapareceu. O `app-check.ts` continua a registá-la (é o `provider.configure` dele, do lado do
 * JavaScript, que a chama), mas isso é um caminho que ainda **não foi validado** num telemóvel — e
 * uma submissão à App Store não é o sítio para o descobrir. Voltamos a ligar quando houver uma
 * build de ensaio para o confirmar.
 *
 * Nada se perde até lá: a fiscalização do App Check **ainda não está ligada no console**, por isso
 * os pedidos continuam a ser atendidos sem atestação (ver os passos no README).
 */
// activateAppCheck(app);

export const auth = createAuth();
export const db = getFirestore(app);
