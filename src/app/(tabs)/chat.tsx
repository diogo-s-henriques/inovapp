import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { retryConversations } from '@/lib/chat';
import { useConversations } from '@/hooks/use-conversations';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { RetryNotice } from '@/components/ui/RetryNotice';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { ConversationItem } from '@/components/domain/ConversationItem';
import { ScreenHero } from '@/components/domain/ScreenHero';

// Lista das conversas do utilizador, com pesquisa local por nome/papel/disciplina.
export default function ChatScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  // A leitura é partilhada com a barra de baixo, a Home e as Notificações (ver useConversations).
  const { conversations, error: loadError } = useConversations();

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
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={results}
        keyExtractor={(conversation) => conversation.id}
        // A cor por trás da lista é a do topo do gradiente (ver o mesmo raciocínio na Home e nos
        // Matches): é o que aparece na faixa revelada ao puxar o conteúdo para baixo.
        style={[styles.scroll, { backgroundColor: theme.heroTop }]}
        contentContainerStyle={[styles.list, { backgroundColor: theme.background }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <ScreenHero style={styles.hero} topInset={insets.top} title={i18n.chatList.title} />
            {/* A pesquisa fica logo abaixo do bloco e rola com ele: o campo é parte do que o
                ecrã é, e um campo preso ao topo obrigava a lista a começar mais abaixo. */}
            <View style={styles.search}>
              <SearchInput placeholder={i18n.chatList.searchPlaceholder} value={query} onChangeText={setQuery} />
            </View>
            {/* A lista pode estar vazia porque não há conversas **ou** porque a leitura falhou.
                São coisas diferentes, e sem isto davam o mesmo ecrã. */}
            {loadError && (
              <RetryNotice message={i18n.chatList.loadError} onRetry={retryConversations} style={styles.notice} />
            )}
          </>
        }
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
  scroll: {
    flex: 1,
  },
  // O bloco é de fora a fora: o conteúdo tem 24 px de margem, e o gradiente tem de os desfazer
  // para chegar às bordas.
  hero: {
    marginHorizontal: -Spacing.five,
  },
  search: {
    paddingTop: Spacing.five,
  },
  notice: {
    marginTop: Spacing.three,
  },
  list: {
    // A margem subiu de 16 para 24: era a única dos cinco separadores com outro valor, e o bloco
    // tem de desfazer exatamente a margem do ecrã onde assenta.
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: 0,
    paddingBottom: 120,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});

