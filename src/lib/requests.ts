import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { createLiveQuery } from '@/lib/live-query';
import { createProfileResolver, matchId } from '@/lib/matching';
import type { MatchCandidate } from '@/types/match';

export interface ConnectionRequest {
  id: string;
  fromUid: string;
  candidate: MatchCandidate;
  createdAt?: Date;
}

interface ConnectionRequestDoc {
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: Timestamp;
  respondedAt?: Timestamp;
}

export interface ConnectionRequestsState {
  requests: ConnectionRequest[];
  /** true quando a última leitura falhou (regras negadas, rede em baixo). */
  error: boolean;
}

/** Quantos aceites recentes a subscrição de quem **enviou** traz. O ecrã mostra oito linhas no
 * total e estas entram na mesma lista; cinco chega para as que ainda cabem depois de ordenar. */
const ACCEPTED_LIMIT = 5;

/**
 * Os pedidos de conexão pendentes, **ao vivo e partilhados por todos os ecrãs**.
 *
 * A subscrição é uma só, e é por isso que este módulo tem estado: a bolinha da barra de baixo, a
 * contagem da Home e a lista dos Matches são a mesma pergunta (`to == eu` e `status == 'pending'`),
 * e chegaram a ser três subscrições abertas ao mesmo tempo — a mesma pergunta feita três vezes, e
 * cada alteração contada (e paga) três vezes. Quem chega depois recebe o que já se sabe.
 *
 * O terceiro argumento do `onSnapshot` é o que **não** existia: sem ele, uma leitura negada pelas
 * regras não era um estado — era uma lista que ficava como estava, indistinguível de "não há
 * pedidos". Foi assim que uma falta de regras no Firebase passou meses por "ecrã sem dados".
 */
const pendingRequests = createLiveQuery<ConnectionRequest[]>({
  initial: [],
  open: (uid, onValue, onError) => {
    const requestsQuery = query(
      collection(db, 'connectionRequests'),
      where('to', '==', uid),
      where('status', '==', 'pending'),
    );
    const resolveProfile = createProfileResolver();
    let latestRequestId = 0;

    return onSnapshot(
      requestsQuery,
      async (snapshot) => {
        const requestId = ++latestRequestId;
        const resolved = await Promise.all(
          snapshot.docs.map(async (docSnap): Promise<ConnectionRequest | null> => {
            const data = docSnap.data() as ConnectionRequestDoc;
            const candidate = await resolveProfile(data.from);
            if (!candidate) return null;
            return { id: docSnap.id, fromUid: data.from, candidate, createdAt: data.createdAt?.toDate() };
          }),
        );

        if (requestId !== latestRequestId) return;
        onValue(
          resolved
            .filter((request): request is ConnectionRequest => request !== null)
            .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
        );
      },
      () => onError(),
    );
  },
});

/** Junta um ecrã à leitura dos pedidos pendentes. Ver `useConnectionRequests`, que é o que os
 * ecrãs usam. */
export function subscribePendingConnectionRequests(
  uid: string,
  onChange: (state: ConnectionRequestsState) => void,
): () => void {
  // O nome do campo muda (`value` na leitura viva, `requests` aqui): quem chama lê o que a lista
  // é, e não o que a peça partilhada lhe chama.
  return pendingRequests.subscribe(uid, ({ value, error }) => onChange({ requests: value, error }));
}

/** Segunda tentativa depois de uma leitura falhada (fecha a subscrição e abre outra). */
export function retryPendingConnectionRequests(): void {
  pendingRequests.retry();
}

export interface ConnectionResponse {
  /** O id do pedido de conexão — a mesma chave que a linha do histórico usa (`connection-{id}`),
   * para a mesma resposta não aparecer duas vezes quando as duas leituras coincidem. */
  id: string;
  /** Quem aceitou. */
  candidate: MatchCandidate;
  respondedAt: Date;
}

/**
 * Ouve, em tempo real, os pedidos de conexão **que eu enviei** e que já foram aceites.
 *
 * Era o lado que faltava. A app só ouvia o que chega (`to == eu`), por isso quem **pede** só sabia
 * da resposta quando algum ecrã voltasse a ler (o puxar da Home, o abrir da Agenda). Aceitar do
 * outro lado passa a aparecer no histórico das Notificações no momento em que acontece.
 *
 * Só aceites: um pedido recusado não gera aviso (como em `fetchRecentActivity`, que também filtra
 * por `accepted`) — a decisão é do outro, e a app não persegue ninguém com ela.
 *
 * Ordenado e limitado no servidor, e a consulta precisa do índice composto declarado em
 * `firestore.indexes.json` (o mesmo que `fetchRecentActivity` já usava).
 */
export function subscribeToAcceptedConnectionRequests(
  uid: string,
  onChange: (responses: ConnectionResponse[]) => void,
): () => void {
  const responsesQuery = query(
    collection(db, 'connectionRequests'),
    where('from', '==', uid),
    where('status', '==', 'accepted'),
    orderBy('respondedAt', 'desc'),
    limit(ACCEPTED_LIMIT),
  );
  const resolveProfile = createProfileResolver();
  let latestResponseId = 0;

  return onSnapshot(responsesQuery, async (snapshot) => {
    const responseId = ++latestResponseId;
    const resolved = await Promise.all(
      snapshot.docs.map(async (docSnap): Promise<ConnectionResponse | null> => {
        const data = docSnap.data() as ConnectionRequestDoc;
        const respondedAt = data.respondedAt?.toDate();
        if (!respondedAt) return null;
        const candidate = await resolveProfile(data.to);
        if (!candidate) return null;
        return { id: docSnap.id, candidate, respondedAt };
      }),
    );

    if (responseId !== latestResponseId) return;
    onChange(resolved.filter((response): response is ConnectionResponse => response !== null));
  });
}

/** Aceita ou recusa um pedido de conexão. Ao aceitar, cria a conversa entre os dois participantes.
 * As duas escritas vão no mesmo batch: ou aceitam o pedido E criam a conversa, ou nenhuma das duas
 * acontece — nunca fica um pedido "accepted" sem conversa correspondente. */
export async function respondToConnectionRequest(
  requestId: string,
  fromUid: string,
  toUid: string,
  accept: boolean,
): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'connectionRequests', requestId), {
    status: accept ? 'accepted' : 'declined',
    respondedAt: serverTimestamp(),
  });

  if (accept) {
    batch.set(
      doc(db, 'conversations', matchId(fromUid, toUid)),
      { participants: [fromUid, toUid].sort(), createdAt: serverTimestamp() },
      { merge: true },
    );
  }

  await batch.commit();
}
