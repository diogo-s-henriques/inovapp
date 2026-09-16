import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { canLearn } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useAuthStore } from '@/auth/store';
import {
  fetchExcludedCandidateIds,
  fetchMentorCandidates,
  getPassedCandidateIds,
  matchesView,
  passCandidate,
  sendConnectionRequest,
} from '@/lib/matching';
import { respondToConnectionRequest, retryPendingConnectionRequests } from '@/lib/requests';
import type { ConnectionRequest } from '@/lib/requests';
import { useConnectionRequests } from '@/hooks/use-connection-requests';
import { useTheme } from '@/hooks/use-theme';
import { BlockedScreen } from '@/components/ui/BlockedScreen';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { ThemedText } from '@/components/ui/ThemedText';
import { CandidateCard } from '@/components/domain/CandidateCard';
import { ConnectionRequestsSection } from '@/components/domain/ConnectionRequestsSection';
import { RetryNotice } from '@/components/ui/RetryNotice';
import { ScreenHero } from '@/components/domain/ScreenHero';
import type { MatchCandidate } from '@/types/match';

/**
 * Ecrã de descoberta e de decisão. Em cima, os pedidos de conexão que chegaram (aceitar/recusar
 * acontece aqui, não nas Notificações: um pedido decide-se num sítio só); por baixo, os candidatos
 * que ainda não são nada para nós. Quem só ensina não tem lista de candidatos — não procura mentor,
 * são os Tutorandos que o encontram — mas vê na mesma os pedidos.
 *
 * A lista de candidatos é uma **lista**, e não um cartão de ecrã inteiro que se vira: era um deck
 * com uma bandeja de botões fixa em baixo, e nenhum outro ecrã da app se parecia com aquilo. Agora
 * é a mesma linha de cartão que os resultados da pesquisa usam, com as duas decisões dentro do
 * cartão — de quem se está a ler. O que se perdeu (descrição e disponibilidade) vive no perfil de
 * cada candidato, a um toque de distância.
 *
 * Os pedidos recusados ou aceites saem da lista sozinhos (deixam de estar pendentes), e um pedido
 * enviado tira o candidato daqui na hora: pedir duas vezes a mesma ligação não é possível.
 *
 * O que o ecrã desenha vem todo de `matchesView` (ver src/lib/matching.ts), e não de uma corrente
 * de `if` aqui dentro: foi essa corrente que deixou o ecrã preso a girar para quem só ensina (sem
 * lista de candidatos para carregar, o estado de carregamento nunca chegava ao fim).
 *
 * O cabeçalho é o mesmo bloco em gradiente da Home (`ScreenHero`), mas só com o título: sem
 * identidade e sem sino — o nome de quem já está na app não diz nada de novo aqui, e o sino já
 * está na Home (e o número que ele mostraria obrigava a repetir, neste ecrã, as subscrições que só
 * a Home tem).
 */
