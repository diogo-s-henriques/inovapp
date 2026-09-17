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
  /** ID do pedido em processamento - desativa os botões só desse cartão. */
  busyId?: string | null;
  /** Mensagem mostrada quando responder falhou (ver src/lib/requests.ts). */
  errorMessage?: string | null;
  /**
   * Esconde a etiqueta própria (e o número) quando o ecrã que a usa já tem um título que diz o
   * mesmo - é o caso de `connection-requests`, onde a lista **é** o ecrã.
   */
  showHeader?: boolean;
  onAccept: (request: ConnectionRequest) => void;
  onDecline: (request: ConnectionRequest) => void;
}

/**
 * Pedidos de conexão pendentes, com Aceitar/Recusar. Não renderiza nada quando não há pedidos.
 *
 * Tem dois anfitriões, e é uma decisão consciente: a aba dos Matches (onde a decisão sempre viveu,
 * e para onde apontam a linha "N pedidos de conexão" da Home e o aviso das Notificações) e o ecrã
 * `connection-requests`, que é a mesma lista sozinha no ecrã e serve quem chega por um link - o
 * `url` de um aviso traz a pessoa directamente aos pedidos (ver src/push/listener.ts), e aí o que
 * ela quer é a lista, sem o resto do ecrã dos Matches à volta.
 *
 * A alternativa era tirar a decisão dos Matches, e não foi tomada: a lista dos Matches é onde a
 * pessoa a espera encontrar, e isso foi pedido antes deste ecrã existir.
 */
export function ConnectionRequestsSection({
  requests,
  busyId,
  errorMessage,
  showHeader = true,
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
      {showHeader ? (
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
      ) : null}

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
