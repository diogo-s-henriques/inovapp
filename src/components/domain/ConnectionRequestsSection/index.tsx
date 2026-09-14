import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { formatTimeAgo } from '@/lib/time';
import type { ConnectionRequest } from '@/lib/requests';
import { RequestCard } from '@/components/domain/RequestCard';
import { ThemedText } from '@/components/ui/ThemedText';

export interface ConnectionRequestsSectionProps extends ViewProps {
  requests: ConnectionRequest[];
  /** ID do pedido em processamento — desativa os botões só desse cartão. */
  busyId?: string | null;
  /** Mensagem mostrada quando responder falhou (ver src/lib/requests.ts). */
  errorMessage?: string | null;
  onAccept: (request: ConnectionRequest) => void;
  onDecline: (request: ConnectionRequest) => void;
}

/**
 * Pedidos de conexão pendentes, com Aceitar/Recusar. Vive nos Matches porque é lá que a decisão
 * acontece: as Notificações só avisam que chegou um pedido (o mesmo pedido não se responde em dois
 * sítios diferentes). Não renderiza nada quando não há pedidos.
 */
export function ConnectionRequestsSection({
  requests,
  busyId,
  errorMessage,
  onAccept,
  onDecline,
  style,
  ...rest
}: ConnectionRequestsSectionProps) {
  const i18n = useI18n();
  const theme = useTheme();

  if (requests.length === 0) return null;

  return (
    <View style={[styles.section, style]} {...rest}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="textMuted" style={styles.label}>
          {i18n.requests.connectionLabel}
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText type="small" themeColor="onPrimary">
            {requests.length}
          </ThemedText>
        </View>
      </View>

      {errorMessage ? (
        <ThemedText type="small" themeColor="danger">
          {errorMessage}
        </ThemedText>
      ) : null}

      {requests.map((request) => (
        <RequestCard
          key={request.id}
          firstName={request.candidate.firstName}
          lastName={request.candidate.lastName}
          subtitle={`${request.candidate.role} · ${request.candidate.course}`}
          timeAgo={request.createdAt ? formatTimeAgo(request.createdAt, i18n.common.now) : undefined}
          image={request.candidate.image}
          busy={busyId === request.id}
          onAccept={() => onAccept(request)}
          onDecline={() => onDecline(request)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    letterSpacing: 0.5,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
