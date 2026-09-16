import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

/**
 * Apagar uma conta - a camada de dados, sem tocar no Firebase Auth.
 *
 * O que aqui está é **o plano**: onde a conta aparece no Firestore, por que ordem se apaga e em que
 * lotes. Quem apaga a conta em si (`deleteUser`) é o `src/auth/actions.ts`, e a ordem entre os dois
 * é a parte que importa: os dados primeiro, a conta depois.
 *
 * **Porque é que esta ordem não é indiferente.** As regras do Firestore decidem pelo token, e depois
 * de a conta do Auth desaparecer não há token nenhum - o cliente perde o direito de apagar o que
 * sobrou, e ficavam documentos órfãos que ninguém, nem o próprio, podia remover. Ao contrário,
 * apagados os dados e falhando a conta, o que resta é recuperável: repetir a operação volta a passar
 * pelos mesmos passos (todos idempotentes) e acaba onde tinha de acabar.
 *
 * **O que fica de fora, e porquê:** as avaliações (`ratings/{sessionId}`). São anónimas, não têm
 * autor nenhum dentro do documento, e a chave é a sessão - apagada a sessão, ninguém lá chega. Abrir
 * `delete` nos ratings para as levar atrás da conta seria dar a um mentor a possibilidade de apagar
 * as avaliações más que recebeu, que é precisamente o que o anonimato existe para impedir.
 * As **mensagens que a outra pessoa escreveu** também ficam: não são dela, e ficam inalcançáveis
 * assim que a conversa desaparece (as regras exigem a conversa para se ler dentro dela).
 */

/** Uma coleção onde a conta aparece junto de outras pessoas, e como se encontram os documentos. */
export interface SharedAccountQuery {
  path: string;
  field: string;
  /** `equals` procura um campo igual ao UID; `contains` procura o UID dentro de uma lista. */
  mode: 'equals' | 'contains';
}

/**
 * Os documentos que são **de dois**: existem porque duas pessoas se ligaram, e ficar com pedidos e
 * conversas de alguém que já não existe é pior para quem fica.
 *
 * Os dois sentidos de `connectionRequests` e `sessionRequests` estão lá por uma razão prática, e
 * não por simetria: os documentos são sempre `from` → `to`, e a regra de leitura é um **ou**
 * (`from == uid || to == uid`). O Firestore avalia as regras contra a consulta, e um `||` só passa
 * se a consulta provar um dos lados - daí uma consulta por cada sentido, e não uma só.
 */
export const SHARED_ACCOUNT_QUERIES: readonly SharedAccountQuery[] = [
  { path: 'connectionRequests', field: 'from', mode: 'equals' },
  { path: 'connectionRequests', field: 'to', mode: 'equals' },
  { path: 'sessionRequests', field: 'from', mode: 'equals' },
  { path: 'sessionRequests', field: 'to', mode: 'equals' },
  { path: 'sessions', field: 'participants', mode: 'contains' },
  { path: 'conversations', field: 'participants', mode: 'contains' },
];

/** Subcoleções privadas, varridas por inteiro (`users/{uid}/devices` - um token por dispositivo). */
export function ownedCollectionPaths(uid: string): string[] {
  return [`users/${uid}/devices`];
}

/**
 * Documentos únicos do dono, **por ordem de execução**: os dados privados da conta e só no fim o
 * perfil.
 *
 * O perfil em último porque é ele que a app lê para saber que a conta existe (é dele que vem o
 * `profileCompleted` - ver src/lib/auth-gate.ts): se a operação parar a meio, o que fica é uma conta
 * a que faltam dados, e não uma app que não sabe o que mostrar a quem está a entrar.
 */
export function ownedDocumentPaths(uid: string): string[] {
  return [`userAccounts/${uid}`, `users/${uid}`];
}

/**
 * O limite de um lote. O Firestore aceita 500 escritas por `writeBatch` e o `delete` conta como
 * uma - 400 deixa margem para este passo crescer sem se partir por um número redondo.
 */
export const DELETION_BATCH_SIZE = 400;

