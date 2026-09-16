import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { canLearn } from '@/constants/profile';
import { useAuthStore } from '@/auth/store';
import { fetchRecentActivity } from '@/lib/activity';
import { retryConversations } from '@/lib/chat';
import { fetchExcludedCandidateIds, fetchMentorCandidates } from '@/lib/matching';
import { subscribeToSharedMaterials } from '@/lib/materials';
import { goBack } from '@/lib/navigation';
import { dateLocaleTag, formatTimeAgo } from '@/lib/time';
import { retryPendingConnectionRequests, subscribeToAcceptedConnectionRequests } from '@/lib/requests';
import type { ConnectionResponse } from '@/lib/requests';
import { respondToSessionRequest, retryPendingSessionRequests } from '@/lib/sessions';
import { useConnectionRequests } from '@/hooks/use-connection-requests';
import { useConversations } from '@/hooks/use-conversations';
import { useSessionRequests } from '@/hooks/use-session-requests';
import type { SessionRequest } from '@/types/session';
import type { Conversation } from '@/types/chat';
import type { ActivityItem } from '@/types/activity';
import type { SharedMaterial } from '@/types/material';
import { useLocaleStore } from '@/i18n/store';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ACTIVITY_ITEM_ICON, ActivityListItem } from '@/components/domain/ActivityListItem';
import { ConversationItem } from '@/components/domain/ConversationItem';
import { RequestCard } from '@/components/domain/RequestCard';
import { TutorCard } from '@/components/domain/TutorCard';
import { StackHeader } from '@/components/domain/StackHeader';
import { RetryNotice } from '@/components/ui/RetryNotice';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import type { MatchCandidate } from '@/types/match';

/** Sugestões mostradas no fim da lista - um resumo, não um deck: ver todos é nos Matches. */
const SUGGESTIONS_LIMIT = 3;

