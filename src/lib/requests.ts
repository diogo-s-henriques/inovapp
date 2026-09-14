import { collection, doc, onSnapshot, query, serverTimestamp, Timestamp, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
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
}

/** Ouve, em tempo real, os pedidos de conexão pendentes recebidos por este utilizador (mentor/tutor). */
export function subscribePendingConnectionRequests(toUid: string, onChange: (requests: ConnectionRequest[]) => void) {
  const requestsQuery = query(
    collection(db, 'connectionRequests'),
    where('to', '==', toUid),
    where('status', '==', 'pending'),
  );
  const resolveProfile = createProfileResolver();
  let latestRequestId = 0;

  return onSnapshot(requestsQuery, async (snapshot) => {
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
    onChange(
      resolved
        .filter((request): request is ConnectionRequest => request !== null)
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
    );
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
