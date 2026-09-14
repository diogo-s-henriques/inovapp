import { useEffect, useState, type ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing, type ColorToken } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { fetchRecentActivity } from '@/lib/activity';
import { subscribeToConversations } from '@/lib/chat';
import { subscribeToSharedMaterials } from '@/lib/materials';
import { goBack } from '@/lib/navigation';
import { dateLocaleTag, formatTimeAgo } from '@/lib/time';
import { subscribePendingConnectionRequests } from '@/lib/requests';
import type { ConnectionRequest } from '@/lib/requests';
import { respondToSessionRequest, subscribePendingSessionRequests } from '@/lib/sessions';
import type { SessionRequest } from '@/types/session';
import type { Conversation } from '@/types/chat';
import type { ActivityItem, ActivityKind } from '@/types/activity';
import type { SharedMaterial } from '@/types/material';
import { useLocaleStore } from '@/i18n/store';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ActivityListItem } from '@/components/domain/ActivityListItem';
import { ConversationItem } from '@/components/domain/ConversationItem';
import { RequestCard } from '@/components/domain/RequestCard';
import { ThemedText } from '@/components/ui/ThemedText';

const ACTIVITY_ICON: Record<ActivityKind, { icon: ComponentProps<typeof Ionicons>['name']; color: ColorToken; background: ColorToken }> = {
  'connection-accepted': { icon: 'checkmark-circle', color: 'success', background: 'successSoft' },
  'session-accepted': { icon: 'checkmark-circle', color: 'success', background: 'successSoft' },
  'session-tomorrow': { icon: 'calendar-outline', color: 'primary', background: 'primarySoft' },
  'material-received': { icon: 'document-text-outline', color: 'textMuted', background: 'surfaceAlt' },
};

function formatDateShort(dateKey: string, locale: 'pt' | 'en'): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(dateLocaleTag(locale), { day: '2-digit', month: 'short' });
}