/**
 * Apaga tudo o que é da conta no Firestore. A conta do Auth fica para quem chama - e é apagada
 * **depois** disto (ver o comentário do topo deste ficheiro).
 *
 * É idempotente de propósito: repetir não encontra metade das coisas e não se queixa disso, o que é
 * o que permite a uma tentativa falhada voltar a correr do princípio.
 */
export async function deleteAccountData(uid: string): Promise<void> {
  // 1. As conversas. Por dentro de cada uma, primeiro as mensagens que **esta** pessoa escreveu e
  //    só depois a conversa: a regra das mensagens exige que a conversa exista, e apagada a
  //    conversa as que sobrassem ficavam inalcançáveis - e, por isso mesmo, impossíveis de apagar.
  const conversations = await findShared('conversations', uid);
  for (const conversation of conversations) {
    await deleteInBatches(
      await findWhere(`conversations/${conversation.id}/messages`, 'senderId', 'equals', uid),
    );
  }
  await deleteInBatches(conversations);

  // 2. Os pedidos de conexão, os de sessão e as sessões - o resto dos documentos que são de dois.
  for (const { path, field, mode } of SHARED_ACCOUNT_QUERIES) {
    if (path === 'conversations') continue;
    await deleteInBatches(await findWhere(path, field, mode, uid));
  }

  // 3. Os bloqueios que **esta** pessoa fez. Os que os outros fizeram sobre ela ficam: são deles, e
  //    uma referência a um UID não é dado pessoal nenhum.
  await deleteInBatches(await findWhere('blocks', 'blocker', 'equals', uid));

  // 4. O que é só dela: os registos dos avisos, os dados privados da conta e, no fim, o perfil.
  for (const path of ownedCollectionPaths(uid)) {
    await deleteInBatches(await findAll(path));
  }
  await deleteInBatches(ownedDocumentPaths(uid).map(documentAt));
}

/** A consulta de uma coleção partilhada, a partir do plano, com o UID já lá dentro. */
async function findShared(path: string, uid: string): Promise<DocumentReference[]> {
  const spec = SHARED_ACCOUNT_QUERIES.find((candidate) => candidate.path === path);
  if (!spec) {
    // Um caminho fora do plano é um erro de quem chama, e falhar alto aqui é o que impede este
    // ficheiro de crescer com uma consulta a mais sem ninguém dar por isso.
    throw new Error(`Sem consulta de eliminação para "${path}".`);
  }

  return findWhere(spec.path, spec.field, spec.mode, uid);
}

async function findWhere(
  path: string,
  field: string,
  mode: SharedAccountQuery['mode'],
  value: string,
): Promise<DocumentReference[]> {
  const snapshot = await getDocs(
    query(collectionAt(path), where(field, mode === 'equals' ? '==' : 'array-contains', value)),
  );

  return snapshot.docs.map((document) => document.ref);
}

async function findAll(path: string): Promise<DocumentReference[]> {
  const snapshot = await getDocs(collectionAt(path));
  return snapshot.docs.map((document) => document.ref);
}

/**
 * Apaga em lotes.
 *
 * Um `writeBatch` é atómico: ou passa tudo, ou não passa nada - e um lote de 500 documentos falhado
 * a meio por causa de **um** documento rejeitado deixava os outros 499 por apagar sem se saber
 * quais. Em lotes, o que falha é o lote, e repetir a operação volta a passar por cima dos mesmos.
 */
async function deleteInBatches(references: DocumentReference[]): Promise<void> {
  for (let index = 0; index < references.length; index += DELETION_BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const reference of references.slice(index, index + DELETION_BATCH_SIZE)) {
      batch.delete(reference);
    }
    await batch.commit();
  }
}

/**
 * Uma coleção a partir do caminho (`users/abc/devices` → a coleção `devices` de `users/abc`).
 *
 * O SDK aceita o caminho inteiro numa string e recusa-o se o número de segmentos não der uma
 * coleção (número ímpar) - a validação é dele, e é por isso que os caminhos deste ficheiro são
 * escritos por extenso em vez de montados em pedaços.
 */
function collectionAt(path: string): CollectionReference {
  return collection(db, path);
}

/** Um documento a partir do caminho (`users/abc` → o documento `abc` de `users`). */
function documentAt(path: string): DocumentReference {
  return doc(db, path);
}
