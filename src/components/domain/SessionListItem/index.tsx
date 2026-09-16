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
  onPressComplete?: () => void;
}

/**
 * Linha de sessão na agenda (src/app/sessions.tsx); o papel muda consoante quem vê o ecrã.
 *
 * A única ação é **Terminar**, e só de quem é Mentor/Tutor nessa sessão. Houve aqui um botão
 * "Entrar" que abria um aviso a prometer algo que a app não fazia. A app **não** faz chamadas: a
 * modalidade "Online" continua a existir (é como as pessoas combinam encontrar-se) e o sítio onde
 * isso se combina é o chat, que é onde a conversa já está. Depois de terminada, a linha passa a
 * mostrar o estado e mais nada.
 */
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
          style={[styles.actionButton, { backgroundColor: theme.textPrimary, opacity: completing ? 0.6 : 1 }]}>
          {completing ? (
            <ActivityIndicator size="small" color={theme.onPrimary} />
          ) : (
            <ThemedText type="smallBold" themeColor="onPrimary">
              {i18n.sessions.complete}
            </ThemedText>
          )}
        </Pressable>
      ) : null}
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
  actionButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
  },
});
