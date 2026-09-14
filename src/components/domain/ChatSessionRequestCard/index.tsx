import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { respondToSessionRequest, subscribeToSessionRequestStatus } from '@/lib/sessions';
import { dateLocaleTag } from '@/lib/time';
import { useLocaleStore } from '@/i18n/store';
import { RequestCard, type RequestCardStatus } from '@/components/domain/RequestCard';
import { ThemedText } from '@/components/ui/ThemedText';
import type { ChatSessionRequestInfo } from '@/types/chat';
import type { SessionModality } from '@/types/session';

function formatDateShort(dateKey: string, locale: 'pt' | 'en'): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString(dateLocaleTag(locale), { day: '2-digit', month: 'short' });
}

export interface ChatSessionRequestCardProps {
  info: ChatSessionRequestInfo;
  fromMe: boolean;
  currentUid: string;
  otherUid: string;
  otherFirstName: string;
  otherLastName: string;
  otherImage?: string;
}

/** Pedido de sessão dentro do chat, reaproveitando o mesmo RequestCard das notificações: quem
 * pediu (fromMe) vê só o estado (Pendente/Aceite/Recusada); quem recebeu vê Aceitar/Recusar
 * enquanto estiver pendente. O estado é lido ao vivo de sessionRequests/{requestId}. */
export function ChatSessionRequestCard({
  info,
  fromMe,
  currentUid,
  otherUid,
  otherFirstName,
  otherLastName,
  otherImage,
}: ChatSessionRequestCardProps) {
  const i18n = useI18n();
  const locale = useLocaleStore((state) => state.locale);
  const [status, setStatus] = useState<RequestCardStatus>('pending');
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => subscribeToSessionRequestStatus(info.requestId, setStatus), [info.requestId]);

  const handleRespond = async (accept: boolean) => {
    setResponding(true);
    setError(false);
    try {
      await respondToSessionRequest(
        {
          id: info.requestId,
          fromUid: otherUid,
          firstName: otherFirstName,
          lastName: otherLastName,
          subject: info.subject,
          date: info.date,
          time: info.time,
          modality: info.modality as SessionModality,
          message: '',
        },
        currentUid,
        accept,
      );
    } catch {
      setError(true);
    } finally {
      setResponding(false);
    }
  };

  return (
    <View style={[styles.wrapper, fromMe ? styles.wrapperMe : styles.wrapperOther]}>
      <RequestCard
        firstName={otherFirstName}
        lastName={otherLastName}
        image={otherImage}
        subtitle={`${info.subject} · ${formatDateShort(info.date, locale)}, ${info.time} · ${info.modality}`}
        message={info.message}
        busy={responding}
        // Quem pediu só vê o estado; quem recebeu só vê os botões enquanto pendente.
        status={fromMe || status !== 'pending' ? status : undefined}
        onAccept={() => handleRespond(true)}
        onDecline={() => handleRespond(false)}
        style={styles.card}
      />
      {error && (
        <ThemedText type="small" themeColor="danger" style={styles.error}>
          {i18n.chat.respondError}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
  },
  wrapperMe: {
    justifyContent: 'flex-end',
  },
  wrapperOther: {
    justifyContent: 'flex-start',
  },
  card: {
    width: '85%',
  },
  error: {
    marginTop: Spacing.one,
  },
});
