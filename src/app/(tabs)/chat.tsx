import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { subscribeToConversations } from '@/lib/chat';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { ConversationItem } from '@/components/domain/ConversationItem';
import type { Conversation } from '@/types/chat';

// Lista das conversas do utilizador, com pesquisa local por nome/papel/disciplina.
export default function ChatScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, setConversations);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.firstName} ${conversation.lastName} ${conversation.role} ${conversation.subject}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [conversations, query]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          {i18n.chatList.title}
        </ThemedText>
        <SearchInput placeholder={i18n.chatList.searchPlaceholder} value={query} onChangeText={setQuery} />
      </View>

      <FlatList
        data={results}
        keyExtractor={(conversation) => conversation.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ThemedText themeColor="textMuted" style={styles.empty}>
            {i18n.chatList.empty}
          </ThemedText>
        }
        renderItem={({ item }) => (
          <ConversationItem
            firstName={item.firstName}
            lastName={item.lastName}
            role={item.role}
            subject={item.subject}
            status={item.status}
            lastMessage={item.lastMessage}
            timeLabel={item.timeLabel}
            unread={item.unread}
            image={item.image}
            onPress={() =>
              router.push({
                pathname: '/chat/[id]',
                params: {
                  id: item.id,
                  firstName: item.firstName,
                  lastName: item.lastName,
                  role: item.role,
                  subject: item.subject,
                  image: item.image ?? '',
                },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    textTransform: 'none',
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: 120,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});

