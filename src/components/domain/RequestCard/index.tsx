import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing, type ColorToken } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText } from '@/components/ui/ThemedText';

export type RequestCardStatus = 'pending' | 'accepted' | 'declined';

const STATUS_COLOR: Record<RequestCardStatus, ColorToken> = {
  pending: 'warning',
  accepted: 'success',
  declined: 'danger',
};

const STATUS_BACKGROUND: Record<RequestCardStatus, ColorToken> = {
  pending: 'warningSoft',
  accepted: 'successSoft',
  declined: 'dangerSoft',
};

export interface RequestCardProps extends ViewProps {
  firstName: string;
  lastName: string;
  subtitle: string;
  message?: string;
  timeAgo?: string;
  image?: string;
  busy?: boolean; // desativa os botões enquanto o pedido está a ser processado
  onAccept?: () => void;
  onDecline?: () => void;
  // Quando definido, mostra uma pill de estado em vez dos botões Aceitar/Recusar — usado por
  // quem não pode responder (ex.: quem enviou o pedido, a vê-lo no chat).
  status?: RequestCardStatus;
}

/** Cartão usado tanto para pedidos de conexão/sessão no ecrã de notificações como para o pedido
 * de sessão dentro do próprio chat (ver ChatSessionRequestCard) — nesse caso, só quem pode
 * responder vê os botões; quem pediu vê o estado (status). */
export function RequestCard({
  firstName,
  lastName,
  subtitle,
  message,
  timeAgo,
  image,
  busy,
  onAccept,
  onDecline,
  status,
  style,
  ...rest
}: RequestCardProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const STATUS_LABEL: Record<RequestCardStatus, string> = {
    pending: i18n.requestCard.pending,
    accepted: i18n.requestCard.accepted,
    declined: i18n.requestCard.declined,
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.primarySoft, borderColor: theme.borderAccent }, style]} {...rest}>
      <View style={styles.headerRow}>
        <ProfilePicCard firstName={firstName} lastName={lastName} image={image} size="md" />
        <View style={styles.headerInfo}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {firstName} {lastName}
          </ThemedText>
          <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        </View>
        {timeAgo && (
          <ThemedText type="small" themeColor="textMuted">
            {timeAgo}
          </ThemedText>
        )}
      </View>

      {message && (
        <ThemedText type="body" themeColor="primary" style={styles.message}>
          {`"${message}"`}
        </ThemedText>
      )}

      {status ? (
        <Pill size="sm" style={[styles.statusPill, { backgroundColor: theme[STATUS_BACKGROUND[status]] }]}>
          <ThemedText type="smallBold" themeColor={STATUS_COLOR[status]}>
            {STATUS_LABEL[status]}
          </ThemedText>
        </Pill>
      ) : (
        <View style={styles.actionsRow}>
          <Button label={i18n.requestCard.decline} variant="secondary" onPress={onDecline} disabled={busy} style={styles.action} />
          <Button label={i18n.requestCard.accept} variant="primary" onPress={onAccept} disabled={busy} style={styles.action} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  message: {
    fontStyle: 'italic',
  },
  statusPill: {
    alignSelf: 'flex-start',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
