import {
  collection,
  deleteDoc,
  doc,
  FirestoreError,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * Bloqueios entre utilizadores (`blocks/{blocker}_{blocked}`).
 *
 * O documento tem um sentido (foi o blocker que o criou — é o que as regras exigem), mas o efeito
 * é **simétrico**: a partir do momento em que existe, os dois deixam de se ver na descoberta, de
 * se poder ligar, de falar e de pedir sessões. É por isso que há duas leituras — a minha lista de
 * bloqueios e a lista de quem me bloqueou — sempre que o que interessa é "com quem não falo".
 */

/** ID determinístico e orientado: só quem bloqueia (`blocker`) pode criar o documento. */
export function blockId(blockerUid: string, blockedUid: string): string {
  return `${blockerUid}_${blockedUid}`;
}

export async function blockUser(blockerUid: string, blockedUid: string): Promise<void> {
  await setDoc(doc(db, 'blocks', blockId(blockerUid, blockedUid)), {
    blocker: blockerUid,
    blocked: blockedUid,
    createdAt: serverTimestamp(),
  });
}

/** Desbloquear é a única eliminação permitida no projeto — e só a faz o autor do bloqueio. */
export async function unblockUser(blockerUid: string, blockedUid: string): Promise<void> {
  await deleteDoc(doc(db, 'blocks', blockId(blockerUid, blockedUid)));
}

/**
 * Se **eu** bloqueei esta pessoa em concreto (só o sentido meu). É o que decide se o botão do
 * perfil diz "Bloquear" ou "Desbloquear": quem me bloqueou a mim continua a ver "Bloquear", e
 * carregar nele cria o bloqueio do meu lado — os dois ficam a ver o mesmo (nada).
 */
export async function hasBlocked(blockerUid: string, blockedUid: string): Promise<boolean> {
  try {
    const snapshot = await getDoc(doc(db, 'blocks', blockId(blockerUid, blockedUid)));
    return snapshot.exists();
  } catch (error) {
    // Um bloqueio que não existe também não é legível: a regra lê `resource.data.blocker`, que
    // nesse caso é nulo, e o Firestore responde com permission-denied em vez de "não encontrado".
    // Sem isto, este get() rebentava para toda a gente que nunca bloqueou ninguém — ou seja, para
    // o caso comum — e o ecrã de perfil mostrava um erro em vez do perfil. É o mesmo padrão de
    // `conversationExists` (src/lib/chat.ts): só um permission-denied é lido como "não existe".
    if ((error as FirestoreError)?.code === 'permission-denied') return false;
    throw error;
  }
}

/** UIDs que o utilizador bloqueou (só os dele). É o que a lista em Definições mostra. */
export async function fetchBlockedUids(uid: string): Promise<string[]> {
  const snapshot = await getDocs(query(collection(db, 'blocks'), where('blocker', '==', uid)));
  return snapshot.docs.map((docSnap) => docSnap.data().blocked as string);
}

/**
 * UIDs com quem o utilizador tem um bloqueio, **em qualquer sentido**: quem ele bloqueou e quem
 * o bloqueou. É este conjunto que exclui da descoberta, das listas de ligações e do chat.
 */
export async function fetchBlockedPairs(uid: string): Promise<Set<string>> {
  const [bloqueados, bloqueadores] = await Promise.all([
    getDocs(query(collection(db, 'blocks'), where('blocker', '==', uid))),
    getDocs(query(collection(db, 'blocks'), where('blocked', '==', uid))),
  ]);

  const uids = new Set<string>();
  bloqueados.forEach((docSnap) => uids.add(docSnap.data().blocked as string));
  bloqueadores.forEach((docSnap) => uids.add(docSnap.data().blocker as string));
  return uids;
}

/**
 * O mesmo que `fetchBlockedPairs`, mas a acompanhar alterações. O Chat precisa disto: um bloqueio
 * feito no perfil tem de fazer a conversa desaparecer da lista sem o ecrã ser reaberto.
 */
export function subscribeToBlockedPairs(uid: string, onChange: (uids: Set<string>) => void): () => void {
  let bloqueados: string[] = [];
  let bloqueadores: string[] = [];
  // Só se emite quando as duas leituras já responderam uma vez, para não sair daqui um conjunto
  // incompleto (que mostraria por instantes conversas de gente bloqueada).
  let prontos = 0;

  const emitir = () => {
    if (prontos < 2) return;
    onChange(new Set([...bloqueados, ...bloqueadores]));
  };

  const cancelar = [
    onSnapshot(query(collection(db, 'blocks'), where('blocker', '==', uid)), (snapshot) => {
      bloqueados = snapshot.docs.map((docSnap) => docSnap.data().blocked as string);
      prontos += 1;
      emitir();
    }),
    onSnapshot(query(collection(db, 'blocks'), where('blocked', '==', uid)), (snapshot) => {
      bloqueadores = snapshot.docs.map((docSnap) => docSnap.data().blocker as string);
      prontos += 1;
      emitir();
    }),
  ];

  return () => cancelar.forEach((unsubscribe) => unsubscribe());
}
