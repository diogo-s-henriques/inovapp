import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  FirestoreError,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getLocale, getTranslations } from '@/i18n/store';
import { db } from '@/lib/firebase';
import { subscribeToBlockedPairs } from '@/lib/blocking';
import { createLiveQuery } from '@/lib/live-query';
import { createProfileResolver, matchId } from '@/lib/matching';
import { dateLocaleTag } from '@/lib/time';
import type { ChatAttachment, ChatMessage, ChatSessionRequestInfo, Conversation } from '@/types/chat';

interface ConversationDoc {
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  createdAt?: Timestamp;
  unreadFor?: string[];
}

interface MessageDoc {
  text: string;
  senderId: string;
  createdAt?: Timestamp;
  attachment?: ChatAttachment;
  sessionRequest?: ChatSessionRequestInfo;
}

function formatTimeLabel(date?: Date): string {
  if (!date) return '';
  const i18n = getTranslations();
  const localeTag = dateLocaleTag(getLocale());
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return i18n.common.yesterday;

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return date.toLocaleDateString(localeTag, { weekday: 'short' });
  return date.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit' });
}

export interface ConversationsState {
  conversations: Conversation[];
  /** true quando a última leitura falhou (regras negadas, rede em baixo). */
  error: boolean;
}

/**
 * As conversas do utilizador, já resolvidas com o perfil do outro participante, **ao vivo e
 * partilhadas por todos os ecrãs**.
 *
 * Conversas com quem tem um bloqueio connosco não entram: bloqueado quer dizer "inacessível para
 * os dois", e a mensagem mais recente de uma conversa cortada não deve continuar a aparecer no
 * topo da lista. Isto é filtro de cliente — a regra de `messages` é que impede mesmo ler ou
 * escrever, mas as regras não conseguem filtrar uma query ("rules are not filters"), por isso a
 * lista tem de ser escondida aqui.
 *
 * A subscrição é **uma só** (ver src/lib/live-query.ts). Esta pergunta era feita em paralelo pela
 * barra de baixo (a bolinha das mensagens por ler), pela Home (a contagem), pelo Chat (a lista) e
 * pelas Notificações — quatro subscrições abertas ao mesmo tempo com a mesma resposta, e cada
 * mensagem nova contada (e paga) quatro vezes. Quem chega depois recebe o que já se sabe.
 *
 * O terceiro argumento do `onSnapshot` — o canal do erro — também não existia: uma leitura negada
 * deixava a lista como estava, indistinguível de "não tens conversas". Agora é um campo do estado,
 * e quem mostra a lista tem de o dizer (ver `RetryNotice`).
 */
const conversationsLive = createLiveQuery<Conversation[]>({
  initial: [],
  open: (uid, onValue, onError) => {
    const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
    const resolveOtherProfile = createProfileResolver();
    const i18n = getTranslations();
    let latestRequestId = 0;
    let blockedUids = new Set<string>();
    // O `otherUid` fica guardado ao lado da conversa (em vez de ser deduzido do ID depois) para o
    // filtro não depender do formato do ID da conversa.
    let latestEntries: { conversation: Conversation; otherUid?: string }[] = [];

    const emit = () => {
      onValue(
        latestEntries
          .filter((entry) => !entry.otherUid || !blockedUids.has(entry.otherUid))
          .map((entry) => entry.conversation),
      );
    };

    const unsubscribeBlocks = subscribeToBlockedPairs(uid, (uids) => {
      blockedUids = uids;
      emit();
    });

    const unsubscribeConversations = onSnapshot(
      conversationsQuery,
      async (snapshot) => {
        const requestId = ++latestRequestId;
        const resolved = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as ConversationDoc;
            const otherUid = data.participants.find((id) => id !== uid);
            const profile = otherUid ? await resolveOtherProfile(otherUid) : null;
            const orderTimestamp = data.lastMessageAt ?? data.createdAt;

            const conversation: Conversation = {
              id: docSnap.id,
              firstName: profile?.firstName ?? i18n.common.user,
              lastName: profile?.lastName ?? '',
              role: profile?.role ?? '',
              subject: profile?.subjects[0] ?? '',
              image: profile?.image,
              lastMessage: data.lastMessage ?? i18n.chat.defaultLastMessage,
              timeLabel: formatTimeLabel(orderTimestamp?.toDate()),
              unread: data.unreadFor?.includes(uid) ?? false,
            };
            return { conversation, otherUid, sortMillis: orderTimestamp?.toMillis() ?? 0 };
          }),
        );

        // Uma subscrição async pode resolver fora de ordem (ex.: cache miss vs. cache hit); só a
        // resolução mais recente deve atualizar o estado, para não sobrepor dados frescos com antigos.
        if (requestId !== latestRequestId) return;
        latestEntries = resolved
          .sort((a, b) => b.sortMillis - a.sortMillis)
          .map(({ conversation, otherUid }) => ({ conversation, otherUid }));
        emit();
      },
      () => onError(),
    );

    return () => {
      unsubscribeBlocks();
      unsubscribeConversations();
    };
  },
});

