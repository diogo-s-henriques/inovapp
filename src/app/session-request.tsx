import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { fetchCandidateById } from '@/lib/matching';
import { goBack } from '@/lib/navigation';
import { sendSessionRequest } from '@/lib/sessions';
import { toDateKey } from '@/lib/time';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { CalendarMonth } from '@/components/domain/CalendarMonth';
import { StackHeader } from '@/components/domain/StackHeader';
import { TimePickerField } from '@/components/domain/TimePickerField';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import type { MatchCandidate } from '@/types/match';
import type { SessionModality } from '@/types/session';

const MODALITY_OPTIONS: SessionModality[] = ['Online', 'Presencial'];

/** Reordena as opções por relevância (mais pontos primeiro), sem excluir nenhuma - a ordem
 * original mantém-se entre opções com a mesma pontuação. */
function prioritizeBy<T>(options: T[], score: (option: T) => number): T[] {
  return options
    .map((option, index) => ({ option, index, score: score(option) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.option);
}

// Pedido de sessão a um tutor/tutorando específico; ao ser aceite, aparece na agenda.
export default function SessionRequestScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const myProfile = useAuthStore((state) => state.profile);
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

  const [month, setMonth] = useState(() => new Date());
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [modality, setModality] = useState<SessionModality>();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const timeInPast = !!time && date === toDateKey(now) && time <= nowTime;

  const canSubmit = !!date && !!time && !!modality && !timeInPast && !submitting;

  const handleSubmit = async () => {
    if (!user || !toUid || !date || !time || !modality) return;
    setSubmitting(true);
    setError(false);
    try {
      // O pedido e o cartão no chat são a mesma escrita (ver src/lib/sessions.ts): ou ficam os
      // dois, ou não fica nenhum. É o cartão que permite aceitar ou recusar na conversa.
      await sendSessionRequest(
        user.uid,
        toUid,
        { date, time, modality, message: message.trim() },
        { attachToChat: true },
      );
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StackHeader
        title={i18n.sessionRequest.title}
        backLabel={i18n.sessions.back}
        onBack={() => goBack(router)}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Este ecrã tem campos e rola: um toque que um botão não trata fecha o teclado, e um
        // arrastar continua a ser um arrastar (é o que substitui o toque que existia na raiz).
        keyboardShouldPersistTaps="handled">
        <ThemedText type="body" themeColor="textMuted">
          {i18n.sessionRequest.requestingFrom(`${firstName ?? ''} ${lastName ?? ''}`.trim())}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="bodyBold">{i18n.sessionRequest.dateLabel}</ThemedText>
          <CalendarMonth
            month={month}
            onChangeMonth={setMonth}
            selectedDate={date}
            onSelectDate={(nextDate) => {
              setDate(nextDate);
              // Ao mudar para hoje, uma hora já escolhida pode ter ficado no passado.
              if (time && nextDate === toDateKey(now) && time <= nowTime) setTime(undefined);
            }}
            minDate={toDateKey(now)}
          />
        </View>

        <View style={styles.section}>
          <TimePickerField
            label={i18n.sessionRequest.timeLabel}
            value={time}
            placeholder={i18n.sessionRequest.timePlaceholder}
            title={i18n.sessionRequest.timePickerTitle}
            cancelLabel={i18n.common.cancel}
            doneLabel={i18n.sessionRequest.timePickerDone}
            onChange={setTime}
          />
          {timeInPast && (
            <ThemedText type="small" themeColor="danger">
              {i18n.sessionRequest.timeInPast}
            </ThemedText>
          )}
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
