import { arrayUnion, collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { createLiveQuery } from '@/lib/live-query';
import { createProfileResolver, matchId } from '@/lib/matching';
import { toSessionKey } from '@/lib/time';
import type { ChatSessionRequestInfo } from '@/types/chat';
import type { AgendaSession, SessionModality, SessionRequest, SessionStatus } from '@/types/session';

interface SessionRequestDoc {
  from: string;
  to: string;
  subject?: string;
  date: string;
  time: string;
  modality: SessionModality;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: Timestamp;
  respondedAt?: Timestamp;
}

interface SessionDoc {
  participants: string[];
  studentUid: string;
  mentorUid: string;
  sessionRequestId: string;
  subject?: string;
  date: string;
  time: string;
  modality: SessionModality;
  status?: SessionStatus;
  createdAt?: Timestamp;
}

export interface NewSessionRequestData {
  /** Opcional: os pedidos novos não perguntam a disciplina. */
  subject?: string;
  date: string;
  time: string;
  modality: SessionModality;
  message: string;
}

export interface SendSessionRequestOptions {
  /** Deixa também o cartão na conversa, na mesma escrita que o pedido (ver o chat). */
  attachToChat?: boolean;
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
 * ligação já aceite pode pedir (perfil do tutor ou "Marcar sessão" no chat). Quem pede fica
 * "Tutorando" nessa sessão específica; quem recebe fica "Tutor" - no documento, o campo continua a
 * chamar-se `mentorUid`, do tempo em que o papel se chamava assim. */
export async function sendSessionRequest(
  fromUid: string,
  toUid: string,
  data: NewSessionRequestData,
  options: SendSessionRequestOptions = {},
): Promise<string> {
  const requestRef = doc(collection(db, 'sessionRequests'));
  const requestData = {
    from: fromUid,
    to: toUid,
    date: data.date,
    time: data.time,
    modality: data.modality,
    message: data.message,
    ...(data.subject ? { subject: data.subject } : {}),
    status: 'pending',
    createdAt: serverTimestamp(),
  };

  if (!options.attachToChat) {
    await setDoc(requestRef, requestData);
    return requestRef.id;
  }

  // O pedido e o cartão no chat são uma escrita só. Antes eram duas, e uma falha a meio deixava
  // um pedido criado sem cartão nenhum na conversa - exatamente o que não pode acontecer quando o
  // cartão é a forma de aceitar. A conversa já existe (só se pede sessão a quem já está ligado).
  const conversationId = matchId(fromUid, toUid);
  const sessionRequest: ChatSessionRequestInfo = {
    requestId: requestRef.id,
    ...(data.subject ? { subject: data.subject } : {}),
    date: data.date,
    time: data.time,
    modality: data.modality,
    ...(data.message.trim() ? { message: data.message.trim() } : {}),
  };

  const batch = writeBatch(db);
  batch.set(requestRef, requestData);
  batch.set(doc(collection(db, 'conversations', conversationId, 'messages')), {
    text: '',
    senderId: fromUid,
    createdAt: serverTimestamp(),
    sessionRequest,
  });
  batch.update(doc(db, 'conversations', conversationId), {
    lastMessage: '📅 Pedido de sessão',
    lastMessageAt: serverTimestamp(),
    unreadFor: arrayUnion(toUid),
  });
  await batch.commit();

  return requestRef.id;
}

/** Ouve, em tempo real, o estado de um pedido de sessão específico - usado pelo cartão de
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
 * Os pedidos de sessão pendentes, ao vivo e partilhados - ver `createLiveQuery` para a razão de ser
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

/** Resposta a um pedido que **eu** enviei, para o histórico das Notificações. */
export interface SessionResponse {
  id: string;
  accepted: boolean;
  /** Nome de quem respondeu (o destinatário do pedido). */
  firstName: string;
  respondedAt: Date;
}

/** Quantas respostas recentes a subscrição traz - a lista final já corta em oito. */
const SESSION_RESPONSE_LIMIT = 5;

/**
 * Ouve, ao vivo, as respostas aos pedidos de sessão que **eu** enviei.
 *
 * A consulta junta aceites e recusas (`in`), ordenadas por `respondedAt`; o índice composto de
 * `sessionRequests` (from + status + respondedAt) já cobre os dois casos. Sem isto, quem pedia só
 * via a resposta ao voltar a abrir as Notificações - e uma recusa nunca aparecia.
 */
export function subscribeToSessionResponses(
  uid: string,
  onChange: (responses: SessionResponse[]) => void,
): () => void {
  const responsesQuery = query(
    collection(db, 'sessionRequests'),
    where('from', '==', uid),
    where('status', 'in', ['accepted', 'declined']),
    orderBy('respondedAt', 'desc'),
    limit(SESSION_RESPONSE_LIMIT),
  );
  const resolveProfile = createProfileResolver();
  let latestResponseId = 0;

  return onSnapshot(responsesQuery, async (snapshot) => {
    const responseId = ++latestResponseId;
    const resolved = await Promise.all(
      snapshot.docs.map(async (docSnap): Promise<SessionResponse | null> => {
        const data = docSnap.data() as SessionRequestDoc;
        const respondedAt = data.respondedAt?.toDate();
        if (!respondedAt) return null;
        const candidate = await resolveProfile(data.to);
        return {
          id: docSnap.id,
          accepted: data.status === 'accepted',
          firstName: candidate?.firstName ?? '',
          respondedAt,
        };
      }),
    );

    if (responseId !== latestResponseId) return;
    onChange(resolved.filter((response): response is SessionResponse => response !== null));
  });
}

/** Aceita ou recusa um pedido de sessão. Ao aceitar, cria a sessão confirmada que alimenta a
 * agenda de ambos os participantes. As duas escritas vão no mesmo batch: ou aceitam o pedido E
 * criam a sessão, ou nenhuma das duas acontece - nunca fica um pedido "accepted" sem sessão. */
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
      subject: request.subject ?? '',
      date: request.date,
      time: request.time,
      modality: request.modality,
      status: 'scheduled',
      createdAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/** Só o tutor pode terminar a sessão (ver firestore.rules) - marca-a como concluída, o que
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
          subject: data.subject ?? '',
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
 * O que vale a pena fixar aqui: "dada" é uma sessão **concluída** em que eu era o tutor. Uma
 * sessão marcada e ainda por acontecer não é uma sessão dada - é uma sessão por vir, e tem o seu
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
