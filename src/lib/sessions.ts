import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { createProfileResolver } from '@/lib/matching';
import type { AgendaSession, SessionModality, SessionRequest, SessionStatus } from '@/types/session';

interface SessionRequestDoc {
  from: string;
  to: string;
  subject: string;
  date: string;
  time: string;
  modality: SessionModality;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: Timestamp;
}

interface SessionDoc {
  participants: string[];
  studentUid: string;
  mentorUid: string;
  sessionRequestId: string;
  subject: string;
  date: string;
  time: string;
  modality: SessionModality;
  status?: SessionStatus;
  createdAt?: Timestamp;
}

export interface NewSessionRequestData {
  subject: string;
  date: string;
  time: string;
  modality: SessionModality;
  message: string;
}

/** Pedido de sessão: ao contrário do pedido de conexão, qualquer um dos dois lados de uma
 * ligação já aceite pode pedir (perfil do mentor ou "Marcar sessão" no chat). Quem pede fica
 * "Tutorando" nessa sessão específica; quem recebe fica "Mentor". */
export async function sendSessionRequest(fromUid: string, toUid: string, data: NewSessionRequestData): Promise<string> {
  const ref = await addDoc(collection(db, 'sessionRequests'), {
    from: fromUid,
    to: toUid,
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Ouve, em tempo real, o estado de um pedido de sessão específico — usado pelo cartão de
 * pedido de sessão no chat (SessionRequestCard), para refletir Aceite/Recusada sem recarregar. */
export function subscribeToSessionRequestStatus(
  requestId: string,
  onChange: (status: 'pending' | 'accepted' | 'declined') => void,
) {
  return onSnapshot(doc(db, 'sessionRequests', requestId), (snapshot) => {
    const status = snapshot.data()?.status as 'pending' | 'accepted' | 'declined' | undefined;
    if (status) onChange(status);
  });
}

/** Ouve, em tempo real, os pedidos de sessão pendentes recebidos por este utilizador. */
export function subscribePendingSessionRequests(toUid: string, onChange: (requests: SessionRequest[]) => void) {
  const requestsQuery = query(
    collection(db, 'sessionRequests'),
    where('to', '==', toUid),
    where('status', '==', 'pending'),
  );
  const resolveProfile = createProfileResolver();
  let latestRequestId = 0;

  return onSnapshot(requestsQuery, async (snapshot) => {
    const requestId = ++latestRequestId;
    const resolved = await Promise.all(
      snapshot.docs.map(async (docSnap): Promise<SessionRequest | null> => {
        const data = docSnap.data() as SessionRequestDoc;
        const candidate = await resolveProfile(data.from);
        if (!candidate) return null;
        return {
          id: docSnap.id,
          fromUid: data.from,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          image: candidate.image,
          subject: data.subject,
          date: data.date,
          time: data.time,
          modality: data.modality,
          message: data.message,
          createdAt: data.createdAt?.toDate(),
        };
      }),
    );

    if (requestId !== latestRequestId) return;
    onChange(
      resolved
        .filter((request): request is SessionRequest => request !== null)
        .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
    );
  });
}

/** Aceita ou recusa um pedido de sessão. Ao aceitar, cria a sessão confirmada que alimenta a
 * agenda de ambos os participantes. As duas escritas vão no mesmo batch: ou aceitam o pedido E
 * criam a sessão, ou nenhuma das duas acontece — nunca fica um pedido "accepted" sem sessão. */
export async function respondToSessionRequest(request: SessionRequest, toUid: string, accept: boolean): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'sessionRequests', request.id), {
    status: accept ? 'accepted' : 'declined',
    respondedAt: serverTimestamp(),
  });

  if (accept) {
    batch.set(doc(collection(db, 'sessions')), {
      participants: [request.fromUid, toUid].sort(),
      studentUid: request.fromUid,
      mentorUid: toUid,
      sessionRequestId: request.id,
      subject: request.subject,
      date: request.date,
      time: request.time,
      modality: request.modality,
      status: 'scheduled',
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/** Só o mentor pode terminar a sessão (ver firestore.rules) — marca-a como concluída, o que
 * também dispara de imediato o pedido de avaliação ao Tutorando, sem esperar pela hora agendada. */
export async function completeSession(sessionId: string): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

/** Ouve, em tempo real, as sessões confirmadas deste utilizador, ordenadas por data/hora. */
export function subscribeToSessions(uid: string, onChange: (sessions: AgendaSession[]) => void) {
  const sessionsQuery = query(collection(db, 'sessions'), where('participants', 'array-contains', uid));
  const resolveProfile = createProfileResolver();
  let latestRequestId = 0;

  return onSnapshot(sessionsQuery, async (snapshot) => {
    const requestId = ++latestRequestId;
    const resolved = await Promise.all(
      snapshot.docs.map(async (docSnap): Promise<AgendaSession | null> => {
        const data = docSnap.data() as SessionDoc;
        const otherUid = data.participants.find((id) => id !== uid);
        if (!otherUid) return null;
        const candidate = await resolveProfile(otherUid);
        if (!candidate) return null;

        return {
          id: docSnap.id,
          otherUid,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          image: candidate.image,
          subject: data.subject,
          date: data.date,
          time: data.time,
          modality: data.modality,
          role: data.studentUid === uid ? 'student' : 'mentor',
          status: data.status ?? 'scheduled',
        };
      }),
    );

    if (requestId !== latestRequestId) return;
    onChange(
      resolved
        .filter((session): session is AgendaSession => session !== null)
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)),
    );
  });
}
