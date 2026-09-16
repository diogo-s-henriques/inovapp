import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { setStatusBarStyle } from 'expo-status-bar';

import { Spacing } from '@/constants/theme';
import { canLearn, canTeach } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth/store';
import { useConnectionRequests } from '@/hooks/use-connection-requests';
import { useConversations } from '@/hooks/use-conversations';
import { useSessionRequests } from '@/hooks/use-session-requests';
import { getInitials } from '@/lib/initials';
import { retryConversations } from '@/lib/chat';
import { greetingPeriod, isHomeEmpty, toAttentionItems, type AttentionKind } from '@/lib/home';
import { hasConnections } from '@/lib/matching';
import { dismissSessionRating, getDismissedSessionIds, hasRatingForSession, submitRating } from '@/lib/ratings';
import { roleLabel } from '@/lib/roles';
import { retryPendingSessionRequests, subscribeToSessions } from '@/lib/sessions';
import { retryPendingConnectionRequests } from '@/lib/requests';
import { dateLocaleTag, toDateKey, toSessionKey } from '@/lib/time';
import { useLocaleStore, type Locale } from '@/i18n/store';
import type { Translations } from '@/i18n/translations';
import { Button } from '@/components/ui/Button';
import { RetryNotice } from '@/components/ui/RetryNotice';
import { SectionCard } from '@/components/ui/SectionCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { AgendaCard } from '@/components/domain/AgendaCard';
import { AttentionCard } from '@/components/domain/AttentionCard';
import { EvaluationModal } from '@/components/domain/EvaluationModal';
import { HomeHeader } from '@/components/domain/HomeHeader';
import { HomeShortcuts } from '@/components/domain/HomeShortcuts';
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

