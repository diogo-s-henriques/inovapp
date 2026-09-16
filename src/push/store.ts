import { create } from 'zustand';

import type { PushPermission } from '@/lib/push';

interface PushState {
  /** O que o sistema diz sobre os avisos; `null` enquanto não se sabe. */
  permission: PushPermission | null;
  /** "Não quero avisos", decidido nas Definições (ver src/lib/push.ts). */
  optedOut: boolean;
  /**
   * Este dispositivo ficou **mesmo** registado. Existe para a permissão dada não ser confundida
   * com o registo feito: sem token (credenciais FCM em falta) a permissão está dada e não há aviso
   * nenhum — e dizer "recebes um aviso" era mentir. `null` é "ainda não se sabe".
   */
  registered: boolean | null;
  setPushState: (state: {
    permission?: PushPermission | null;
    optedOut?: boolean;
    registered?: boolean | null;
  }) => void;
  reset: () => void;
}

/**
 * Estado dos avisos, partilhado por quem **regista** (o `usePushSync`, no layout da raiz) e quem
 * **mostra** (a secção das Definições). Sem isto, as Definições teriam de voltar a perguntar as
 * mesmas coisas ao sistema e podiam mostrar um estado diferente do que está registado.
 *
 * É o mesmo desenho do `src/auth/store.ts`: um `create` do Zustand, preenchido por um hook.
 */
export const usePushStore = create<PushState>((set) => ({
  permission: null,
  optedOut: false,
  registered: null,
  setPushState: ({ permission, optedOut, registered }) =>
    set((state) => ({
      permission: permission === undefined ? state.permission : permission,
      optedOut: optedOut === undefined ? state.optedOut : optedOut,
      registered: registered === undefined ? state.registered : registered,
    })),
  // Ao sair da conta: o estado não é de ninguém em particular, mas mostrá-lo a quem entra a seguir
  // era dizer-lhe o que o anterior tinha escolhido.
  reset: () => set({ permission: null, optedOut: false, registered: null }),
}));
