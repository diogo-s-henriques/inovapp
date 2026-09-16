import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { goBack } from '@/lib/navigation';
import { respondToConnectionRequest, retryPendingConnectionRequests } from '@/lib/requests';
import type { ConnectionRequest } from '@/lib/requests';
import { useConnectionRequests } from '@/hooks/use-connection-requests';
import { ConnectionRequestsSection } from '@/components/domain/ConnectionRequestsSection';
import { StackHeader } from '@/components/domain/StackHeader';
import { RetryNotice } from '@/components/ui/RetryNotice';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * Pedidos de conexão por decidir, num ecrã só para eles.
 *
 * Existe por causa de um gesto que faltava: a linha "N pedidos de conexão" da Home e o aviso das
 * Notificações levavam à **aba** dos Matches, e mudar de separador não empilha ecrã nenhum — não
 * havia nada por baixo para o deslize de voltar do iOS desempilhar. Este ecrã é um ecrã a sério:
 * entra-se nele por cima de onde se estava e sai-se com o gesto (ou com a seta).
 *
 * Mostra o mesmo que a secção dos Matches, e mostra-o com o mesmo componente
 * (`ConnectionRequestsSection`): aceitar/recusar tem um comportamento só — criar a conversa,
 * fechar o pedido — e não pode passar a haver duas versões dele. O que a lista **não** tem aqui é
 * a sua etiqueta própria (`showHeader={false}`): o título do ecrã já diz o que ela é.
 *
 * O que se perde ao tirar a decisão da aba Matches? Nada, porque ela continua lá: esta é uma
 * segunda porta para a mesma sala, e a sala é a mesma.
 */
export default function ConnectionRequestsScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const { requests, error: loadFailed } = useConnectionRequests();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRespond = async (request: ConnectionRequest, accept: boolean) => {
    if (!user || respondingId) return;
    setRespondingId(request.id);
    setError(null);
    try {
      // Aceitar cria também a conversa (ver src/lib/requests.ts) e o pedido deixa de estar
      // pendente, por isso ele desaparece desta lista sozinho — e a lista vazia mostra o vazio.
      await respondToConnectionRequest(request.id, request.fromUid, user.uid, accept);
    } catch {
      setError(i18n.requests.respondError);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StackHeader
        title={i18n.requests.connectionLabel}
        backLabel={i18n.requests.back}
        onBack={() => goBack(router)}
      />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Sem esta linha, uma leitura negada era indistinguível do vazio que está aqui em cima:
            "não tens pedidos" e "não os consegui ver" davam exactamente o mesmo ecrã. */}
        {loadFailed && (
          <RetryNotice
            message={i18n.requests.loadError}
            onRetry={retryPendingConnectionRequests}
            style={styles.notice}
          />
        )}

        {requests.length > 0 ? (
          <ConnectionRequestsSection
            requests={requests}
            busyId={respondingId}
            errorMessage={error}
            showHeader={false}
            onAccept={(request) => handleRespond(request, true)}
            onDecline={(request) => handleRespond(request, false)}
          />
        ) : (
          <ThemedText themeColor="textMuted" style={styles.empty}>
            {i18n.requests.empty}
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.five,
    paddingBottom: 120,
  },
  notice: {
    marginBottom: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
