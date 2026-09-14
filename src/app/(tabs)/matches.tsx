import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { canLearn } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useAuthStore } from '@/auth/store';
import { fetchExcludedCandidateIds, fetchMentorCandidates, getPassedCandidateIds, passCandidate, sendConnectionRequest } from '@/lib/matching';
import { respondToConnectionRequest, subscribePendingConnectionRequests } from '@/lib/requests';
import type { ConnectionRequest } from '@/lib/requests';
import { useTheme } from '@/hooks/use-theme';
import { BlockedScreen } from '@/components/ui/BlockedScreen';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ThemedText } from '@/components/ui/ThemedText';
import { ConnectionRequestsSection } from '@/components/domain/ConnectionRequestsSection';
import { MatchCard } from '@/components/domain/MatchCard';
import type { MatchCandidate } from '@/types/match';

/**
 * Ecrã de descoberta e de decisão. Em cima, os pedidos de conexão que chegaram (aceitar/recusar
 * acontece aqui, não nas Notificações: um pedido decide-se num sítio só); por baixo, o deck que
 * mostra um candidato de cada vez, avançando ao passar ou ao conectar. Quem só ensina não tem
 * deck — não procura mentor, são os Tutorandos que o encontram — mas vê na mesma os pedidos.
 */
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
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribePendingConnectionRequests(user.uid, setRequests);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (!user || blocked) return;
    let cancelled = false;

    (async () => {
      try {
        // Exclui perfis com pedido de conexão entre os dois — em qualquer sentido e estado, para
        // quem já me pediu não aparecer aqui em baixo depois de estar lá em cima — e perfis
        // passados neste dispositivo (local), para nenhum voltar a aparecer.
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

  const handleRespond = async (request: ConnectionRequest, accept: boolean) => {
    if (!user || respondingId) return;
    setRespondingId(request.id);
    setRespondError(false);
    try {
      // Aceitar cria também a conversa (ver src/lib/requests.ts) e o pedido deixa de estar
      // pendente, por isso ele desaparece desta lista sozinho.
      await respondToConnectionRequest(request.id, request.fromUid, user.uid, accept);
    } catch {
      setRespondError(true);
    } finally {
      setRespondingId(null);
    }
  };

  const handleCloseRequestSent = () => {
    setShowRequestSent(false);
    goToNext();
  };

  // Sem pedidos e sem deck não há nada para mostrar além da explicação — é o caso de quem só
  // ensina e ainda não recebeu nada.
  const onlyBlockedMessage = blocked && requests.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{i18n.matches.title}</ThemedText>
      </View>

      {onlyBlockedMessage ? (
        <BlockedScreen title={i18n.matches.blockedTitle} description={i18n.matches.blockedDescription} />
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <ConnectionRequestsSection
              requests={requests}
              busyId={respondingId}
              errorMessage={respondError ? i18n.requests.respondError : null}
              onAccept={(request) => handleRespond(request, true)}
              onDecline={(request) => handleRespond(request, false)}
            />

            {blocked ? (
              // Quem só ensina tem pedidos para decidir mas nenhum deck por baixo: a frase
              // explica porquê, em vez de dar a entender que a lista está incompleta.
              <ThemedText type="body" themeColor="textMuted">
                {i18n.matches.blockedDescription}
              </ThemedText>
            ) : loading ? (
              <View style={styles.empty}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : current ? (
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
          </ScrollView>

          {current && (
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
          )}
        </>
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
    gap: Spacing.four,
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
  // Já não é um estado de ecrã inteiro (pode haver pedidos por cima), por isso centra-se com
  // espaço próprio em vez de `flex: 1`.
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.six,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
  },
});
