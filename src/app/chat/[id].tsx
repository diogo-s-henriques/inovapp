import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { CHAT_MESSAGE_PAGE_SIZE, markConversationRead, sendMessage, subscribeToMessages } from '@/lib/chat';
import { goBack } from '@/lib/navigation';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText } from '@/components/ui/ThemedText';
import { AttachFileSheet } from '@/components/domain/AttachFileSheet';
import { ChatBubble } from '@/components/domain/ChatBubble';
import { ChatSessionRequestCard } from '@/components/domain/ChatSessionRequestCard';
import type { ChatAttachment, ChatMessage } from '@/types/chat';

// Ecrã de conversa individual; o Chat só desbloqueia depois de o pedido de conexão ser aceite.
export default function ConversationScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { id, firstName, lastName, role, subject, image } = useLocalSearchParams<{
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    subject?: string;
    image?: string;
  }>();
  // O id da conversa é composto pelos dois uids; extrai o do outro participante.
  const otherUid = user ? id.split('_').find((uid) => uid !== user.uid) : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Página de mensagens pedida ao Firestore; cresce quando se carrega histórico mais antigo.
  const [pageSize, setPageSize] = useState(CHAT_MESSAGE_PAGE_SIZE);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const attachSheetRef = useRef<BottomSheetModal>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = subscribeToMessages(id, user.uid, setMessages, pageSize);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.uid, pageSize]);

  useFocusEffect(
    useCallback(() => {
      if (id && user) markConversationRead(id, user.uid);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.uid]),
  );

  if (!id || !otherUid) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
        <ThemedText themeColor="textMuted" style={styles.notFound}>
          {i18n.chat.notFound}
        </ThemedText>
      </SafeAreaView>
    );
  }

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !user) return;
    setDraft('');
    setSendError(false);
    try {
      await sendMessage(id, user.uid, otherUid, text);
    } catch {
      setDraft(text);
      setSendError(true);
    }
  };

  const handleSendAttachment = async (attachment: ChatAttachment) => {
    if (!user) return;
    setSendError(false);
    try {
      await sendMessage(id, user.uid, otherUid, '', attachment);
      attachSheetRef.current?.dismiss();
    } catch {
      setSendError(true);
    }
  };

  // Só salta para o fundo quando chega uma mensagem nova. Quando o que cresceu foi o histórico
  // (o utilizador carregou mensagens anteriores), saltar para o fundo perdia-lhe o sítio.
  const handleContentSizeChange = () => {
    const lastMessageId = messages[messages.length - 1]?.id ?? null;
    if (lastMessageId === lastMessageIdRef.current) return;
    lastMessageIdRef.current = lastMessageId;
    listRef.current?.scrollToEnd({ animated: false });
  };

  const handleScheduleSession = () => {
    router.push({
      pathname: '/session-request',
      params: { toUid: otherUid, firstName, lastName },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => goBack(router, '/chat')} accessibilityRole="button" accessibilityLabel={i18n.chat.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </Pressable>

        <ProfilePicCard firstName={firstName} lastName={lastName} image={image || undefined} size="sm" />

        <View style={styles.headerInfo}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {firstName} {lastName}
          </ThemedText>
          <ThemedText type="small" themeColor="primary">
            {role} · {subject}
          </ThemedText>
        </View>

      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 90, default: 0 })}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={handleContentSizeChange}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Só aparece quando a primeira página veio cheia: é sinal de que pode haver mais. */}
              {messages.length >= pageSize && (
                <Button
                  label={i18n.chat.loadEarlierMessages}
                  variant="link"
                  onPress={() => setPageSize((size) => size + CHAT_MESSAGE_PAGE_SIZE)}
                />
              )}
              <View style={styles.dateSeparator}>
                <Pill
                  size="sm"
                  style={{
                    backgroundColor: theme.surfaceAlt,
                    paddingVertical: Spacing.half,
                    paddingHorizontal: Spacing.three,
                  }}>
                  <ThemedText type="small" themeColor="textMuted">
                    {i18n.chat.today}
                  </ThemedText>
                </Pill>
              </View>
            </View>
          }
          renderItem={({ item }) =>
            item.sessionRequest && user ? (
              <ChatSessionRequestCard
                info={item.sessionRequest}
                fromMe={item.fromMe}
                currentUid={user.uid}
                otherUid={otherUid}
                otherFirstName={firstName ?? ''}
                otherLastName={lastName ?? ''}
                otherImage={image || undefined}
              />
            ) : (
              <ChatBubble text={item.text} fromMe={item.fromMe} attachment={item.attachment} />
            )
          }
          ItemSeparatorComponent={() => <View style={styles.bubbleGap} />}
        />

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          {sendError && (
            <ThemedText type="small" themeColor="danger">
              {i18n.chat.sendError}
            </ThemedText>
          )}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleScheduleSession}
              style={[styles.actionPill, { borderColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel={i18n.chat.scheduleSession}>
              <Ionicons name="calendar-outline" size={16} color={theme.primary} />
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {i18n.chat.scheduleSession}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => attachSheetRef.current?.present()}
              style={[styles.actionPill, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel={i18n.chat.material}>
              <Ionicons name="document-outline" size={16} color={theme.textPrimary} />
              <ThemedText type="smallBold" style={{ color: theme.textPrimary }}>
                {i18n.chat.material}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceAlt }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={i18n.chat.inputPlaceholder}
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.textPrimary }]}
                multiline
              />
              <Pressable
                onPress={handleSend}
                disabled={!draft.trim()}
                style={[styles.sendButton, { backgroundColor: theme.primary, opacity: draft.trim() ? 1 : 0.5 }]}
                accessibilityRole="button"
                accessibilityLabel={i18n.chat.sendMessage}>
                <Ionicons name="send" size={16} color={theme.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AttachFileSheet ref={attachSheetRef} onSubmit={handleSendAttachment} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  messages: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  listHeader: {
    gap: Spacing.two,
  },
  dateSeparator: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  bubbleGap: {
    height: Spacing.two,
  },
  footer: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
    borderWidth: 1.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    borderRadius: Spacing.six,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