export default function MatchesScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const participationMode = useAuthStore((state) => state.profile?.participationMode);
  const learningSubjects = useAuthStore((state) => state.profile?.learningSubjects ?? []);
  // Match serve para procurar mentor; quem está definido só como Mentor (não Tutorando) não
  // tem uso para esta funcionalidade — são os Tutorandos que os encontram, não o contrário.
  const blocked = !canLearn(participationMode);

  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestedName, setRequestedName] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const { requests, error: requestsError } = useConnectionRequests();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState(false);

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
        if (cancelled) return;
        setCandidates(results);
        setLoadError(false);
      } catch {
        // Sem este `catch`, uma leitura que falhasse deixava a lista vazia e o ecrã a dizer "sem
        // mais perfis por agora" — ou seja, a app a afirmar que não há ninguém quando não sabe.
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, blocked, reloadToken]);

  // O candidato sai da lista nos dois sentidos: quem passa já não o quer ver, e quem recebeu o
  // pedido também não (a lista já não teria o que fazer com ele, e voltaria a oferecer a mesma
  // ligação a quem acabou de a pedir).
  const dropCandidate = (id: string) => setCandidates((current) => current.filter((candidate) => candidate.id !== id));

  const handlePass = (candidate: MatchCandidate) => {
    passCandidate(candidate.id);
    dropCandidate(candidate.id);
  };

  const handleConnect = async (candidate: MatchCandidate) => {
    if (!user || connectingId) return;
    setConnectingId(candidate.id);
    setConnectError(false);
    try {
      await sendConnectionRequest(user.uid, candidate.id);
      dropCandidate(candidate.id);
      setRequestedName(candidate.firstName);
    } catch {
      setConnectError(true);
    } finally {
      setConnectingId(null);
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

  // Tentar outra vez volta a pôr o estado de carregamento (a fazer de conta que ainda não sabemos
  // nada) e obriga o efeito a correr de novo. Não basta limpar o erro: sem o token, o efeito não
  // volta a correr e o botão só limpava a mensagem.
  const handleRetryLoad = () => {
    setLoadError(false);
    setLoading(true);
    setReloadToken((token) => token + 1);
  };

  // O estado do ecrã, decidido num sítio só (ver `matchesView`): quem só ensina **nunca** está a
  // carregar, mesmo que `loading` tenha ficado preso a true lá atrás.
  const view = matchesView({ canLearn: !blocked, loading, loadError, requestCount: requests.length });

  const header = (
    <>
      <ScreenHero style={styles.hero} topInset={insets.top} title={i18n.matches.title} />

      <View style={styles.headerBody}>
        <ConnectionRequestsSection
          requests={requests}
          busyId={respondingId}
          errorMessage={respondError ? i18n.requests.respondError : null}
          onAccept={(request) => handleRespond(request, true)}
          onDecline={(request) => handleRespond(request, false)}
        />
        {connectError && (
          <ThemedText type="small" themeColor="danger" style={styles.connectError}>
            {i18n.matches.connectError}
          </ThemedText>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Uma leitura dos pedidos que falhou aparece aqui, acima de qualquer vista (e não só na
          lista): quem só ensina sem pedidos nenhuns cai na vista de "bloqueado", e era aí que o
          aviso ficava escondido. */}
      {requestsError && (
        <RetryNotice
          message={i18n.requests.loadError}
          onRetry={retryPendingConnectionRequests}
          style={styles.requestsNotice}
        />
      )}

      {view === 'blocked' ? (
        <BlockedScreen title={i18n.matches.blockedTitle} />
      ) : view === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : view === 'error' ? (
        <View style={styles.centered}>
          <ThemedText type="bodyBold" style={styles.centeredTitle}>
            {i18n.matches.loadError}
          </ThemedText>
          <Button label={i18n.common.tryAgain} variant="primary" onPress={handleRetryLoad} />
        </View>
      ) : (
        <FlatList
          data={blocked ? [] : candidates}
          keyExtractor={(candidate) => candidate.id}
          // A cor por trás da lista é a do topo do gradiente: é esta superfície que aparece na
          // faixa que se vê ao puxar a lista para baixo (e a lista, clara, cobre o resto).
          style={[styles.scroll, { backgroundColor: theme.heroTop }]}
          contentContainerStyle={[styles.list, { backgroundColor: theme.background }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            // Quem só ensina tem pedidos para decidir mas nenhuma lista de candidatos, e o que
            // está por cima (a secção dos pedidos) já é o conteúdo do ecrã: não se explica a
            // ausência da lista, porque não falta nada.
            view === 'requests' ? null : (
              <View style={styles.emptyBox}>
                <ThemedText type="bodyBold" style={styles.centeredTitle}>
                  {i18n.matches.emptyTitle}
                </ThemedText>
                <ThemedText themeColor="textMuted" style={styles.centeredTitle}>
                  {i18n.matches.emptyDescription}
                </ThemedText>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CandidateCard
              firstName={item.firstName}
              lastName={item.lastName}
              course={item.course}
              year={item.year}
              subjects={item.subjects}
              image={item.image}
              passLabel={i18n.matches.pass}
              connectLabel={i18n.matches.connect}
              busy={connectingId === item.id}
              onPass={() => handlePass(item)}
              onConnect={() => handleConnect(item)}
              onPressProfile={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}

      <SuccessModal
        visible={requestedName !== null}
        onRequestClose={() => setRequestedName(null)}
        title={i18n.matches.requestSentTitle}
        description={i18n.matches.requestSentDescription(requestedName ?? undefined)}
        buttonLabel={i18n.common.continue}
        onContinue={() => setRequestedName(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  // O bloco é de fora a fora: o conteúdo tem 24 px de margem, e o gradiente tem de os desfazer
  // para chegar às bordas.
  hero: {
    marginHorizontal: -Spacing.five,
  },
  // O que vem depois do bloco (os pedidos por decidir) — o topo é 0 porque quem chega ao limite do
  // ecrã é o bloco, não a lista.
  headerBody: {
    paddingTop: Spacing.five,
  },
  // O aviso de leitura falhada vive fora das vistas (ver o ecrã): a margem é dele, e não da lista,
  // porque em duas das vistas não há lista nenhuma por baixo.
  requestsNotice: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: 0,
    paddingBottom: 120,
  },
  separator: {
    height: Spacing.two,
  },
  connectError: {
    marginTop: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingBottom: 120,
  },
  centeredTitle: {
    textAlign: 'center',
  },
  // Sem resultados: centrado e com espaço próprio, como nos estados vazios da pesquisa e do chat.
  emptyBox: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.six,
  },
});
