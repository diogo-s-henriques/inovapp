import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { conversationExists } from '@/lib/chat';
import { fetchCandidateById } from '@/lib/matching';
import { goBack } from '@/lib/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { AvailabilityChips } from '@/components/domain/Profile/AvailabilityChips';
import { TagList } from '@/components/domain/Profile/TagList';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { SectionCard } from '@/components/ui/SectionCard';
import { ThemedText } from '@/components/ui/ThemedText';
import type { MatchCandidate } from '@/types/match';

// Perfil público de outro utilizador (mentor/tutorando), visto a partir de matches, pesquisa ou chat.
export default function OtherUserProfileScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [candidate, setCandidate] = useState<MatchCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    Promise.all([fetchCandidateById(id), conversationExists(user.uid, id)])
      .then(([result, isConnected]) => {
        if (!cancelled) {
          setCandidate(result);
          setConnected(isConnected);
        }
      })
      // Uma falha real (rede, permissões) deixa de ser lida como "não está ligado" e mostrada
      // como "perfil não encontrado": passa a haver um erro explícito com opção de repetir.
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.uid, reloadKey]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor: theme.surface }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor: theme.surface }]}>
        <ThemedText themeColor="textMuted" style={styles.notFound}>
          {i18n.common.genericError}
        </ThemedText>
        <Button
          label={i18n.common.tryAgain}
          variant="secondary"
          onPress={() => {
            setLoadError(false);
            setLoading(true);
            setReloadKey((key) => key + 1);
          }}
        />
      </SafeAreaView>
    );
  }

  if (!candidate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
        <ThemedText themeColor="textMuted" style={styles.notFound}>
          {i18n.otherProfile.notFound}
        </ThemedText>
      </SafeAreaView>
    );
  }

  const availabilityItems = candidate.availability.split(' · ');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.photo, { backgroundColor: theme.surfaceAlt }]}>
          {candidate.image ? (
            <Image source={{ uri: candidate.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <ThemedText type="small" themeColor="textMuted">
                {i18n.otherProfile.photoPlaceholder}
              </ThemedText>
            </View>
          )}

          <View style={[styles.topRow, { top: insets.top + Spacing.two }]}>
            <Pressable
              onPress={() => goBack(router)}
              accessibilityRole="button"
              accessibilityLabel={i18n.otherProfile.back}
              hitSlop={8}
              style={[styles.backButton, { backgroundColor: theme.surface }]}>
              <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
            </Pressable>
          </View>

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} locations={[0, 0.85]} style={styles.gradient}>
            <Pill size="sm" style={{ backgroundColor: theme.primaryDark }}>
              <ThemedText type="small" themeColor="onPrimary" style={styles.roleLabel}>
                {candidate.role.toUpperCase()}
              </ThemedText>
            </Pill>
            <ThemedText type="subtitle" themeColor="onPrimary" style={styles.name}>
              {candidate.firstName} {candidate.lastName}
            </ThemedText>
            <ThemedText type="small" style={styles.details}>
              {candidate.course}, {candidate.year}
            </ThemedText>
          </LinearGradient>
        </View>

        <View style={styles.content}>
          {/* Chat e pedido de sessão só ficam disponíveis depois de o pedido de conexão ser aceite. */}
          <View style={styles.actionsRow}>
            <Button
              label={i18n.otherProfile.chat}
              icon="chatbubble-outline"
              variant="secondary"
              style={styles.chatButton}
              disabled={!connected}
              onPress={() => router.push({ pathname: '/chat/[id]', params: { id: candidate.id } })}
            />
            <Button
              label={i18n.otherProfile.requestSession}
              variant="primary"
              style={styles.sessionButton}
              disabled={!connected}
              onPress={() =>
                router.push({
                  pathname: '/session-request',
                  params: { toUid: candidate.id, firstName: candidate.firstName, lastName: candidate.lastName },
                })
              }
            />
          </View>
          {!connected && (
            <ThemedText type="small" themeColor="textMuted">
              {i18n.otherProfile.connectHint(candidate.firstName)}
            </ThemedText>
          )}

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt }]}>
              <ThemedText type="subtitle">{candidate.sessionsGiven}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {i18n.otherProfile.sessionsGiven}
              </ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.surfaceAlt }]}>
              <ThemedText type="subtitle">{candidate.responseTime}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {i18n.otherProfile.responseTime}
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="bodyBold">{i18n.otherProfile.teaches}</ThemedText>
            <TagList items={candidate.subjects} />
          </View>

          <View style={styles.section}>
            <ThemedText type="bodyBold">{i18n.otherProfile.availabilityLabel}</ThemedText>
            <AvailabilityChips items={availabilityItems} />
          </View>

          <SectionCard label={i18n.otherProfile.aboutLabel}>
            <ThemedText type="body">{candidate.description}</ThemedText>
          </SectionCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  photo: {
    aspectRatio: 1.15,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.half,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
  },
  roleLabel: {
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 22,
  },
  details: {
    color: 'rgba(255,255,255,0.85)',
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  chatButton: {
    flex: 1,
  },
  sessionButton: {
    flex: 1.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
});