/** Entradas no histórico "Recentes", no máximo (as três fontes juntas). */
const RECENT_LIMIT = 8;

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
  const participationMode = useAuthStore((state) => state.profile?.participationMode);
  const learningSubjects = useAuthStore((state) => state.profile?.learningSubjects ?? []);
  const [suggestions, setSuggestions] = useState<MatchCandidate[]>([]);
  const { requests: connectionRequests, error: connectionRequestsError } = useConnectionRequests();
  const { requests: sessionRequests, error: sessionRequestsError } = useSessionRequests();
  // A mesma leitura partilhada que a barra de baixo, a Home e o Chat usam (ver useConversations).
  const { conversations, error: conversationsError } = useConversations();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  // As respostas aos pedidos que **eu** enviei, ao vivo (ver `subscribeToAcceptedConnectionRequests`):
  // o histórico é uma leitura pontual, e quem pede só sabia da resposta ao voltar a este ecrã.
  const [responses, setResponses] = useState<ConnectionResponse[]>([]);
  const [sharedMaterials, setSharedMaterials] = useState<SharedMaterial[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToAcceptedConnectionRequests(user.uid, setResponses);
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

  // A descoberta vive nos Matches e na pesquisa; isto é a mesma lista, em resumo, para quem abre
  // este ecrã sem lá passar. Mesmo filtro de exclusões (quem já tem um pedido connosco ou um
  // bloqueio não aparece), e uma falha aqui não pode estragar o resto: este ecrã é feito de avisos
  // e um aviso a menos é melhor do que um ecrã de erro.
  useEffect(() => {
    if (!user || !canLearn(participationMode)) return;
    let cancelled = false;

    (async () => {
      try {
        const excludeIds = await fetchExcludedCandidateIds(user.uid);
        if (cancelled) return;
        const candidates = await fetchMentorCandidates({ currentUid: user.uid, learningSubjects, excludeIds });
        if (!cancelled) setSuggestions(candidates.slice(0, SUGGESTIONS_LIMIT));
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, participationMode]);

  const unreadConversations = conversations.filter((conversation) => conversation.unread);

  // O histórico "Recentes" junta três fontes: o que **já aconteceu** (uma leitura pontual, que
  // traz os pedidos de sessão aceites e as sessões de amanhã), o que **acabou de acontecer do outro
  // lado** (as respostas aos pedidos que eu enviei, ao vivo) e os materiais recebidos (também ao
  // vivo, reaproveitados da secção de Materiais).
  //
  // As respostas aparecem duas vezes - uma da leitura pontual, outra da subscrição - e é de
  // propósito: a primeira traz o histórico antigo e a segunda o instante. O que as junta é o **id**,
  // `connection-{id}` nos dois lados, por isso o mapa fica com uma só entrada: a última a entrar, que
  // é a ao vivo.
  const responseItems: ActivityItem[] = responses.map((response) => ({
    id: `connection-${response.id}`,
    kind: 'connection-accepted',
    title: i18n.notifications.requestAcceptedTitle,
    description: i18n.notifications.connectionAccepted(response.candidate.firstName),
    timestamp: response.respondedAt,
  }));

  const materialItems: ActivityItem[] = sharedMaterials
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
    );

  const recentById = new Map<string, ActivityItem>();
  for (const item of [...activity, ...responseItems, ...materialItems]) recentById.set(item.id, item);
  const recentItems = [...recentById.values()]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, RECENT_LIMIT);

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
    connectionRequestsError ||
    sessionRequestsError ||
    conversationsError ||
    connectionRequests.length > 0 ||
    sessionRequests.length > 0 ||
    unreadConversations.length > 0 ||
    recentItems.length > 0 ||
    suggestions.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StackHeader
        title={i18n.notifications.title}
        backLabel={i18n.notifications.back}
        onBack={() => goBack(router)}
      />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {error && (
          <ThemedText type="small" themeColor="danger" style={styles.errorText}>
            {error}
          </ThemedText>
        )}

        {/* As duas leituras vivas que este ecrã mostra. Sem estes avisos, "não tens pedidos" e
            "não consegui ver os teus pedidos" davam o mesmo ecrã - e é este ecrã que decide
            aceitar/recusar. */}
        {sessionRequestsError && (
          <RetryNotice
            message={i18n.sessions.loadError}
            onRetry={retryPendingSessionRequests}
            style={styles.errorText}
          />
        )}
        {connectionRequestsError && (
          <RetryNotice
            message={i18n.requests.loadError}
            onRetry={retryPendingConnectionRequests}
            style={styles.errorText}
          />
        )}
        {conversationsError && (
          <RetryNotice
            message={i18n.chatList.loadError}
            onRetry={retryConversations}
            style={styles.errorText}
          />
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
            {/* O aviso abre o ecrã dos pedidos, e não a aba dos Matches: um separador não se
                empilha, e quem entra por aqui tem de poder voltar com o gesto do iOS. A decisão
                (aceitar/recusar) é a mesma lista nos dois sítios - é o mesmo componente. */}
            <View style={styles.recentList}>
              {connectionRequests.map((request) => (
                <Pressable
                  key={request.id}
                  onPress={() => router.push('/connection-requests')}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.notifications.connectionRequestTitle}>
                  <ActivityListItem
                    icon="person-add-outline"
                    iconColor="textPrimary"
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
                const iconInfo = ACTIVITY_ITEM_ICON[item.kind];
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

        {suggestions.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              title={i18n.notifications.suggestionsLabel}
              actionLabel={i18n.common.seeAll}
              onPressAction={() => router.push('/matches')}
            />
            <ThemedText type="small" themeColor="textMuted" style={styles.sectionHint}>
              {i18n.notifications.suggestionsHint}
            </ThemedText>
            <View style={styles.recentList}>
              {suggestions.map((candidate) => (
                <TutorCard
                  key={candidate.id}
                  firstName={candidate.firstName}
                  lastName={candidate.lastName}
                  course={candidate.course}
                  year={candidate.year}
                  image={candidate.image}
                  onPress={() => router.push({ pathname: '/profile/[id]', params: { id: candidate.id } })}
                />
              ))}
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
