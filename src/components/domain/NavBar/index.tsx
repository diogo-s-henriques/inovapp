import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { subscribeToConversations } from '@/lib/chat';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { Translations } from '@/i18n/translations';
import { ThemedText } from '@/components/ui/ThemedText';
import { TAB_ICONS, type TabIconName } from './icons';

const TABS = [
  { name: 'home', href: '/', labelKey: 'home', icon: TAB_ICONS.home },
  { name: 'pesquisar', href: '/pesquisar', labelKey: 'search', icon: TAB_ICONS.search },
  { name: 'matches', href: '/matches', labelKey: 'matches', icon: TAB_ICONS.matches },
  { name: 'chat', href: '/chat', labelKey: 'chat', icon: TAB_ICONS.chat },
  { name: 'perfil', href: '/perfil', labelKey: 'profile', icon: TAB_ICONS.profile },
] as const satisfies readonly { name: string; href: string; labelKey: keyof Translations['navTabs']; icon: TabIconName }[];

/** Barra de navegação principal em forma de pílula flutuante, com os separadores de topo da app. */
export default function AppTabs() {
  const theme = useTheme();
  const i18n = useI18n();
  const user = useAuthStore((state) => state.user);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Bolinha vermelha no separador "Chat" enquanto houver pelo menos uma conversa por ler,
  // independentemente do ecrã em que o utilizador esteja (a NavBar vive fora dos ecrãs em si).
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.uid, (conversations) =>
      setHasUnreadMessages(conversations.some((conversation) => conversation.unread)),
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild style={styles.tabListContainer}>
        <View style={StyleSheet.flatten([styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }])}>
          {TABS.map(({ name, href, labelKey, icon }) => (
            <TabTrigger key={name} name={name} href={href} asChild>
              <TabButton label={i18n.navTabs[labelKey]} icon={icon} badge={name === 'chat' && hasUnreadMessages} />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  icon: TabIconName;
  badge?: boolean;
}

export function TabButton({ label, icon, badge, isFocused, onPressIn, onPressOut, ...props }: TabButtonProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);

  const color = theme[isFocused ? 'primary' : 'textNav'];
  // Ícone preenchido tanto quando o separador está ativo como durante o próprio toque.
  const filled = isFocused || pressed;

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable
        scale.value = withSpring(0.82, { damping: 14, stiffness: 320 });
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        setPressed(false);
        onPressOut?.(event);
      }}
      style={({ pressed: isPressed }) => [styles.tabButton, isPressed && styles.pressed]}
    >
      <Animated.View style={animatedIconStyle}>
        <View style={styles.iconWrap}>
          <Ionicons name={filled ? icon.filled : icon.outline} size={22} color={color} />
          {badge && <View style={[styles.badgeDot, { backgroundColor: theme.danger, borderColor: theme.surface }]} />}
        </View>
      </Animated.View>
      <ThemedText type="small" themeColor={isFocused ? 'primary' : 'textNav'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flex: 1,
  },
  tabListContainer: {
    position: 'absolute',
    bottom: Spacing.four,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  pill: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.six,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
