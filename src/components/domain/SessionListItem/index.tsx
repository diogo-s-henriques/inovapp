import { ActivityIndicator, Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Pill } from '@/components/ui/Pill';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText } from '@/components/ui/ThemedText';
import type { SessionModality, SessionRole, SessionStatus } from '@/types/session';

export interface SessionListItemProps extends ViewProps {
  time: string;
  firstName: string;
  lastName: string;
  image?: string;
  subject: string;
  modality: SessionModality;
  // Nomeado `sessionRole` (e não `role`) porque `ViewProps` já tem um `role` de acessibilidade.
  sessionRole: SessionRole; // papel do utilizador nesta sessão (ver src/types/session.ts)
  status: SessionStatus;
  completing?: boolean;
  onPressJoin?: () => void;
  onPressComplete?: () => void;
}

// Linha de sessão na agenda (src/app/sessions.tsx); o papel muda consoante quem vê o ecrã.
// O botão de ação também muda: só quem é Mentor/Tutor consegue terminar a sessão; depois de
// terminada, ninguém volta a ver "Entrar", só o estado.
export function SessionListItem({
  time,
  firstName,
  lastName,
  image,
  subject,
  modality,
  sessionRole,
  status,
  completing,
  onPressJoin,
  onPressComplete,
  style,
  ...rest
}: SessionListItemProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const roleLabel = sessionRole === 'student' ? i18n.roles.tutee : i18n.roles.mentor;
  const canComplete = sessionRole === 'mentor' && !!onPressComplete;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]} {...rest}>
      <ThemedText type="bodyBold" themeColor="primary" style={styles.time}>
        {time}
      </ThemedText>

      <ProfilePicCard firstName={firstName} lastName={lastName} image={image} size="md" />

      <View style={styles.info}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {firstName} {lastName}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {subject} · {modality}
        </ThemedText>
        <Pill size="xs" style={[styles.rolePill, { backgroundColor: theme.primarySoft }]}>
          <ThemedText type="small" themeColor="primary">
            {i18n.sessions.asRole(roleLabel)}
          </ThemedText>
        </Pill>
      </View>

      {status === 'completed' ? (
        <Pill size="sm" style={{ backgroundColor: theme.successSoft }}>
          <ThemedText type="small" themeColor="success">
            {i18n.sessions.completed}
          </ThemedText>
        </Pill>
      ) : canComplete ? (
        <Pressable
          onPress={onPressComplete}
          disabled={completing}
          accessibilityRole="button"
          accessibilityLabel={i18n.sessions.complete}
          style={[styles.joinButton, { backgroundColor: theme.textPrimary, opacity: completing ? 0.6 : 1 }]}>
          {completing ? (
            <ActivityIndicator size="small" color={theme.onPrimary} />
          ) : (
            <ThemedText type="smallBold" themeColor="onPrimary">
              {i18n.sessions.complete}
            </ThemedText>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={onPressJoin}
          accessibilityRole="button"
          accessibilityLabel={i18n.sessions.join}
          style={[styles.joinButton, { backgroundColor: theme.primary }]}>
          <ThemedText type="smallBold" themeColor="onPrimary">
            {i18n.sessions.join}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  time: {
    width: 44,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  rolePill: {
    marginTop: Spacing.half,
    alignSelf: 'flex-start',
  },
  joinButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
  },
});
