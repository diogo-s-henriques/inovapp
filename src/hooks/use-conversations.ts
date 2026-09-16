import { useEffect, useState } from 'react';

import { useAuthStore } from '@/auth/store';
import { subscribeToConversations } from '@/lib/chat';
import type { ConversationsState } from '@/lib/chat';

const EMPTY: ConversationsState = { conversations: [], error: false };

/**
 * As conversas do utilizador, ao vivo.
 *
 * Existe para os ecrãs não repetirem o mesmo par `useState` + `useEffect`: eram quatro ecrãs a
 * escrever o mesmo efeito (a barra de baixo, a Home, o Chat, as Notificações) e cada um a abrir a
 * sua subscrição à mesma pergunta. A leitura é partilhada (ver `src/lib/live-query.ts`) — este hook
 * só diz quem está a ver.
 *
 * O `error` não é decoração: sem ele, uma leitura negada deixava a lista vazia, e uma lista vazia é
 * indistinguível de "não tens conversas". Quem mostra a lista tem de o dizer (ver `RetryNotice`).
 */
export function useConversations(): ConversationsState {
  const uid = useAuthStore((state) => state.user?.uid);
  const [state, setState] = useState<ConversationsState>(EMPTY);

  useEffect(() => {
    if (!uid) return;
    return subscribeToConversations(uid, setState);
  }, [uid]);

  // Sem sessão iniciada não há conversas para ver: é um valor **derivado**, e não um estado a
  // limpar dentro do efeito (que só provocava uma segunda passagem de render para escrever o mesmo).
  return uid ? state : EMPTY;
}
