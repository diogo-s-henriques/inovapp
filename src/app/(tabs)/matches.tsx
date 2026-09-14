import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { canLearn } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useAuthStore } from '@/auth/store';
import { fetchExcludedCandidateIds, fetchMentorCandidates, getPassedCandidateIds, passCandidate, sendConnectionRequest } from '@/lib/matching';
import { useTheme } from '@/hooks/use-theme';
import { BlockedScreen } from '@/components/ui/BlockedScreen';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ThemedText } from '@/components/ui/ThemedText';
import { MatchCard } from '@/components/domain/MatchCard';
import type { MatchCandidate } from '@/types/match';

// Ecrã de descoberta: mostra um candidato de cada vez, avança ao passar ou ao conectar.
export default function MatchesScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const participationMode = useAuthStore((state) => state.profile?.participationMode);
  const learningSubjects = useAuthStore((state) => state.profile?.learningSubjects ?? []);
  // Match serve para procurar mentor; quem está definido só como Mentor (não Tutorando) não
  // tem uso para esta funcionalidade — são os Tutorandos que os encontram, não o contrário.
  const blocked = !canLearn(participationMode);

  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRequestSent, setShowRequestSent] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user || blocked) return;
    let cancelled = false;

    (async () => {
      try {
        // Exclui perfis já conectados/pedidos (Firestore) e perfis passados neste dispositivo
        // (local), para nenhum dos dois voltar a aparecer.
        const [excludeIds, passedIds] = await Promise.all([fetchExcludedCandidateIds(user.uid), getPassedCandidateIds()]);
        passedIds.forEach((id) => excludeIds.add(id));
        const results = await fetchMentorCandidates({ currentUid: user.uid, learningSubjects, excludeIds });
        if (!cancelled) setCandidates(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, blocked]);

  const current = candidates[currentIndex];

  const goToNext = () => setCurrentIndex((index) => index + 1);

  const handlePassar = () => {
    if (current) passCandidate(current.id);
    goToNext();
  };

  const handleConectar = async () => {
    if (!user || !current || connecting) return;
    setConnecting(true);
    setError(false);
    try {
      await sendConnectionRequest(user.uid, current.id);
      setShowRequestSent(true);
    } catch {
      setError(true);
    } finally {
      setConnecting(false);
    }
  };

  const handleCloseRequestSent = () => {
    setShowRequestSent(false);
    goToNext();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{i18n.matches.title}</ThemedText>
      </View>

      {blocked ? (
        <BlockedScreen title={i18n.matches.blockedTitle} description={i18n.matches.blockedDescription} />
      ) : loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : current ? (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <MatchCard
              firstName={current.firstName}
              roleLabel={current.role}
              course={current.course}
              year={current.year}
              subjects={current.subjects}
              availability={current.availability}
              description={current.description}
              image={current.image}
              onPressProfile={() => router.push({ pathname: '/profile/[id]', params: { id: current.id } })}
            />
          </ScrollView>

          <View style={styles.actionBar}>
            {error && (
              <ThemedText type="small" themeColor="danger" style={styles.errorText}>
                {i18n.matches.connectError}
              </ThemedText>
            )}
            <View style={[styles.tray, { backgroundColor: theme.surfaceAlt }]}>
              <Button
                label={i18n.matches.pass}
                icon="close"
                variant="ghost"
                onPress={handlePassar}
                disabled={connecting}
                style={styles.passarButton}
              />
              <Button
                label={i18n.matches.connect}
                icon="heart"
                variant="primary"
                onPress={handleConectar}
                disabled={connecting}
                style={styles.conectarButton}
              />
            </View>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <ThemedText type="bodyBold" style={styles.emptyTitle}>
            {i18n.matches.emptyTitle}
          </ThemedText>
          <ThemedText themeColor="textMuted" style={styles.emptyDescription}>
            {i18n.matches.emptyDescription}
          </ThemedText>
        </View>
      )}

      <SuccessModal
        visible={showRequestSent}
        onRequestClose={handleCloseRequestSent}
        title={i18n.matches.requestSentTitle}
        description={i18n.matches.requestSentDescription(current?.firstName)}
        buttonLabel={i18n.common.continue}
        onContinue={handleCloseRequestSent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.three,
  },
  actionBar: {
    paddingHorizontal: Spacing.five,
    paddingBottom: 110,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: Spacing.six,
    overflow: 'hidden',
  },
  passarButton: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  conectarButton: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.six,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
  },
});
