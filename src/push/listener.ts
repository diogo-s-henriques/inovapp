import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';

import { useAuthStore } from '@/auth/store';
import { syncPushRegistration } from '@/push/actions';
import { usePushStore } from '@/push/store';

/**
 * Onde o ecrã deve ir quando se toca num aviso. O aviso traz o destino nos dados (`data.url`),
 * escrito por quem o enviou, e é por isso que é um campo: um aviso de "pedido de conexão" tem de
 * abrir os pedidos, e um de "sessão marcada" a agenda — a app não pode adivinhar qual é qual.
 * Sem destino, vai para as Notificações, que é onde as duas coisas já aparecem.
 */
function redirectToTarget(notification: Notifications.Notification): void {
  const url = notification.request.content.data?.url;
  router.push((typeof url === 'string' ? url : '/notifications') as Href);
}

/**
 * Regista este dispositivo para receber avisos — uma vez por conta e por arranque.
 *
 * Só quando o perfil está completo: pedir a permissão de avisos no instante a seguir ao login é
 * pedi-la antes de a pessoa ter visto para que serve a app, e um pedido recusado não se repete.
 */
export function usePushSync(): void {
  const user = useAuthStore((state) => state.user);
  const profileCompleted = useAuthStore((state) => state.profileCompleted);
  const uid = user?.uid;
  const ready = !!uid && profileCompleted === true;

  useEffect(() => {
    if (!ready || !uid) return;
    void syncPushRegistration(uid, { ask: true });
  }, [ready, uid]);

  useEffect(() => {
    if (!user) usePushStore.getState().reset();
  }, [user]);
}

/**
 * Trata do toque num aviso: com a app **fechada** (o aviso que a abriu) e com a app aberta.
 *
 * `ready` evita o pior caso: com a sessão ainda por ler, um `router.push` para um ecrã protegido
 * era ignorado e o toque no aviso não levava a lado nenhum — ou seja, a app abria no sítio errado e
 * sem o pedido que a pessoa tinha ido ver.
 */
export function useNotificationObserver(ready: boolean): void {
  useEffect(() => {
    if (!ready) return;

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) redirectToTarget(lastResponse.notification);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirectToTarget(response.notification);
    });

    return () => subscription.remove();
  }, [ready]);
}
