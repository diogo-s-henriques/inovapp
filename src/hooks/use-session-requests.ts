import { useEffect, useState } from 'react';

import { useAuthStore } from '@/auth/store';
import { subscribePendingSessionRequests } from '@/lib/sessions';
import type { SessionRequestsState } from '@/lib/sessions';

const EMPTY: SessionRequestsState = { requests: [], error: false };

/**
 * Os pedidos de sessão pendentes que chegaram, ao vivo - o simétrico de `useConnectionRequests`,
 * e pela mesma razão: a Home conta-os e as Notificações mostram-nos, e eram duas subscrições
 * abertas para responder à mesma pergunta.
 */
export function useSessionRequests(): SessionRequestsState {
  const uid = useAuthStore((state) => state.user?.uid);
  const [state, setState] = useState<SessionRequestsState>(EMPTY);

  useEffect(() => {
    if (!uid) return;
    return subscribePendingSessionRequests(uid, setState);
  }, [uid]);

  // Ver o mesmo raciocínio em `use-connection-requests.ts`: sem sessão, o vazio é derivado.
  return uid ? state : EMPTY;
}