/** Junta um ecrã à leitura das conversas. Ver `useConversations`, que é o que os ecrãs usam. */
export function subscribeToConversations(
  uid: string,
  onChange: (state: ConversationsState) => void,
): () => void {
  // O nome do campo muda (`value` na leitura viva, `conversations` aqui): quem chama lê o que a
  // lista é, e não o que a peça partilhada lhe chama.
  return conversationsLive.subscribe(uid, ({ value, error }) => onChange({ conversations: value, error }));
}

/** Segunda tentativa depois de uma leitura falhada (fecha a subscrição e abre outra). */
export function retryConversations(): void {
  conversationsLive.retry();
}

/** Quantas mensagens se leem de uma vez ao abrir uma conversa (ver src/app/chat/[id].tsx). */
export const CHAT_MESSAGE_PAGE_SIZE = 50;

/**
 * Ouve as mensagens de uma conversa em tempo real, por ordem cronológica. Só as últimas
 * `pageSize` são lidas: sem limite, abrir uma conversa antiga lia o histórico todo (todos os
 * meses de mensagens) em cada abertura. O ecrã pede uma página maior quando o utilizador quer
 * ver mensagens mais antigas.
 */
export function subscribeToMessages(
  conversationId: string,
  uid: string,
  onChange: (messages: ChatMessage[]) => void,
  pageSize: number = CHAT_MESSAGE_PAGE_SIZE,
) {
  const messagesQuery = query(
    collection(db, 'conversations', conversationId, 'messages'),
    // Descendente + limit traz as últimas N (e não as primeiras N); a lista é invertida logo
    // abaixo para ficar pela ordem cronológica que o ecrã mostra.
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as MessageDoc;
      return {
        id: docSnap.id,
        text: data.text,
        fromMe: data.senderId === uid,
        time: formatTimeLabel(data.createdAt?.toDate()) || getTranslations().common.now,
        attachment: data.attachment,
        sessionRequest: data.sessionRequest,
      };
    });

    onChange(messages.reverse());
  });
}

export async function sendMessage(
  conversationId: string,
  fromUid: string,
  toUid: string,
  text: string,
  attachment?: ChatAttachment,
): Promise<void> {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    text,
    senderId: fromUid,
    createdAt: serverTimestamp(),
    ...(attachment ? { attachment } : {}),
  });

  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: attachment ? `📎 ${attachment.fileName}` : text,
    lastMessageAt: serverTimestamp(),
    unreadFor: arrayUnion(toUid),
  });
}

/** Deixa um cartão de pedido de sessão na conversa (ver SessionRequestCard), com estado ao vivo
 * lido a partir de sessionRequests/{requestId} — não crítico, ver src/app/session-request.tsx. */
export async function sendSessionRequestMessage(
  conversationId: string,
  fromUid: string,
  toUid: string,
  sessionRequest: ChatSessionRequestInfo,
): Promise<void> {
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    text: '',
    senderId: fromUid,
    createdAt: serverTimestamp(),
    sessionRequest,
  });

  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: `📅 Pedido de sessão: ${sessionRequest.subject}`,
    lastMessageAt: serverTimestamp(),
    unreadFor: arrayUnion(toUid),
  });
}

/**
 * O Chat só desbloqueia depois de o pedido de conexão ser aceite (ver src/lib/requests.ts).
 * As regras do Firestore negam a leitura quando o documento ainda não existe (não está nos
 * `participants`), por isso um erro de permissão aqui é lido como "ainda não há conversa".
 */
export async function conversationExists(uidA: string, uidB: string): Promise<boolean> {
  try {
    const snapshot = await getDoc(doc(db, 'conversations', matchId(uidA, uidB)));
    return snapshot.exists();
  } catch (error) {
    // Só um permission-denied confirma "ainda não há conversa" (é assim que a regra do Firestore
    // nega a leitura de um documento que não existe); qualquer outro erro (rede, etc.) é real e
    // deve propagar-se em vez de ser lido como "não ligados".
    if ((error as FirestoreError)?.code === 'permission-denied') return false;
    throw error;
  }
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    unreadFor: arrayRemove(uid),
  });
}
