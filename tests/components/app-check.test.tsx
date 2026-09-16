/**
 * Testes da ativação do App Check - a ponte entre o atestador nativo e o SDK JavaScript.
 *
 * O que se fixa aqui são as decisões que se podem perder sem se dar por isso, e todas elas foram
 * surpresas ao ler os pacotes:
 *
 * 1. **São dois SDKs, e é preciso falar com os dois.** O atestador do RNFB não serve o SDK
 *    JavaScript - o `getToken()` dele existe só para calar a interface e lança - pelo que quem
 *    produz a atestação é o módulo nativo (metade RNFB) e quem a cola aos pedidos é o SDK
 *    JavaScript, através de um `CustomProvider` (metade JavaScript). Faltando qualquer das metades,
 *    o token existia e não era usado, sem erro nenhum.
 * 2. **Em desenvolvimento o atestador é o de depuração.** A Play Integrity só emite tokens para
 *    apps instaladas pela Play e o App Attest exige uma build assinada a sério: com os atestadores
 *    nativos em `npx expo start`, a app ficava sem tokens e ninguém percebia porquê.
 * 3. **Nenhuma falha daqui pode deitar a app abaixo.** Nem um atestador que rebenta, nem a app já
 *    inicializada pelo Fast Refresh (que é erro de desenvolvimento, não de produção).
 */
jest.mock('firebase/app-check', () => ({
  initializeAppCheck: jest.fn(() => ({ name: 'app-check' })),
  // O mesmo contrato do verdadeiro: guarda as opções e responde com o token de quem as deu.
  CustomProvider: class {
    private options: { getToken: () => Promise<unknown> };
    constructor(options: { getToken: () => Promise<unknown> }) {
      this.options = options;
    }
    getToken() {
      return this.options.getToken();
    }
  },
}));

jest.mock('@react-native-firebase/app-check', () => {
  const atestadores: { configure: jest.Mock }[] = [];
  class ReactNativeFirebaseAppCheckProvider {
    configure = jest.fn();
    constructor() {
      atestadores.push(this);
    }
  }
  return {
    ReactNativeFirebaseAppCheckProvider,
    initializeAppCheck: jest.fn(() => ({ native: true })),
    getToken: jest.fn(async () => ({ token: 'token-nativo' })),
    __atestadores: atestadores,
  };
});

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: '[DEFAULT]' })) }));

jest.mock('expo-observe', () => ({ Observe: { reportError: jest.fn() } }));

import { initializeAppCheck } from 'firebase/app-check';
import { getApp } from '@react-native-firebase/app';
import { Observe } from 'expo-observe';
import type { FirebaseApp } from 'firebase/app';

import { activateAppCheck } from '@/lib/app-check';

type NativeMock = {
  ReactNativeFirebaseAppCheckProvider: jest.Mock;
  initializeAppCheck: jest.Mock;
  getToken: jest.Mock;
  __atestadores: { configure: jest.Mock }[];
};

const app = { name: 'inovapp' } as unknown as FirebaseApp;
const nativo = () => jest.requireMock('@react-native-firebase/app-check') as NativeMock;
const doSDKJavaScript = () => initializeAppCheck as unknown as jest.Mock;
const doRNFB = () => getApp as unknown as jest.Mock;

/** O que o SDK JavaScript recebeu: as opções do seu `initializeAppCheck`. */
const opcoesJavaScript = (): {
  provider: { getToken: () => Promise<{ token: string; expireTimeMillis: number }> };
  isTokenAutoRefreshEnabled: boolean;
} => doSDKJavaScript().mock.calls.at(-1)?.[1];

const atestadorNativo = () => nativo().__atestadores.at(-1)!;
const ultimaConfiguracao = (): { android: { provider: string }; apple: { provider: string } } =>
  atestadorNativo().configure.mock.calls.at(-1)?.[0];
const errosReportados = () => (Observe.reportError as jest.Mock).mock.calls;
const devOriginal = (globalThis as { __DEV__?: boolean }).__DEV__;

beforeEach(() => {
  doSDKJavaScript().mockClear();
  nativo().initializeAppCheck.mockClear();
  nativo().getToken.mockClear();
  nativo().__atestadores.length = 0;
  (Observe.reportError as jest.Mock).mockClear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = devOriginal;
  jest.restoreAllMocks();
});

