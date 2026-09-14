import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { SUBJECT_OPTIONS } from '@/constants/profile';
import { useAuthStore } from '@/auth/store';
import { sendSessionRequestMessage } from '@/lib/chat';
import { fetchCandidateById, matchId } from '@/lib/matching';
import { goBack } from '@/lib/navigation';
import { sendSessionRequest } from '@/lib/sessions';
import { toDateKey } from '@/lib/time';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { CalendarMonth } from '@/components/domain/CalendarMonth';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import type { MatchCandidate } from '@/types/match';
import type { SessionModality } from '@/types/session';

const HOUR_OPTIONS = Array.from({ length: 14 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);
const MODALITY_OPTIONS: SessionModality[] = ['Online', 'Presencial'];

// Faixas horárias aproximadas de cada período de disponibilidade do perfil (ver
// src/constants/profile.ts PERIOD_OPTIONS) — "Fins de semana" fica de fora por não ser sobre
// horas, mas sobre dias da semana, que este formulário não filtra.
const PERIOD_HOUR_RANGES: Record<string, [number, number]> = {
  Manhãs: [8, 12],
  Tardes: [12, 18],
  'Fins de tarde': [18, 21],
};

function hourMatchesPeriods(hour: string, periods: string[]): boolean {
  const hourValue = Number(hour.split(':')[0]);
  return periods.some((period) => {
    const range = PERIOD_HOUR_RANGES[period];
    return range ? hourValue >= range[0] && hourValue < range[1] : false;
  });
}

/** Reordena as opções por relevância (mais pontos primeiro), sem excluir nenhuma — a ordem
 * original mantém-se entre opções com a mesma pontuação. */
function prioritizeBy<T>(options: T[], score: (option: T) => number): T[] {
  return options
    .map((option, index) => ({ option, index, score: score(option) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.option);
}

// Pedido de sessão a um mentor/tutorando específico; ao ser aceite, aparece na agenda.
export default function SessionRequestScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const myProfile = useAuthStore((state) => state.profile);
  const learningSubjects = useMemo(() => myProfile?.learningSubjects ?? [], [myProfile]);
  const myAvailabilityPeriods = useMemo(() => myProfile?.availabilityPeriods ?? [], [myProfile]);
  const myAvailabilityModality = useMemo(() => myProfile?.availabilityModality ?? [], [myProfile]);
  const { toUid, firstName, lastName } = useLocalSearchParams<{
    toUid: string;
    firstName?: string;
    lastName?: string;
  }>();

  const [recipient, setRecipient] = useState<MatchCandidate | null>();

  useEffect(() => {
    if (!toUid) return;
    let cancelled = false;
    fetchCandidateById(toUid).then((candidate) => {
      if (!cancelled) setRecipient(candidate);
    });
    return () => {
      cancelled = true;
    };
  }, [toUid]);

  // Só faz sentido pedir uma disciplina que o destinatário ensina; dentro dessas, dá prioridade
  // às que também estão nos interesses de quem pede — mas sem excluir as restantes, porque o
  // pedido de sessão pode partir de qualquer um dos dois lados (não só de quem está a aprender).
  const subjectOptions = useMemo(() => {
    const base = recipient?.subjects.length ? recipient.subjects : SUBJECT_OPTIONS;
    return prioritizeBy(base, (subject) => (learningSubjects.includes(subject) ? 1 : 0));
  }, [recipient, learningSubjects]);

  // Dá prioridade à modalidade que os dois perfis dizem preferir (um perfil com "Ambos" conta
  // como compatível com as duas), sem nunca excluir a outra opção.
  const modalityOptions = useMemo(() => {
    const matchesPreference = (option: SessionModality, preferences: string[]) =>
      preferences.includes(option) || preferences.includes('Ambos');
    return prioritizeBy(
      MODALITY_OPTIONS,
      (option) =>
        (matchesPreference(option, recipient?.availabilityModality ?? []) ? 1 : 0) +
        (matchesPreference(option, myAvailabilityModality) ? 1 : 0),
    );
  }, [recipient, myAvailabilityModality]);

  const [subject, setSubject] = useState<string>();
  const [month, setMonth] = useState(() => new Date());
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [modality, setModality] = useState<SessionModality>();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const now = new Date();
  const isToday = date === toDateKey(now);
  // Se o dia escolhido for hoje, esconde as horas que já passaram.
  const availableHourOptions = isToday
    ? HOUR_OPTIONS.filter((hour) => hour > `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    : HOUR_OPTIONS;

  // Dá prioridade às horas dentro do período (Manhãs/Tardes/Fins de tarde) que qualquer um dos
  // dois perfis diz preferir, sem excluir as restantes.
  const hourOptions = useMemo(
    () =>
      prioritizeBy(
        availableHourOptions,
        (hour) =>
          (hourMatchesPeriods(hour, recipient?.availabilityPeriods ?? []) ? 1 : 0) +
          (hourMatchesPeriods(hour, myAvailabilityPeriods) ? 1 : 0),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, recipient, myAvailabilityPeriods],
  );

  const canSubmit = !!subject && !!date && !!time && !!modality && !submitting;

  const handleSubmit = async () => {
    if (!user || !toUid || !subject || !date || !time || !modality) return;
    setSubmitting(true);
    setError(false);
    try {
      const requestId = await sendSessionRequest(user.uid, toUid, { subject, date, time, modality, message: message.trim() });
      // Deixa também um cartão no chat (ChatSessionRequestCard), tal como acontece ao enviar um
      // ficheiro — não crítico: o pedido de sessão já foi criado, por isso uma falha aqui não
      // deve bloquear o sucesso.
      try {
        await sendSessionRequestMessage(matchId(user.uid, toUid), user.uid, toUid, {
          requestId,
          subject,
          date,
          time,
          modality,
          message: message.trim() || undefined,
          toFirstName: firstName ?? '',
        });
      } catch {
        // ignorado de propósito — ver comentário acima
      }
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack(router)} accessibilityRole="button" accessibilityLabel={i18n.sessions.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>
        <ThemedText type="title">{i18n.sessionRequest.title}</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText type="body" themeColor="textMuted">
          {i18n.sessionRequest.requestingFrom(`${firstName ?? ''} ${lastName ?? ''}`.trim())}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="bodyBold">{i18n.sessionRequest.subjectLabel}</ThemedText>
          <ChipGroup
            options={subjectOptions}
            selected={subject ? [subject] : []}
            onChange={(next) => next[0] && setSubject(next[0])}
            multiple={false}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="bodyBold">{i18n.sessionRequest.dateLabel}</ThemedText>
          <CalendarMonth
            month={month}
            onChangeMonth={setMonth}
            selectedDate={date}
            onSelectDate={(nextDate) => {
              setDate(nextDate);
              // Ao mudar para hoje, uma hora já escolhida pode ter ficado no passado.
              if (time && !(nextDate === toDateKey(now) ? availableHourOptions : HOUR_OPTIONS).includes(time)) {
                setTime(undefined);
              }
            }}
            minDate={toDateKey(now)}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="bodyBold">{i18n.sessionRequest.timeLabel}</ThemedText>
          <ChipGroup
            options={hourOptions}
            selected={time ? [time] : []}
            onChange={(next) => next[0] && setTime(next[0])}
            multiple={false}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="bodyBold">{i18n.sessionRequest.modalityLabel}</ThemedText>
          <ChipGroup
            options={modalityOptions}
            selected={modality ? [modality] : []}
            onChange={(next) => next[0] && setModality(next[0] as SessionModality)}
            multiple={false}
          />
        </View>

        <TextField
          label={i18n.sessionRequest.messageLabel}
          variant="filled"
          multiline
          maxLength={150}
          placeholder={i18n.sessionRequest.messagePlaceholder}
          value={message}
          onChangeText={setMessage}
        />

        {error && (
          <ThemedText type="small" themeColor="danger">
            {i18n.sessionRequest.submitError}
          </ThemedText>
        )}

        <Button
          label={submitting ? i18n.sessionRequest.sending : i18n.sessionRequest.send}
          variant="primary"
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={styles.submit}
        />
      </ScrollView>

      <SuccessModal
        visible={sent}
        title={i18n.sessionRequest.sentTitle}
        description={i18n.sessionRequest.sentDescription(firstName ?? '')}
        buttonLabel={i18n.common.continue}
        onContinue={() => goBack(router)}
      />
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
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  submit: {
    marginTop: Spacing.two,
  },
});
