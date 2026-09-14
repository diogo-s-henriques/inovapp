import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { canLearn } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth/store';
import { getInitials } from '@/lib/initials';
import { subscribeToConversations } from '@/lib/chat';
import { fetchConnectedMentors } from '@/lib/matching';
import { subscribePendingConnectionRequests } from '@/lib/requests';
import { dismissSessionRating, getDismissedSessionIds, hasRatingForSession, submitRating } from '@/lib/ratings';
import { subscribePendingSessionRequests, subscribeToSessions } from '@/lib/sessions';
import { dateLocaleTag, toDateKey } from '@/lib/time';
import { useLocaleStore, type Locale } from '@/i18n/store';
import type { Translations } from '@/i18n/translations';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EvaluationModal } from '@/components/domain/EvaluationModal';
import { ExtrasGrid } from '@/components/domain/ExtrasGrid';
import { HomeHeader } from '@/components/domain/HomeHeader';
import { NextSessionCard } from '@/components/domain/NextSessionCard';
import { TutorCard } from '@/components/domain/TutorCard';
import type { MatchCandidate } from '@/types/match';
import type { AgendaSession } from '@/types/session';
import type { NewRatingData } from '@/types/rating';

function formatScheduleLabel(dateKey: string, time: string, i18n: Translations, locale: Locale): string {
  const date = new Date(`${dateKey}T00:00:00`);
  const dayLabel =
    dateKey === toDateKey(new Date())
      ? i18n.common.today
      : date.toLocaleDateString(dateLocaleTag(locale), { day: '2-digit', month: 'short' });
  return `${dayLabel}, ${time}`;
}

// Ecrã inicial: próxima sessão, sugestões de mentores e o gate de avaliação pós-sessão.
export default function HomeScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const participationMode = useAuthStore((state) => state.profile?.participationMode);
  const firstName = user?.fullName?.trim().split(' ')[0] ?? '';
  const initials = getInitials(user?.fullName ?? '');
  const [pendingConnectionRequests, setPendingConnectionRequests] = useState(0);
  const [pendingSessionRequests, setPendingSessionRequests] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState(0);
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [pendingRating, setPendingRating] = useState<AgendaSession | null>(null);
  const [connectedMentors, setConnectedMentors] = useState<MatchCandidate[]>([]);

  // "Mentores para ti" só faz sentido para quem procura mentor (Tutorando ou Ambos); mostra os
  // mentores com quem já existe uma conexão aceite, não sugestões de estranhos (isso é o Matches).
  // A visibilidade da secção também depende de canLearn() na renderização, por isso não é preciso
  // limpar o estado aqui quando bloqueado — só evitar a leitura ao Firestore.
  useEffect(() => {
    if (!user || !canLearn(participationMode)) return;
    let cancelled = false;
    fetchConnectedMentors(user.uid).then((mentors) => {
      if (!cancelled) setConnectedMentors(mentors);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, participationMode]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribePendingConnectionRequests(user.uid, (requests) => setPendingConnectionRequests(requests.length));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribePendingSessionRequests(user.uid, (requests) => setPendingSessionRequests(requests.length));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (conversations) =>
      setUnreadConversations(conversations.filter((conversation) => conversation.unread).length),
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // O sino conta tudo o que o ecrã de notificações apresenta como pendente: pedidos de conexão,
  // pedidos de sessão e mensagens por ler (antes contava só os pedidos de conexão).
  const unreadNotifications = pendingConnectionRequests + pendingSessionRequests + unreadConversations;

  useEffect(() => {
    if (!user) return;
    return subscribeToSessions(user.uid, setSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Procura, entre as sessões passadas em que o utilizador foi tutorando, a mais antiga
  // que ainda não foi avaliada nem dispensada, para pedir a avaliação ao abrir o ecrã. Conta
  // tanto as que já passaram da hora agendada como as que o mentor terminou manualmente antes
  // disso (status 'completed').
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const nowKey = `${toDateKey(new Date())}T${new Date().toTimeString().slice(0, 5)}`;
      const pastAsStudent = sessions
        .filter(
          (session) =>
            session.role === 'student' && (session.status === 'completed' || `${session.date}T${session.time}` < nowKey),
        )
        .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

      const dismissed = await getDismissedSessionIds();
      if (cancelled) return;

      for (const session of pastAsStudent) {
        if (dismissed.includes(session.id)) continue;
        const rated = await hasRatingForSession(session.id);
        if (cancelled) return;
        if (!rated) {
          setPendingRating(session);
          return;
        }
      }
      if (!cancelled) setPendingRating(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessions, user]);

  const handleSubmitRating = async (data: NewRatingData) => {
    if (!pendingRating) return;
    await submitRating(pendingRating.id, pendingRating.otherUid, data);
    setPendingRating(null);
  };

  const handleSkipRating = async () => {
    if (!pendingRating) return;
    await dismissSessionRating(pendingRating.id);
    setPendingRating(null);
  };

  const nowKey = `${toDateKey(new Date())}T${new Date().toTimeString().slice(0, 5)}`;
  // Uma sessão terminada pelo mentor antes da hora marcada deixa de contar como "próxima
  // sessão", mesmo que a hora agendada ainda não tenha passado.
  const upcomingSessions = sessions.filter(
    (session) => session.status !== 'completed' && `${session.date}T${session.time}` >= nowKey,
  );
  const nextSession = upcomingSessions[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHeader
          name={firstName}
          initials={initials}
          photoUri={user?.photoUri}
          unreadNotifications={unreadNotifications}
          onPressNotifications={() => router.push('/notifications')}
        />

        {nextSession && (
          <NextSessionCard
            tutorName={`${nextSession.firstName} ${nextSession.lastName}`}
            subject={nextSession.subject}
            schedule={formatScheduleLabel(nextSession.date, nextSession.time, i18n, locale)}
            // A videochamada não existe nesta versão: em vez de um botão que não faz nada,
            // diz-se o que se passa e o que fazer em alternativa (combinar pelo chat).
            onPressJoin={() => Alert.alert(i18n.common.callUnavailableTitle, i18n.common.callUnavailableBody)}
          />
        )}

        <ExtrasGrid
          sessionsCount={upcomingSessions.length}
          onPressSessions={() => router.push('/sessions')}
          onPressSubjects={() => router.push('/materials')}
        />

        {canLearn(participationMode) && connectedMentors.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={i18n.home.tutorsForYou} actionLabel={i18n.common.seeAll} onPressAction={() => {}} />
            <View style={styles.tutorList}>
              {connectedMentors.map((mentor) => (
                <TutorCard
                  key={mentor.id}
                  firstName={mentor.firstName}
                  lastName={mentor.lastName}
                  course={mentor.course}
                  year={mentor.year}
                  image={mentor.image}
                  onPress={() => router.push({ pathname: '/profile/[id]', params: { id: mentor.id } })}
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {pendingRating && (
        <EvaluationModal
          key={pendingRating.id}
          visible
          mentorFirstName={pendingRating.firstName}
          mentorLastName={pendingRating.lastName}
          mentorImage={pendingRating.image}
          subject={pendingRating.subject}
          scheduleLabel={formatScheduleLabel(pendingRating.date, pendingRating.time, i18n, locale)}
          onSubmit={handleSubmitRating}
          onSkip={handleSkipRating}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: 120,
  },
  section: {
    gap: Spacing.three,
  },
  tutorList: {
    gap: Spacing.two,
  },
});
