import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { createLiveQuery } from '@/lib/live-query';
import { createProfileResolver } from '@/lib/matching';
import { toSessionKey } from '@/lib/time';
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

/** O que é preciso saber de uma sessão para a contar (ver `summarizeSessions`). */
export interface CountableSession {
  studentUid: string;
  mentorUid: string;
  status?: SessionStatus;
  date: string;
  time: string;
}

/** Os três números que o perfil mostra. */
export interface SessionStats {
  /** Concluídas em que ensinei. */
  given: number;
  /** Concluídas em que aprendi. */
  received: number;
  /** Marcadas e ainda por acontecer. */
  upcoming: number;
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

export interface SessionRequestsState {
  requests: SessionRequest[];
  /** true quando a última leitura falhou (regras negadas, rede em baixo). */
  error: boolean;
}

/**
 * Os pedidos de sessão pendentes, ao vivo e partilhados — ver `createLiveQuery` para a razão de ser
 * (a Home conta-os e as Notificações mostram-nos: era a mesma pergunta feita duas vezes) e para o
 * que o estado de erro resolve.
 */
const pendingSessionRequests = createLiveQuery<SessionRequest[]>({
  initial: [],
  open: (toUid, onValue, onError) => {
    const requestsQuery = query(
      collection(db, 'sessionRequests'),
      where('to', '==', toUid),
      where('status', '==', 'pending'),
    );
    const resolveProfile = createProfileResolver();
    let latestRequestId = 0;

    return onSnapshot(
      requestsQuery,
      async (snapshot) => {
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
        onValue(
          resolved
            .filter((request): request is SessionRequest => request !== null)
            .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
        );
      },
      () => onError(),
    );
  },
});

/** Junta um ecrã à leitura dos pedidos de sessão pendentes (ver `useSessionRequests`). */
export function subscribePendingSessionRequests(
  toUid: string,
  onChange: (state: SessionRequestsState) => void,
): () => void {
  return pendingSessionRequests.subscribe(toUid, ({ value, error }) => onChange({ requests: value, error }));
}

/** Segunda tentativa depois de uma leitura falhada (fecha a subscrição e abre outra). */
export function retryPendingSessionRequests(): void {
  pendingSessionRequests.retry();
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

/**
 * Conta as sessões de um utilizador a partir dos documentos crus.
 *
 * O que vale a pena fixar aqui: "dada" é uma sessão **concluída** em que eu era o mentor. Uma
 * sessão marcada e ainda por acontecer não é uma sessão dada — é uma sessão por vir, e tem o seu
 * próprio número. Sem esta distinção, o número de cima mentiria sempre que alguém marcasse uma
 * aula. Sessões antigas, sem o campo `status`, contam como marcadas, tal como em
 * `subscribeToSessions`.
 *
 * É pura de propósito: sem React e sem base de dados, é a única parte desta contagem que se pode
 * provar a sério (ver tests/lib/sessions.test.mts).
 */
export function summarizeSessions(sessions: CountableSession[], uid: string, nowKey: string): SessionStats {
  const stats: SessionStats = { given: 0, received: 0, upcoming: 0 };

  for (const session of sessions) {
    if ((session.status ?? 'scheduled') === 'completed') {
      if (session.mentorUid === uid) stats.given += 1;
      else if (session.studentUid === uid) stats.received += 1;
    } else if (`${session.date}T${session.time}` >= nowKey) {
      stats.upcoming += 1;
    }
  }

  return stats;
}

/**
 * Ouve as sessões **só para as contar**.
 *
 * Ao contrário de `subscribeToSessions`, não resolve o perfil de ninguém: no perfil mostram-se
 * três números, e ir buscar o nome do outro participante por cada sessão seria uma leitura de
 * perfil por sessão para deitar fora.
 */
export function subscribeToSessionStats(uid: string, onChange: (stats: SessionStats) => void) {
  const sessionsQuery = query(collection(db, 'sessions'), where('participants', 'array-contains', uid));

  return onSnapshot(sessionsQuery, (snapshot) => {
    // O "agora" é lido a cada evento, e não uma vez no momento da subscrição, para o número de
    // sessões por vir continuar certo numa app que fica aberta de um dia para o outro.
    onChange(summarizeSessions(snapshot.docs.map((docSnap) => docSnap.data() as SessionDoc), uid, toSessionKey()));
  });
}
