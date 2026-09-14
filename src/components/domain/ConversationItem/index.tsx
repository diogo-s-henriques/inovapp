import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Pill } from '@/components/ui/Pill';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { ThemedText } from '@/components/ui/ThemedText';
import type { PresenceStatus } from '@/types/chat';

export interface ConversationItemProps extends Omit<PressableProps, 'style' | 'role'> {
  firstName: string;
  lastName: string;
  role: string;
  subject: string;
  status?: PresenceStatus;
  lastMessage: string;
  timeLabel: string;
  unread?: boolean;
  image?: string;
}

/** Linha da lista de conversas: avatar com estado de presença, último texto e indicador de não lida. */
export function ConversationItem({
  firstName,
  lastName,
  role,
  subject,
  status,
  lastMessage,
  timeLabel,
  unread,
  image,
  ...rest
}: ConversationItemProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Conversa com ${firstName} ${lastName}`}
      // Fundo destacado e texto a negrito quando há mensagens por ler, para chamar a atenção.
      style={[styles.row, unread && { backgroundColor: theme.primarySoft }]}
      {...rest}>
      <View style={styles.avatarWrap}>
        <ProfilePicCard
          firstName={firstName}
          lastName={lastName}
          image={image}
          size="md"
          style={[styles.avatarRing, { borderColor: theme.surface }]}
        />
        {status && <StatusDot status={status} style={styles.statusDot} />}
      </View>

      <View style={styles.content}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {firstName} {lastName}
        </ThemedText>
        <Pill size="sm" style={{ backgroundColor: theme.primarySoft }}>
          <Text style={[styles.rolePillLabel, { color: theme.primary }]}>
            {role} · {subject}
          </Text>
        </Pill>
        <ThemedText
          type={unread ? 'bodyBold' : 'body'}
          themeColor={unread ? 'textPrimary' : 'textMuted'}
          numberOfLines={1}>
          {lastMessage}
        </ThemedText>
      </View>

      <View style={styles.meta}>
        <ThemedText type="small" themeColor={unread ? 'primary' : 'textMuted'}>
          {timeLabel}
        </ThemedText>
        {unread && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  avatarWrap: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatarRing: {
    borderWidth: 2,
  },
  statusDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    gap: Spacing.half,
  },
  rolePillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    alignItems: 'flex-end',
    gap: Spacing.one,
    paddingTop: Spacing.half,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
