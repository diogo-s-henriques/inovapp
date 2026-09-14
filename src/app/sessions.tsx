import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { goBack } from '@/lib/navigation';
import { completeSession, subscribeToSessions } from '@/lib/sessions';
import { dateLocaleTag, toDateKey } from '@/lib/time';
import { useLocaleStore } from '@/i18n/store';
import type { Translations } from '@/i18n/translations';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { CalendarMonth } from '@/components/domain/CalendarMonth';
import { SessionListItem } from '@/components/domain/SessionListItem';
import { ThemedText } from '@/components/ui/ThemedText';
import type { AgendaSession } from '@/types/session';

function formatDayHeading(dateKey: string, i18n: Translations, locale: 'pt' | 'en'): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (dateKey === toDateKey(new Date())) {
    return `${i18n.common.today}, ${date.toLocaleDateString(dateLocaleTag(locale), { day: '2-digit', month: 'short' })}`;
  }
  return date.toLocaleDateString(dateLocaleTag(locale), { weekday: 'short', day: '2-digit', month: 'short' });
}

// Agenda de sessões aceites, navegável por mês e filtrada por dia selecionado.
export default function SessionsScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [completeError, setCompleteError] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToSessions(user.uid, setSessions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleComplete = async (sessionId: string) => {
    setCompletingId(sessionId);
    setCompleteError(false);
    try {
      await completeSession(sessionId);
    } catch {
      setCompleteError(true);
    } finally {
      setCompletingId(null);
    }
  };

  const markedDates = useMemo(() => new Set(sessions.map((session) => session.date)), [sessions]);
  const sessionsForDay = useMemo(
    () => sessions.filter((session) => session.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
    [sessions, selectedDate],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack(router)} accessibilityRole="button" accessibilityLabel={i18n.sessions.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <ThemedText type="title">{i18n.sessions.title}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <CalendarMonth
          month={month}
          onChangeMonth={setMonth}
          markedDates={markedDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <View style={styles.dayHeader}>
          <ThemedText type="bodyBold">{formatDayHeading(selectedDate, i18n, locale)}</ThemedText>
          <ThemedText type="smallBold" themeColor="primary">
            {i18n.sessions.sessionsCount(sessionsForDay.length)}
          </ThemedText>
        </View>

        {completeError && (
          <ThemedText type="small" themeColor="danger">
            {i18n.sessions.completeError}
          </ThemedText>
        )}

        {sessionsForDay.length > 0 ? (
          <View style={styles.list}>
            {sessionsForDay.map((session) => (
              <SessionListItem
                key={session.id}
                time={session.time}
                firstName={session.firstName}
                lastName={session.lastName}
                image={session.image}
                subject={session.subject}
                modality={session.modality}
                sessionRole={session.role}
                status={session.status}
                completing={completingId === session.id}
                onPressComplete={() => handleComplete(session.id)}
                // A videochamada não existe nesta versão — ver o mesmo aviso no ecrã inicial.
                onPressJoin={() => Alert.alert(i18n.common.callUnavailableTitle, i18n.common.callUnavailableBody)}
              />
            ))}
          </View>
        ) : (
          <ThemedText themeColor="textMuted" style={styles.empty}>
            {i18n.sessions.empty}
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
  content: {
    paddingHorizontal: Spacing.five,
    paddingBottom: 120,
    gap: Spacing.four,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  list: {
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