/**
 * Ecrã inicial — e a regra que decidiu o que ele tem dentro é **caber sem rolar**.
 *
 * É o bloco com cor no topo com a identidade (saudação, nome completo e papel) e o sino, e por baixo
 * — por ordem — o que espera uma resposta, o calendário da agenda (o mês com um ponto nos dias com
 * sessão; tocar num dia abre a Agenda nesse dia) e o atalho dos Materiais. Foi por isso que quatro
 * coisas saíram daqui, e cada uma levou a sua razão:
 *
 * - a **próxima sessão** em destaque: o *quando* das sessões passou a ser o calendário, que diz o
 *   mesmo sem uma linha de texto, e a lista do dia (com o botão de entrar) está na Agenda;
 * - as **listas de ligações** ("Tutores para ti", "Os teus tutorandos"): quem está ligado a quem
 *   está no Chat, onde as conversas são exatamente essas pessoas, e é lá que se pede uma sessão a
 *   quem já se conhece (ver `ChatSessionRequestCard`);
 * - os atalhos das **Mensagens** e da **Pesquisa**: são dois dos cinco separadores da barra de
 *   baixo, e um segundo caminho para eles no meio da Home era espaço gasto onde ele é mais curto;
 * - os **números da agenda** ("0 agendadas"): são do Perfil, e repeti-los a dois centímetros dos
 *   mesmos números não é informação, é ruído.
 *
 * A **descoberta** vive nos Matches e na pesquisa e o **histórico** nas Notificações: chegaram a
 * estar também aqui, em resumo, e eram duas cópias do mesmo em três ecrãs.
 *
 * O que fica é o que a Home sabe fazer melhor do que qualquer outro ecrã: dizer quem és, o que
 * espera por ti e quando tens sessões. Nada disto é só uma questão de gosto — está calculado para
 * caber no ecrã de um telemóvel sem deslizar, e as contas estão escritas no `README`, na entrada
 * do ecrã inicial.
 *
 * O cabeçalho é o primeiro item da lista e rola com ela, mas o seu gradiente chega ao topo do
 * ecrã: para isso o `SafeAreaView` **não** trata da barra de estado nas bordas de cima (só
 * esquerda, direita e fundo) e o espaço é dado ao cabeçalho, que sabe quanto é (`insets.top`).
 *
 * A cor da própria lista é a do topo do gradiente do cabeçalho (`styles.scroll`), e o conteúdo
 * dela é claro (`styles.content`): é isso que faz a faixa que aparece ao puxar para baixo ter a
 * cor do cabeçalho em vez de branco — e o `flexGrow` do conteúdo impede que essa cor apareça por
 * baixo da última secção. As duas têm de andar juntas: `heroTop` aqui e a primeira paragem do
 * gradiente em `HomeHeader`.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const insets = useSafeAreaInsets();
  const locale = useLocaleStore((state) => state.locale);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const participationMode = profile?.participationMode;
  const fullName = user?.fullName?.trim() ?? '';
  const initials = getInitials(fullName);
  // O papel de quem está a ver o ecrã ("Tutor", "Mentor", "Mentor e Tutorando", "Tutorando"):
  // depende do modo de participação e de ser professor (@iseclisboa.pt). Ver src/lib/roles.ts.
  const viewerRole = roleLabel(profile?.participationMode, profile?.role, i18n);
  const [sessions, setSessions] = useState<AgendaSession[]>([]);
  const [pendingRating, setPendingRating] = useState<AgendaSession | null>(null);
  const [hasAnyConnection, setHasAnyConnection] = useState(false);
  const [connectionsError, setConnectionsError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const canBrowse = canLearn(participationMode);
  // Quem não ensina nem aprende não tem ligações para reler: puxar o ecrã não faria nada.
  const canRefresh = canBrowse || canTeach(participationMode);
  const [refreshing, setRefreshing] = useState(false);

  // O cabeçalho deste ecrã é claro (ver `heroTop`/`heroBottom`), por isso os ícones da barra de
  // estado são escuros — eram claros enquanto o bloco era escuro, e sobre um tom quase de
  // fundo os brancos da bateria e das horas desapareciam. O estilo é posto por foco, e não no
  // mount, porque os ecrãs dos separadores ficam montados: aplicado uma vez, ficava a valer nos
  // outros separadores.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
      return () => setStatusBarStyle('auto');
    }, []),
  );

  // A Home só quer saber se há **alguma** ligação — é isso que decide o guia de primeiros passos,
  // porque as listas saíram daqui para o Chat. Chegou a ler as duas listas completas (dois perfis
  // por linha, mais os bloqueios) para responder a uma pergunta de sim/não; agora é `hasConnections`,
  // que a responde com dois documentos.
  //
  // O `.catch` é o que faltava antes — sem ele, uma leitura negada deixava tudo a zero, e zero é
  // indistinguível de "ainda não tens ninguém". Foi assim que uma falta de regras no Firebase
  // passou meses por "ecrã sem dados".
  useEffect(() => {
    if (!user) return;
    if (!canLearn(participationMode) && !canTeach(participationMode)) return;

    let cancelled = false;

    (async () => {
      try {
        const temLigacoes = await hasConnections(user.uid);
        if (cancelled) return;
        setHasAnyConnection(temLigacoes);
        setConnectionsError(false);
      } catch {
        if (!cancelled) setConnectionsError(true);
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, participationMode, reloadToken]);

  // As duas contagens vêm das leituras partilhadas (ver `useConnectionRequests`): os pedidos de
  // conexão entram aqui porque a secção "Novidades" é um aviso e não uma decisão — quem aceita ou
  // recusa continua a ser a lista dos Matches, e é para lá que a linha leva (para o ecrã dos
  // pedidos, que é essa mesma lista, empilhada).
  const { requests: connectionRequestList, error: connectionRequestsError } = useConnectionRequests();
  const { requests: sessionRequestList, error: sessionRequestsError } = useSessionRequests();
  const pendingConnectionRequests = connectionRequestList.length;
  const pendingSessionRequests = sessionRequestList.length;
  // As conversas por ler contam para a mesma secção, e vêm da mesma leitura partilhada que a
  // barra de baixo e o Chat usam (ver `useConversations`).
  const { conversations, error: conversationsError } = useConversations();
  const unreadConversations = conversations.filter((conversation) => conversation.unread).length;

  // Uma leitura que falhou não se pode confundir com "não tens nada por decidir": a secção passa a
  // dizê-lo, em vez de desaparecer.
  const attentionError = connectionRequestsError || sessionRequestsError || conversationsError;
  const retryAttention = () => {
    retryPendingConnectionRequests();
    retryPendingSessionRequests();
    retryConversations();
  };


  // O sino conta o que o ecrã de notificações apresenta como pendente para ler: pedidos de sessão e
  // mensagens por ler. Os pedidos de conexão ficam de fora de propósito — o aviso deles é a linha
  // na secção "Precisa de ti" e a bolinha do separador dos Matches, não uma terceira contagem.
  const unreadNotifications = pendingSessionRequests + unreadConversations;

  const attentionItems = toAttentionItems({
    connections: pendingConnectionRequests,
    sessions: pendingSessionRequests,
    messages: unreadConversations,
  });
  // O número da secção é o total do que está à espera (2 pedidos + 1 sessão + 3 mensagens = 6), e
  // não quantas linhas existem: as linhas são categorias, o que se conta são coisas.
  const waitingCount = attentionItems.reduce((total, item) => total + item.count, 0);

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
      const nowKey = toSessionKey();
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

  const handleAttention = (kind: AttentionKind) => {
    // Cada tipo leva ao ecrã onde essa decisão se toma mesmo: os pedidos de conexão à lista dos
    // pedidos, o resto (sessões por confirmar, mensagens por ler) às Notificações.
    //
    // Os pedidos de conexão vão para `/connection-requests` e **não** para a aba dos Matches, onde
    // a mesma lista também está: mudar de separador não empilha ecrã nenhum, por isso não havia
    // como voltar atrás com o gesto de deslizar do iOS. A decisão é a mesma (é o mesmo componente),
    // só deixou de ser um beco sem saída.
    if (kind === 'connections') {
      router.push('/connection-requests');
      return;
    }
    router.push('/notifications');
  };

  const nowKey = toSessionKey();
  // Uma sessão terminada pelo mentor antes da hora marcada deixa de contar como agendada, mesmo que
  // a hora marcada ainda não tenha passado. É este número que decide se a Home está vazia; o que
  // **não** se faz com ele é escolher a "próxima sessão" para destacar aqui — esse cartão saiu, e o
  // quando das sessões é agora o calendário abaixo (ver o comentário da secção da agenda).
  const upcomingSessions = sessions.filter(
    (session) => session.status !== 'completed' && `${session.date}T${session.time}` >= nowKey,
  );

  // Puxar para baixo relê as ligações. O resto do ecrã não precisa: as sessões, os pedidos e as
  // conversas são subscrições ao vivo, e por isso já estão a par do que mudou. Depois de as listas
  // saírem do ecrã, o que se relê é o **número** de ligações, que só serve para decidir se a Home
  // ainda está vazia — é pouco para um gesto, mas é o que o gesto sempre fez (e continua a ser a
  // forma de tirar o aviso de erro do ecrã sem o fechar).
  //
  // O indicador é apagado no fim da leitura (o `finally` do efeito acima), e não aqui: se a leitura
  // for negada ou falhar, tem de parar na mesma. E só se põe a rodar quando essa leitura existe —
  // sem ligações para ler, ficava a rodar sobre nada.
  const handleRefresh = () => {
    if (!canRefresh) return;
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  };

  // Os dias que levam ponto no calendário: todos os que têm sessão marcada, e não só os que ainda
  // não passaram — o mês conta a agenda toda, incluindo o que já foi dado.
  const markedDates = useMemo(() => new Set(sessions.map((session) => session.date)), [sessions]);
  const todayKey = toDateKey(new Date());

  // A Home está vazia quando não há nada do que é dela: sem sessões, sem ligações e sem pendências.
  //
  // O `!connectionsError` não é detalhe: as ligações deixaram de estar à vista neste ecrã, e uma
  // leitura que falhou devolve zero em `connections` — sem esta linha, quem tem ligações e uma
  // leitura negada via o guia de quem ainda não tem nada, a dizer-lhe para encontrar um mentor que
  // já tem. É a diferença entre "não tenho ligações" e "não sei as minhas ligações".
  const showFirstSteps =
    !connectionsError &&
    !attentionError &&
    isHomeEmpty({
      sessions: upcomingSessions.length,
      connections: hasAnyConnection ? 1 : 0,
      attention: attentionItems.length,
    });

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        // A cor por trás da lista é a do topo do gradiente: é esta superfície que aparece na faixa
        // que se vê ao puxar a lista para baixo (a barra da puxar para atualizar).
        style={[styles.scroll, { backgroundColor: theme.heroTop }]}
        // A lista em si é clara — e o `flexGrow` garante que ela cobre o ecrã todo mesmo quando há
        // pouco conteúdo, em vez de deixar ver a cor do bloco por baixo das secções.
        contentContainerStyle={[styles.content, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        // O gradiente do cabeçalho tem de chegar ao topo do ecrã; sem isto, o iOS volta a
        // empurrar o conteúdo para baixo da barra de estado e sobra uma faixa clara por cima.
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            // Sobre o tom claro do bloco, o indicador escuro é o que se vê (iOS); no Android ele traz o
            // seu próprio fundo, e é branco para o ponteiro escuro continuar a ver-se.
            tintColor={theme.primaryDark}
            colors={[theme.primaryDark]}
            progressBackgroundColor={theme.surface}
            // Sem isto o indicador ficava debaixo da barra de estado (o conteúdo começa mesmo no
            // topo do ecrã, por causa do gradiente).
            progressViewOffset={insets.top}
          />
        }>
        <HomeHeader
          name={fullName}
          period={greetingPeriod(new Date())}
          roleLabel={viewerRole}
          initials={initials}
          photoUri={user?.photoUri}
          unreadNotifications={unreadNotifications}
          onPressNotifications={() => router.push('/notifications')}
          // O espaço por baixo da barra de estado: 16 px, depois 24 e agora 32 — a identidade
          // estava encostada aos ícones do sistema. Quem o soma é o bloco (`ScreenHero`), que é
          // quem põe o `paddingTop` a seguir à margem do ecrã.
          topInset={insets.top}
          style={styles.hero}
        />

        {(attentionItems.length > 0 || attentionError) && (
          <View style={styles.section}>
            <SectionHeader title={i18n.home.attentionLabel} badge={attentionError ? undefined : waitingCount} />
            {attentionError && (
              <RetryNotice message={i18n.home.attentionLoadError} onRetry={retryAttention} />
            )}
            <AttentionCard items={attentionItems} onPressItem={handleAttention} />
          </View>
        )}

        {showFirstSteps && (
          <SectionCard label={i18n.home.firstStepsTitle}>
            <ThemedText>{canBrowse ? i18n.home.firstStepsBodyLearn : i18n.home.firstStepsBodyTeach}</ThemedText>
            <Button
              label={canBrowse ? i18n.home.firstStepsCtaLearn : i18n.home.firstStepsCtaTeach}
              icon={canBrowse ? 'people-outline' : 'create-outline'}
              onPress={() => {
                // Para quem só ensina, o Match está fechado (é lá que se procura mentor) e o passo
                // seguinte é o perfil por que vai ser encontrado.
                if (canBrowse) {
                  router.push('/matches');
                } else {
                  router.push('/profile-edit');
                }
              }}
            />
          </SectionCard>
        )}

        {/* A agenda deixou de ser um atalho e passou a ser o mês: um atalho ao lado de um
            calendário é o mesmo destino a dois dedos de distância. Tocar num dia empilha o ecrã
            das Sessões já nesse dia, que é onde a decisão se toma (marcar como dada), e o "Ver
            agenda" leva ao mês a partir de hoje. */}
        <View style={styles.section}>
          <SectionHeader
            title={i18n.home.sessionsTitle}
            actionLabel={i18n.home.sessionsOpen}
            onPressAction={() => router.push('/sessions')}
          />
          <AgendaCard
            markedDates={markedDates}
            selectedDate={todayKey}
            onPressDay={(date) => router.push({ pathname: '/sessions', params: { date } })}
          />
        </View>

        <HomeShortcuts onPressMaterials={() => router.push('/materials')} />

        {connectionsError && (
          <View style={styles.errorRow}>
            <ThemedText type="small" themeColor="danger" style={styles.errorText}>
              {i18n.home.loadError}
            </ThemedText>
            <Button
              label={i18n.common.tryAgain}
              variant="link"
              onPress={() => {
                setConnectionsError(false);
                setReloadToken((token) => token + 1);
              }}
            />
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
  scroll: {
    flex: 1,
  },
  content: {
    // Cobre a altura do ecrã mesmo com pouco conteúdo: sem isto, a cor de `scroll` aparecia por
    // baixo da última secção.
    flexGrow: 1,
    gap: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingTop: 0,
    paddingBottom: 120,
  },
  hero: {
    // O cabeçalho é a única coisa do ecrã que é de fora a fora: o conteúdo tem 24 px de margem,
    // e o gradiente tem de os desfazer para chegar às bordas.
    marginHorizontal: -Spacing.five,
  },
  section: {
    gap: Spacing.three,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorText: {
    flex: 1,
  },
});
