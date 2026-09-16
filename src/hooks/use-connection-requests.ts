import { useEffect, useState } from 'react';

import { useAuthStore } from '@/auth/store';
import { subscribePendingConnectionRequests } from '@/lib/requests';
import type { ConnectionRequestsState } from '@/lib/requests';

const EMPTY: ConnectionRequestsState = { requests: [], error: false };

/**
 * Os pedidos de conexão pendentes que chegaram, ao vivo.
 *
 * Existe para os ecrãs não repetirem o mesmo par `useState` + `useEffect`: eram três ecrãs a
 * escrever o mesmo efeito (a barra de baixo, a Home, os Matches) e cada um a abrir a sua subscrição.
 * A leitura é partilhada (ver `src/lib/live-query.ts`) - este hook só diz quem está a ver.
 *
 * O `error` não é decoração: sem ele, uma leitura negada deixava a lista vazia, e uma lista vazia é
 * indistinguível de "não há pedidos". Quem o usa tem de o mostrar (ver `RetryNotice`).
 */
export function useConnectionRequests(): ConnectionRequestsState {
  const uid = useAuthStore((state) => state.user?.uid);
  const [state, setState] = useState<ConnectionRequestsState>(EMPTY);

  useEffect(() => {
    if (!uid) return;
    return subscribePendingConnectionRequests(uid, setState);
  }, [uid]);

  // Sem sessão iniciada não há pedidos para ver: é um valor **derivado**, e não um estado a limpar
  // dentro do efeito (que só provocava uma segunda passagem de render para escrever o mesmo).
  return uid ? state : EMPTY;
}