// Lista os pedidos de sessão e de conexão pendentes, agrupados por tipo.
export default function NotificationsScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([]);
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [sharedMaterials, setSharedMaterials] = useState<SharedMaterial[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribePendingConnectionRequests(user.uid, setConnectionRequests);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribePendingSessionRequests(user.uid, setSessionRequests);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, setConversations);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    fetchRecentActivity(user.uid, i18n).then(setActivity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, i18n]);

  useEffect(() => {
    if (!user) return;
    return subscribeToSharedMaterials(user.uid, setSharedMaterials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const unreadConversations = conversations.filter((conversation) => conversation.unread);

  // Junta os "Pedido aceite"/"Sessão amanhã" (fetch único) com os materiais recebidos (já vêm
  // ao vivo de subscribeToSharedMaterials, reaproveitado da secção de Materiais).
  const recentItems: ActivityItem[] = [
    ...activity,
    ...sharedMaterials
      .filter((material) => !material.fromMe)
      .slice(0, 5)
      .map(
        (material): ActivityItem => ({
          id: `material-${material.id}`,
          kind: 'material-received',
          title: i18n.notifications.newMaterialTitle,
          description: i18n.notifications.materialReceived(`${material.otherFirstName} ${material.otherLastName}`, material.fileName),
          timestamp: material.createdAt ?? new Date(0),
        }),
      ),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 8);

  const handleOpenConversation = (conversation: Conversation) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conversation.id,
        firstName: conversation.firstName,
        lastName: conversation.lastName,
        role: conversation.role,
        subject: conversation.subject,
        image: conversation.image ?? '',
      },
    });
  };

  const handleRespondSession = async (request: SessionRequest, accept: boolean) => {
    if (!user) return;
    setRespondingId(request.id);
    setError(null);
    try {
      await respondToSessionRequest(request, user.uid, accept);
    } catch {
      setError(i18n.notifications.respondError);
    } finally {
      setRespondingId(null);
    }
  };

  const hasAny =
    connectionRequests.length > 0 || sessionRequests.length > 0 || unreadConversations.length > 0 || recentItems.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack(router)} accessibilityRole="button" accessibilityLabel={i18n.notifications.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <ThemedText type="title">{i18n.notifications.title}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {error && (
          <ThemedText type="small" themeColor="danger" style={styles.errorText}>
            {error}
          </ThemedText>
        )}

        {sessionRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionLabel}>
                {i18n.notifications.sessionRequestsLabel}
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <ThemedText type="small" themeColor="onPrimary">
                  {sessionRequests.length}
                </ThemedText>
              </View>
            </View>
            {sessionRequests.map((request) => (
              <RequestCard
                key={request.id}
                firstName={request.firstName}
                lastName={request.lastName}
                subtitle={`${request.subject} · ${formatDateShort(request.date, locale)}, ${request.time} · ${request.modality}`}
                message={request.message || undefined}
                timeAgo={request.createdAt ? formatTimeAgo(request.createdAt, i18n.common.now) : undefined}
                image={request.image}
                busy={respondingId === request.id}
                onAccept={() => handleRespondSession(request, true)}
                onDecline={() => handleRespondSession(request, false)}
                style={styles.card}
              />
            ))}
          </View>
        )}

        {connectionRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionLabel}>
                {i18n.requests.connectionLabel}
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <ThemedText type="small" themeColor="onPrimary">
                  {connectionRequests.length}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionHint}>
              {i18n.notifications.connectionRequestHint}
            </ThemedText>
            {/* Só o aviso: aceitar/recusar é nos Matches, para não haver duas listas a decidir
                o mesmo pedido (e para a decisão viver onde está o resto dos matchs). */}
            <View style={styles.recentList}>
              {connectionRequests.map((request) => (
                <Pressable
                  key={request.id}
                  onPress={() => router.push('/matches')}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.notifications.connectionRequestTitle}>
                  <ActivityListItem
                    icon="person-add"
                    iconColor="primary"
                    iconBackground="primarySoft"
                    title={i18n.notifications.connectionRequestTitle}
                    description={i18n.notifications.connectionRequestAnnouncement(
                      `${request.candidate.firstName} ${request.candidate.lastName}`.trim(),
                    )}
                    timeAgo={request.createdAt ? formatTimeAgo(request.createdAt, i18n.common.now) : ''}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {unreadConversations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionLabel}>
                {i18n.notifications.messagesLabel}
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <ThemedText type="small" themeColor="onPrimary">
                  {unreadConversations.length}
                </ThemedText>
              </View>
            </View>
            {unreadConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                firstName={conversation.firstName}
                lastName={conversation.lastName}
                role={conversation.role}
                subject={conversation.subject}
                lastMessage={conversation.lastMessage}
                timeLabel={conversation.timeLabel}
                unread={conversation.unread}
                image={conversation.image}
                onPress={() => handleOpenConversation(conversation)}
              />
            ))}
          </View>
        )}

        {recentItems.length > 0 && (
          <View style={styles.section}>
            <ThemedText type="smallBold" themeColor="textMuted" style={[styles.sectionLabel, styles.recentLabel]}>
              {i18n.notifications.recentLabel}
            </ThemedText>
            <View style={styles.recentList}>
              {recentItems.map((item) => {
                const iconInfo = ACTIVITY_ICON[item.kind];
                return (
                  <ActivityListItem
                    key={item.id}
                    icon={iconInfo.icon}
                    iconColor={iconInfo.color}
                    iconBackground={iconInfo.background}
                    title={item.title}
                    description={item.description}
                    timeAgo={formatTimeAgo(item.timestamp, i18n.common.now)}
                  />
                );
              })}
            </View>
          </View>
        )}

        {!hasAny && (
          <ThemedText themeColor="textMuted" style={styles.empty}>
            {i18n.notifications.empty}
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  list: {
    paddingHorizontal: Spacing.five,
    paddingBottom: 120,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  recentLabel: {
    marginBottom: Spacing.three,
  },
  sectionHint: {
    marginBottom: Spacing.three,
  },
  recentList: {
    gap: Spacing.two,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  card: {
    marginBottom: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
  errorText: {
    marginBottom: Spacing.three,
  },
});
