import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import {
  fetchRegisteredToken,
  forgetDevice,
  getInstallationId,
  getPushOptOut,
  registerDevice,
  registrationAction,
  setPushOptOut,
  type PushPermission,
  type PushPlatform,
} from '@/lib/push';
import { usePushStore } from '@/push/store';

/**
 * O lado que fala com o sistema: permissões, token da Expo e canal de notificações. A **decisão**
 * de registar ou apagar vive no `src/lib/push.ts`, que é o que permite testá-la sem telemóvel.
 *
 * **Porque é que aqui não se fala com o servidor de envio:** enviar um aviso a outra pessoa exige
 * um sítio que corra sem app aberta (Cloud Functions) — e o token de quem recebe não pode ser
 * legível por quem envia, senão qualquer conta podia mandar avisos a qualquer pessoa. Fica por
 * fazer; o que existe aqui é a metade que faz a app *receber*: registar o dispositivo e tratar do
 * toque no aviso.
 */

/** Canal Android — sem um canal criado, o sistema (13+) não mostra o pedido de permissão. */
const ANDROID_CHANNEL_ID = 'default';

/**
 * Com a app aberta, o sistema não mostra nada por omissão: o aviso chegava e não se via. Este
 * handler põe o aviso a aparecer por cima da app, que é o que faz sentido para um pedido de
 * conexão a chegar — a app já o vai mostrar na lista, mas quem está a olhar para outro ecrã tem de
 * dar por isso. `shouldSetBadge: false` porque a contagem já existe na bolinha dos separadores, e
 * duas contagens diferentes do mesmo número era pior do que nenhuma.
 *
 * Está no topo do módulo, e não dentro de um componente: tem de valer antes de chegar o primeiro
 * aviso, e a app pode arrancar a partir de um.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** O estado do sistema traduzido para o nosso. O `expo-notifications` tem um `'provisional'` a mais. */
function toPermission(status: Notifications.PermissionStatus): PushPermission {
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * O `Platform.OS` pode ser `'web'` e mais; a app é de telemóvel, e a plataforma aqui só serve para
 * o documento do registo dizer onde está o dispositivo.
 */
function currentPlatform(): PushPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

/** O canal tem de existir **antes** de se pedir o token (ver a documentação de permissões). */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Pedidos',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * O `projectId` do EAS (onde a Expo vai buscar as credenciais do projeto para emitir o token). Vem
 * do `app.json` — `extra.eas.projectId`, escrito pelo `eas init` — e não de uma constante escrita à
 * mão: um projeto que mude de conta ou de slug não devia obrigar a mexer em código.
 */
function easProjectId(): string | undefined {
  return Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
}

async function getExpoPushToken(): Promise<string | null> {
  const projectId = easProjectId();
  if (!projectId) return null;

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/**
 * Lê o estado atual (permissão do sistema + escolha guardada) para o ecrã das Definições.
 *
 * **Não lança de propósito.** Numa build anterior a este módulo existir (o `expo-notifications` é
 * nativo, por isso o que está instalado no telemóvel manda) esta chamada rebenta — e um erro numa
 * leitura de estado não pode deitar abaixo o Definições. Sem resposta, o estado fica em `null` e a
 * secção dos avisos simplesmente não aparece (ver src/app/settings.tsx).
 */
export async function refreshPushState(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    usePushStore.getState().setPushState({
      permission: toPermission(status),
      optedOut: await getPushOptOut(),
    });
  } catch (error) {
    if (__DEV__) console.warn('[push] estado indisponível neste dispositivo', error);
  }
}

/**
 * Alinha o registo deste dispositivo com o que o sistema e a pessoa dizem.
 *
 * `ask` existe para o pedido de permissão acontecer **uma vez, depois de a conta estar pronta** —
 * e não no arranque da app, onde um pedido de avisos aparece antes de a pessoa perceber para que
 * serve a app. Depois de haver uma decisão, o sistema responde sem mostrar nada, por isso voltar a
 * chamar com `ask` não incomoda ninguém.
 *
 * **Não lança.** Sem avisos a app funciona; falhar aqui não pode rebentar o arranque. O caso real
 * que isto cobre é o desenvolvimento: enquanto as credenciais FCM do projeto não estiverem
 * configuradas, o `getExpoPushTokenAsync` falha em Android e não há token nenhum para registar.
 */
export async function syncPushRegistration(uid: string, { ask = false } = {}): Promise<void> {
  const { setPushState } = usePushStore.getState();

  try {
    await ensureAndroidChannel();

    let permission = toPermission((await Notifications.getPermissionsAsync()).status);
    if (ask && permission === 'undetermined') {
      permission = toPermission((await Notifications.requestPermissionsAsync()).status);
    }

    const optedOut = await getPushOptOut();
    const installationId = await getInstallationId();

    // Mesmo sem permissão vale a pena ler: é este valor que diz se há um registo antigo a apagar.
    // Uma leitura falhada (regras por publicar, por exemplo) dá `null` e não impede o resto.
    const storedToken = await fetchRegisteredToken(uid, installationId).catch(() => null);

    let token: string | null = null;
    if (permission === 'granted' && !optedOut) {
      try {
        token = await getExpoPushToken();
      } catch (error) {
        // Sem token não há registo — e o resto da sincronização continua na mesma, para não deixar
        // um registo antigo por apagar só porque esta parte falhou. O erro real disto, hoje: em
        // Android sem as credenciais FCM configuradas, o `getExpoPushTokenAsync` não devolve nada.
        if (__DEV__) console.warn('[push] este dispositivo não recebeu token da Expo', error);
      }
    }

    const action = registrationAction({ permission, token, storedToken, optedOut });

    if (action === 'register') {
      await registerDevice(uid, installationId, token as string, currentPlatform());
    } else if (action === 'forget') {
      await forgetDevice(uid, installationId);
    }

    // `idle` tanto quer dizer "já lá está o token certo" como "não há nada para fazer": quem
    // distingue os dois é o `storedToken`. Sem isto, a permissão dada era mostrada como registo
    // feito — e quem não recebesse avisos não tinha como saber porquê.
    setPushState({
      permission,
      optedOut,
      registered: action === 'register' ? true : action === 'forget' ? false : storedToken !== null,
    });
  } catch (error) {
    // Registado só em desenvolvimento: uma credencial em falta não é um erro da app, e mandá-lo
    // para a monitorização enchia o painel com a mesma linha em cada arranque.
    if (__DEV__) console.warn('[push] não foi possível sincronizar o registo', error);

    setPushState({ permission: await Notifications.getPermissionsAsync().then(
      ({ status }) => toPermission(status),
      () => null,
    ) });
  }
}

/**
 * Ligar/desligar os avisos nas Definições.
 *
 * Desligar **esquece** o registo em vez de o deixar lá parado (ver `registrationAction`), e ao
 * voltar a ligar pede-se a permissão outra vez, se ela ainda não estiver decidida.
 */
export async function setPushEnabled(uid: string, enabled: boolean): Promise<void> {
  await setPushOptOut(!enabled);
  usePushStore.getState().setPushState({ optedOut: !enabled });
  await syncPushRegistration(uid, { ask: enabled });
}

/**
 * Abrir as definições do sistema. É o único caminho quando a permissão foi **recusada**: o sistema
 * não volta a mostrar o pedido, por muito que a app insista.
 */
export async function openSystemSettings(): Promise<void> {
  await Linking.openSettings();
}
