import { CustomProvider, initializeAppCheck, type AppCheck } from 'firebase/app-check';
import type { FirebaseApp } from 'firebase/app';
import type * as NativeAppCheck from '@react-native-firebase/app-check';
import type * as NativeApp from '@react-native-firebase/app';

import { isDev } from '@/lib/dev';
import { reportError } from '@/lib/error-reporting';

/**
 * O App Check é o que liga cada pedido à app que o fez.
 *
 * As regras do Firestore dizem **quem** pode ler e escrever; não dizem que o pedido vem da app. A
 * chave de API do Firebase é pública (ver o README), por isso quem a copiar pode falar com o
 * projeto: criar contas, gastar a quota, tentar ler o que as regras deixariam a um utilizador
 * autenticado. O App Check fecha isso com uma atestação do dispositivo - **Play Integrity** no
 * Android, **App Attest** (com DeviceCheck por baixo) no iOS - agarrada a cada pedido. Quem não a
 * apresentar não é atendido, mas só **quando a fiscalização estiver ligada no console** (ver os
 * passos no README).
 *
 * ## Porque é que isto tem duas metades
 *
 * A atestação nativa não existe no SDK JavaScript do Firebase: quem a sabe produzir é o SDK nativo,
 * e quem o expõe ao JavaScript é o `@react-native-firebase/app-check`. Só que esta app fala com o
 * Firestore e a Auth pelo **SDK JavaScript** (ver `src/lib/firebase.ts`) - são dois SDKs diferentes,
 * com registos de apps diferentes, e um não sabe do outro:
 *
 * 1. o **RNFB** configura o atestador (Play Integrity / App Attest) no SDK nativo e é dele que sai o
 *    token de App Check;
 * 2. esse token é entregue ao SDK JavaScript por um **`CustomProvider`**, no **nosso `app`** - é o
 *    SDK JavaScript que o cola às leituras, e sem esta metade o token existia e não era usado.
 *
 * (O atestador do próprio RNFB não pode ser entregue ao SDK JavaScript: o `getToken()` dele lança -
 * quem responde é o módulo nativo, através do `getToken()` do RNFB.)
 *
 * ## Porque é que o módulo é carregado à mão
 *
 * Porque é **nativo**, e um módulo nativo que não esteja dentro do binário deita a app abaixo no
 * arranque - foi o que aconteceu com o `expo-observe` (ver `src/lib/observe.ts`). Aqui a falha é
 * apanhada: sem o módulo não há atestação e todo o resto funciona. Um serviço de segurança que não
 * está disponível não pode custar a app que devia proteger.
 *
 * ## O que ainda falta para isto valer alguma coisa
 *
 * - a app tem de estar registada no App Check do console, por plataforma, com o atestador escolhido
 *   (a Play Integrity só emite tokens para apps distribuídas pela Play; o App Attest precisa do
 *   direito de assinatura no perfil);
 * - e só depois disso é que se **liga a fiscalização** (Firestore, Auth) no console. Com ela ligada
 *   antes de os dois telemóveis estarem a mandar atestação, a app fica sem conseguir ler nem
 *   escrever, e o sintoma é um `permission-denied` igual ao de uma regra mal escrita.
 *
 * Passo a passo no README, em "App Check".
 */

/** O módulo nativo, tal como ele se apresenta ao JavaScript. */
type NativeModule = typeof NativeAppCheck;
type AppModule = typeof NativeApp;

/**
 * Quanto tempo o SDK JavaScript acredita que o token vale.
 *
 * O resultado do RNFB traz o token mas **não** a validade (`expireTimeMillis`), e é a validade que
 * diz ao SDK JavaScript quando pedir outro. Em vez de a adivinhar por cima (o que arriscava servir
 * um token já caducado), assume-se um valor **curto**: pedir de mais só custa uma ida à cache do
 * lado nativo, que é quem renova o token a sério - pedir de menos é que dava um `permission-denied`
 * difícil de explicar.
 */
const ASSUMED_TOKEN_LIFETIME_MS = 5 * 60 * 1000;

/**
 * O módulo nativo, ou `null` quando esta build não o traz.
 *
 * `require` e não `import` pela mesma razão do `observe.ts`: é a única forma de apanhar a falha no
 * momento em que o módulo é avaliado.
 */
function load<T>(name: string): T | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- é o que permite apanhar a falha
    return require(name) as T;
  } catch (error) {
    if (isDev()) {
      console.warn(`[app-check] ${name} não está nesta build: os pedidos seguem sem atestação`, error);
    }
    return null;
  }
}

/**
 * Ativa o App Check para o `app` do SDK JavaScript, se a build tiver o módulo nativo.
 *
 * Devolve a instância (ou `null`), mais para o arranque poder dizê-lo do que para ser usada: quem
 * cola o token aos pedidos é o próprio SDK.
 *
 * **Sem token de depuração vindo do ambiente, de propósito.** O `debugToken` pode vir do
 * `firebase.json`/`EXPO_PUBLIC_*`, e um `EXPO_PUBLIC_*` é escrito **dentro do bundle** de todas as
 * builds, inclusive das de produção - um token de depuração lá dentro é uma porta aberta ao App
 * Check que se está a montar. Em desenvolvimento o atestador de depuração gera o seu próprio
 * segredo e escreve-o no log do dispositivo (Android: `adb logcat | grep DebugAppCheckProvider`);
 * é esse que se regista no console, e não um que ande no repositório.
 */
export function activateAppCheck(app: FirebaseApp): AppCheck | null {
  const native = load<NativeModule>('@react-native-firebase/app-check');
  const nativeApp = load<AppModule>('@react-native-firebase/app');
  if (!native || !nativeApp) return null;

  try {
    const provider = new native.ReactNativeFirebaseAppCheckProvider();

    provider.configure({
      android: { provider: isDev() ? 'debug' : 'playIntegrity' },
      apple: { provider: isDev() ? 'debug' : 'appAttestWithDeviceCheckFallback' },
    });

    // Metade 1: a atestação nativa. A instância é guardada porque é por ela que se pede o token.
    const nativeCheck = native.initializeAppCheck(nativeApp.getApp(), {
      provider,
      isTokenAutoRefreshEnabled: true,
    });

    // Metade 2: o token nativo entregue ao SDK JavaScript, que é quem fala com o Firestore e a Auth.
    return initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          const { token } = await native.getToken(nativeCheck, false);
          return { token, expireTimeMillis: Date.now() + ASSUMED_TOKEN_LIFETIME_MS };
        },
      }),
      // O token tem de existir antes do primeiro pedido: sem isto, o primeiro ecrã a ler o Firestore
      // ia buscar o token e podia perdê-lo para a leitura que já estava a sair.
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    // O Fast Refresh reavalia o `firebase.ts` com a app (e o App Check) já inicializados; nesse caso
    // a instância que existe é a que interessa. Sem esta exceção, o erro era reportado como um
    // problema a cada gravação de ficheiro em desenvolvimento.
    if ((error as { code?: string } | undefined)?.code === 'appCheck/already-initialized') {
      return null;
    }

    reportError(error, 'app-check');
    return null;
  }
}