describe('activateAppCheck', () => {
  it('configura a atestação nativa no app do RNFB', () => {
    activateAppCheck(app);

    const [appNativo, opcoes] = nativo().initializeAppCheck.mock.calls.at(-1);

    // O app do RNFB, e não o do SDK JavaScript: são registos de apps diferentes, e passar o errado
    // aqui deixava o atestador por configurar do lado nativo.
    expect(appNativo).toBe(doRNFB().mock.results.at(-1)?.value);
    expect(opcoes.provider).toBe(atestadorNativo());
    expect(opcoes.isTokenAutoRefreshEnabled).toBe(true);
  });

  it('entrega ao SDK JavaScript o token que vem do módulo nativo', async () => {
    activateAppCheck(app);

    const token = await opcoesJavaScript().provider.getToken();

    expect(token.token).toBe('token-nativo');
    // `false`: quem renova o token é o lado nativo, e pedir força uma atestação nova a cada leitura.
    const [instanciaNativa, forcarRenovacao] = nativo().getToken.mock.calls.at(-1);
    expect(instanciaNativa).toBe(nativo().initializeAppCheck.mock.results.at(-1)?.value);
    expect(forcarRenovacao).toBe(false);
  });

  it('dá ao SDK JavaScript uma validade curta, para nunca servir um token caducado', async () => {
    activateAppCheck(app);
    const antes = Date.now();

    const { expireTimeMillis } = await opcoesJavaScript().provider.getToken();

    // O resultado do RNFB não traz a validade. Assumir de menos custa uma ida à cache nativa;
    // assumir de mais dava um `permission-denied` sem explicação.
    expect(expireTimeMillis).toBeGreaterThan(antes);
    expect(expireTimeMillis).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
  });

  it('liga a renovação automática dos dois lados', () => {
    activateAppCheck(app);

    expect(nativo().initializeAppCheck.mock.calls.at(-1)?.[1].isTokenAutoRefreshEnabled).toBe(true);
    expect(opcoesJavaScript().isTokenAutoRefreshEnabled).toBe(true);
  });

  it('em desenvolvimento usa o atestador de depuração nas duas plataformas', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    activateAppCheck(app);

    expect(ultimaConfiguracao().android.provider).toBe('debug');
    expect(ultimaConfiguracao().apple.provider).toBe('debug');
  });

  it('fora do desenvolvimento usa os atestadores nativos, por plataforma', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    activateAppCheck(app);

    // Play Integrity no Android; no iOS o App Attest, com o DeviceCheck por baixo para os
    // dispositivos que não o suportam.
    expect(ultimaConfiguracao().android.provider).toBe('playIntegrity');
    expect(ultimaConfiguracao().apple.provider).toBe('appAttestWithDeviceCheckFallback');
  });

  it('sem token de depuração no bundle, nem por acidente', () => {
    // O `debugToken` só pode vir de quem o escreva à mão; um `EXPO_PUBLIC_*` fica escrito dentro do
    // bundle de todas as builds, incluindo as de produção, e era uma porta aberta.
    activateAppCheck(app);

    expect(ultimaConfiguracao().android).not.toHaveProperty('debugToken');
    expect(ultimaConfiguracao().apple).not.toHaveProperty('debugToken');
  });

  it('a app já inicializada (Fast Refresh) não é um erro a reportar', () => {
    doSDKJavaScript().mockImplementationOnce(() => {
      throw Object.assign(new Error('já inicializado'), { code: 'appCheck/already-initialized' });
    });

    expect(activateAppCheck(app)).toBeNull();
    expect(errosReportados()).toHaveLength(0);
  });

  it('um atestador que rebenta deixa a app correr, com o erro reportado', () => {
    nativo().initializeAppCheck.mockImplementationOnce(() => {
      throw new Error('atestador indisponível');
    });

    expect(activateAppCheck(app)).toBeNull();
    expect(doSDKJavaScript()).not.toHaveBeenCalled();
    expect(errosReportados()).toHaveLength(1);
    // O contexto vai à frente da mensagem: é por ela que o painel agrupa os erros.
    expect((errosReportados().at(-1)?.[0] as Error).message).toBe('[app-check] atestador indisponível');
  });
});
