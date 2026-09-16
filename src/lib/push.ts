import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * Camada de dados das notificações push, sem tocar no `expo-notifications`: o que aqui está é a
 * **decisão** (registo, esquecimento ou nada) e onde ela fica escrita. Quem fala com o sistema
 * -permissões e token da Expo- é o `src/push/actions.ts`, pela mesma razão que o `matching.ts` não
 * sabe desenhar ecrãs: o que se pode testar sem telemóvel fica de um lado, o que precisa do
 * sistema fica do outro.
 *
 * **Porque é que o token não vive no documento do perfil:** `users/{uid}` é legível por qualquer
 * utilizador autenticado (é o que a pesquisa e o matching precisam, ver firestore.rules), e um
 * ExpoPushToken lá dentro era legível por todos - quem o tivesse podia enviar avisos em nome da
 * app a qualquer pessoa. O sítio dele é uma subcoleção privada, `users/{uid}/devices/{id}`, que só
 * o próprio lê e escreve; quem envia (as Cloud Functions) usa o Admin SDK e não passa pelas
 * regras.
 */

/** Chave do dispositivo que gerou o registo (ver `getInstallationId`). */
const INSTALLATION_STORAGE_KEY = 'inovapp:pushInstallationId';
/** "Não quero avisos", decidido nas Definições. Vive no dispositivo, não na conta. */
const OPT_OUT_STORAGE_KEY = 'inovapp:pushOptOut';

export type PushPlatform = 'android' | 'ios';

/** O que o sistema diz sobre os avisos. `undetermined` é "ainda não perguntámos". */
export type PushPermission = 'granted' | 'denied' | 'undetermined';

/** O que fazer com o registo deste dispositivo. */
export type PushAction = 'register' | 'forget' | 'idle';

/**
 * A decisão toda, num sítio só - e por isso testável sem telemóvel nenhum.
 *
 * Três casos que valem a pena: **desligado** (`optedOut`) e **sem permissão** dão no mesmo lugar
 * (o registo não vale nada, apaga-se em vez de ficar lá a receber avisos que ninguém quer); e
 * **token igual ao que já está escrito** dá `idle`, porque reescrever o mesmo em cada arranque da
 * app era uma escrita por arranque para não mudar nada.
 */
export function registrationAction(input: {
  permission: PushPermission;
  token: string | null;
  storedToken: string | null;
  optedOut: boolean;
}): PushAction {
  const { permission, token, storedToken, optedOut } = input;

  if (optedOut || permission !== 'granted') {
    return storedToken ? 'forget' : 'idle';
  }

  if (!token) return 'idle';
  return token === storedToken ? 'idle' : 'register';
}

/**
 * Identificador deste dispositivo, criado uma vez e guardado no dispositivo.
 *
 * Existe para o registo ser **um documento por dispositivo** (e não um por token): sem ele, cada
 * vez que a Expo emitisse um token novo ficava um documento velho a receber avisos para um
 * telemóvel que já não os pode mostrar. Não é secreto - as regras é que decidem quem o pode ler.
 */
export async function getInstallationId(): Promise<string> {
  const stored = await AsyncStorage.getItem(INSTALLATION_STORAGE_KEY);
  if (stored) return stored;

  const created = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(INSTALLATION_STORAGE_KEY, created);
  return created;
}

export async function getPushOptOut(): Promise<boolean> {
  return (await AsyncStorage.getItem(OPT_OUT_STORAGE_KEY)) === 'true';
}

export async function setPushOptOut(optedOut: boolean): Promise<void> {
  if (optedOut) {
    await AsyncStorage.setItem(OPT_OUT_STORAGE_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(OPT_OUT_STORAGE_KEY);
  }
}

/** O token já registado para este dispositivo, ou `null` se não houver registo. */
export async function fetchRegisteredToken(
  uid: string,
  installationId: string,
): Promise<string | null> {
  const snapshot = await getDoc(doc(db, 'users', uid, 'devices', installationId));
  const token = snapshot.data()?.token;
  return typeof token === 'string' ? token : null;
}

export async function registerDevice(
  uid: string,
  installationId: string,
  token: string,
  platform: PushPlatform,
): Promise<void> {
  // `userId` fica no documento além do caminho: quem envia (as Cloud Functions) percorre a
  // coleção toda e não tem de subir dois níveis de referência para saber de quem é o token.
  await setDoc(doc(db, 'users', uid, 'devices', installationId), {
    userId: uid,
    token,
    platform,
    updatedAt: serverTimestamp(),
  });
}

export async function forgetDevice(uid: string, installationId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'devices', installationId));
}
