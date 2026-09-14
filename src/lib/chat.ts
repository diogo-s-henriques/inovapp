import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  FirestoreError,
  getDoc,
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

/** Ouve as conversas do utilizador em tempo real, já resolvidas com o perfil do outro participante. */
export function subscribeToConversations(uid: string, onChange: (conversations: Conversation[]) => void) {
  const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
  const resolveOtherProfile = createProfileResolver();
  const i18n = getTranslations();
  let latestRequestId = 0;

  return onSnapshot(conversationsQuery, async (snapshot) => {
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
        return { conversation, sortMillis: orderTimestamp?.toMillis() ?? 0 };
      }),
    );

    // Uma subscrição async pode resolver fora de ordem (ex.: cache miss vs. cache hit); só a
    // resolução mais recente deve atualizar o estado, para não sobrepor dados frescos com antigos.
    if (requestId !== latestRequestId) return;
    onChange(resolved.sort((a, b) => b.sortMillis - a.sortMillis).map((entry) => entry.conversation));
  });
}

/** Ouve as mensagens de uma conversa em tempo real, por ordem cronológica. */
export function subscribeToMessages(conversationId: string, uid: string, onChange: (messages: ChatMessage[]) => void) {
  const messagesQuery = query(collection(db, 'conversations', conversationId, 'messages'), orderBy('createdAt', 'asc'));

  return onSnapshot(messagesQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as MessageDoc;
        return {
          id: docSnap.id,
          text: data.text,
          fromMe: data.senderId === uid,
          time: formatTimeLabel(data.createdAt?.toDate()) || getTranslations().common.now,
          attachment: data.attachment,
          sessionRequest: data.sessionRequest,
        };
      }),
    );
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
