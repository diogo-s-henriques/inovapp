import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';

import { getTranslations } from '@/i18n/store';
import { db } from '@/lib/firebase';
import { createProfileResolver } from '@/lib/matching';
import type { SharedMaterial } from '@/types/material';

interface MessageWithAttachmentDoc {
  senderId: string;
  createdAt?: Timestamp;
  attachment?: { fileName: string; fileUrl: string };
}

// Os links são validados na origem (AttachFileSheet recusa o que não seja http/https, ver
// src/lib/url.ts) e outra vez ao abrir, em src/app/materials.tsx, porque o URL foi escrito por
// outro utilizador.

/** Mensagens lidas por conversa ao procurar anexos. Sem este limite, o ecrã de Materiais lia o
 * histórico completo de todas as conversas do utilizador. Custo: um material mais antigo do que
 * esta janela deixa de aparecer na lista (continua acessível dentro da conversa, onde é possível
 * carregar mensagens anteriores). */
const MESSAGES_PER_CONVERSATION_LIMIT = 50;

/**
 * Não existe uma coleção "materials" nem partilha "para todos" - um material é só um anexo
 * (ver AttachFileSheet) trocado numa conversa. Este ecrã agrega, em tempo real, os anexos de
 * todas as conversas do utilizador (enviados ou recebidos), ordenados do mais recente.
 *
 * Subscreve as conversas e, para cada uma, as suas mensagens - número de listeners proporcional
 * ao número de conversas do utilizador, que não se espera ser grande o suficiente para justificar
 * uma collection group query dedicada.
 */
export function subscribeToSharedMaterials(uid: string, onChange: (materials: SharedMaterial[]) => void): () => void {
  const conversationsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', uid));
  const resolveProfile = createProfileResolver();

  const messageUnsubscribes = new Map<string, () => void>();
  const materialsByConversation = new Map<string, SharedMaterial[]>();

  function emit() {
    const all = Array.from(materialsByConversation.values()).flat();
    all.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    onChange(all);
  }

  const unsubscribeConversations = onSnapshot(conversationsQuery, async (snapshot) => {
    const currentIds = new Set(snapshot.docs.map((docSnap) => docSnap.id));

    for (const [conversationId, unsubscribe] of messageUnsubscribes) {
      if (!currentIds.has(conversationId)) {
        unsubscribe();
        messageUnsubscribes.delete(conversationId);
        materialsByConversation.delete(conversationId);
      }
    }

    for (const docSnap of snapshot.docs) {
      const conversationId = docSnap.id;
      if (messageUnsubscribes.has(conversationId)) continue;

      const otherUid = (docSnap.data().participants as string[]).find((id) => id !== uid);
      if (!otherUid) continue;
      const profile = await resolveProfile(otherUid);

      const messagesQuery = query(
        collection(db, 'conversations', conversationId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(MESSAGES_PER_CONVERSATION_LIMIT),
      );
      const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
        const items: SharedMaterial[] = [];
        messagesSnapshot.forEach((messageDoc) => {
          const data = messageDoc.data() as MessageWithAttachmentDoc;
          if (!data.attachment) return;
          items.push({
            id: `${conversationId}_${messageDoc.id}`,
            conversationId,
            fileName: data.attachment.fileName,
            fileUrl: data.attachment.fileUrl,
            otherFirstName: profile?.firstName ?? getTranslations().common.user,
            otherLastName: profile?.lastName ?? '',
            otherImage: profile?.image,
            fromMe: data.senderId === uid,
            createdAt: data.createdAt?.toDate(),
          });
        });
        materialsByConversation.set(conversationId, items);
        emit();
      });
      messageUnsubscribes.set(conversationId, unsubscribeMessages);
    }
  });

  return () => {
    unsubscribeConversations();
    messageUnsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}
