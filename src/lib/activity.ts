import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import { createProfileResolver } from '@/lib/matching';
import { toDateKey } from '@/components/domain/CalendarMonth';
import type { Translations } from '@/i18n/translations';
import type { ActivityItem } from '@/types/activity';

const RECENT_LIMIT = 8;

/**
 * Histórico "Recentes" nas notificações — não existe uma coleção de notificações no Firestore;
 * deriva-se, num único fetch, de dados já existentes (pedidos aceites, sessões de amanhã). Os
 * materiais recebidos ficam fora daqui de propósito — já vêm de subscribeToSharedMaterials
 * (lib/materials.ts), que o ecrã de notificações já subscreve para a secção "Mensagens".
 */
export async function fetchRecentActivity(uid: string, i18n: Translations): Promise<ActivityItem[]> {
  const resolveProfile = createProfileResolver();
  const items: ActivityItem[] = [];

  const [connectionsSnap, sessionRequestsSnap, sessionsSnap] = await Promise.all([
    getDocs(query(collection(db, 'connectionRequests'), where('from', '==', uid), where('status', '==', 'accepted'))),
    getDocs(query(collection(db, 'sessionRequests'), where('from', '==', uid), where('status', '==', 'accepted'))),
    getDocs(query(collection(db, 'sessions'), where('participants', 'array-contains', uid))),
  ]);

  for (const docSnap of connectionsSnap.docs) {
    const data = docSnap.data();
    const respondedAt = data.respondedAt?.toDate();
    if (!respondedAt) continue;
    const profile = await resolveProfile(data.to);
    items.push({
      id: `connection-${docSnap.id}`,
      kind: 'connection-accepted',
      title: i18n.notifications.requestAcceptedTitle,
      description: i18n.notifications.connectionAccepted(profile?.firstName ?? i18n.common.user),
      timestamp: respondedAt,
    });
  }

  for (const docSnap of sessionRequestsSnap.docs) {
    const data = docSnap.data();
    const respondedAt = data.respondedAt?.toDate();
    if (!respondedAt) continue;
    const profile = await resolveProfile(data.to);
    items.push({
      id: `session-request-${docSnap.id}`,
      kind: 'session-accepted',
      title: i18n.notifications.requestAcceptedTitle,
      description: i18n.notifications.sessionAccepted(profile?.firstName ?? i18n.common.user, data.subject),
      timestamp: respondedAt,
    });
  }

  const tomorrowKey = toDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
  for (const docSnap of sessionsSnap.docs) {
    const data = docSnap.data();
    if (data.date !== tomorrowKey) continue;
    const otherUid = (data.participants as string[]).find((id: string) => id !== uid);
    if (!otherUid) continue;
    const profile = await resolveProfile(otherUid);
    items.push({
      id: `session-tomorrow-${docSnap.id}`,
      kind: 'session-tomorrow',
      title: i18n.notifications.sessionTomorrowTitle,
      description: i18n.notifications.sessionTomorrow(data.subject, profile?.firstName ?? i18n.common.user, data.time),
      // Sem uma hora de criação real de "lembrete", usa-se agora — o que importa é aparecer
      // no topo da lista enquanto a sessão continuar marcada para amanhã.
      timestamp: new Date(),
    });
  }

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, RECENT_LIMIT);
}
