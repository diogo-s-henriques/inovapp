import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { IconSize, MaxContentWidth, Spacing } from '@/constants/theme';
import { useConnectionRequests } from '@/hooks/use-connection-requests';
import { useConversations } from '@/hooks/use-conversations';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { Translations } from '@/i18n/translations';
import { ThemedText } from '@/components/ui/ThemedText';
import { TAB_ICONS, type TabIconName } from './icons';

const TABS = [
  { name: 'home', href: '/', labelKey: 'home', icon: 'home' },
  { name: 'pesquisar', href: '/pesquisar', labelKey: 'search', icon: 'search' },
  { name: 'matches', href: '/matches', labelKey: 'matches', icon: 'matches' },
  { name: 'chat', href: '/chat', labelKey: 'chat', icon: 'chat' },
  { name: 'perfil', href: '/perfil', labelKey: 'profile', icon: 'profile' },
] as const satisfies readonly {
  name: string;
  href: string;
  labelKey: keyof Translations['navTabs'];
  // O nome do separador (a rota) e o nome do ícone não são sempre o mesmo: o separador chama-se
  // `pesquisar` e `perfil` e os ícones chamam-se `search` e `profile`.
  icon: TabIconName;
}[];

/** Barra de navegação principal em forma de pílula flutuante, com os separadores de topo da app. */
export default function AppTabs() {
  const theme = useTheme();
  const i18n = useI18n();
  // As duas bolinhas leem as mesmas leituras partilhadas que os ecrãs que mostram as listas (ver
  // `useConnectionRequests` e `useConversations`): uma só subscrição para a app toda. Aqui só
  // interessa se há algo, e uma leitura falhada deixa a bolinha como está - quem avisa do erro são
  // os ecrãs que mostram a lista.
  //
  // Bolinha vermelha nos separadores que têm algo à espera: "Chat" enquanto houver pelo menos uma
  // conversa por ler e "Matches" enquanto houver pedidos de conexão por decidir (é lá que se
  // aceitam ou recusam). Vive fora dos ecrãs em si, por isso cada separador trata do seu aviso.
  const { requests: pendingRequests } = useConnectionRequests();
  const { conversations } = useConversations();
  const hasPendingRequests = pendingRequests.length > 0;
  const hasUnreadMessages = conversations.some((conversation) => conversation.unread);

  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild style={styles.tabListContainer}>
        <View style={StyleSheet.flatten([styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }])}>
          {TABS.map(({ name, href, labelKey, icon }) => (
            <TabTrigger key={name} name={name} href={href} asChild>
              <TabButton
                label={i18n.navTabs[labelKey]}
                icon={icon}
                badge={(name === 'chat' && hasUnreadMessages) || (name === 'matches' && hasPendingRequests)}
              />
            </TabTrigger>
          ))}
        </View>
      </TabList>
    </Tabs>
  );
}

interface TabButtonProps extends TabTriggerSlotProps {
  label: string;
  /** Chave do ícone do separador (ver TAB_ICONS). */
  icon: TabIconName;
  badge?: boolean;
}

export function TabButton({ label, icon, badge, isFocused, onPressIn, onPressOut, ...props }: TabButtonProps) {
  const theme = useTheme();
  // O toque não muda o ícone (era o que fazia o par contorno/preenchido): a resposta ao toque é o
  // encolher do ícone, que se vê e não troca nada de sítio.
  const scale = useSharedValue(1);

  // O ativo fica **ameixa** e o inativo cinzento: os ícones são todos de contorno, por isso a cor é
  // tudo o que distingue um do outro. O acento vive aqui porque este é o único sítio do ecrã que
  // diz onde estás - e era o único sítio da barra de baixo sem cor nenhuma.
  const color = theme[isFocused ? 'primaryDark' : 'textMuted'];

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable
        scale.value = withSpring(0.82, { damping: 14, stiffness: 320 });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable
        scale.value = withSpring(1, { damping: 14, stiffness: 320 });
        onPressOut?.(event);
      }}
      style={({ pressed: isPressed }) => [styles.tabButton, isPressed && styles.pressed]}
    >
      <Animated.View style={animatedIconStyle}>
        <View style={[styles.iconChip, isFocused && { backgroundColor: theme.primarySoft }]}>
          <View style={styles.iconWrap}>
            <Ionicons name={TAB_ICONS[icon]} size={IconSize.ui} color={color} />
            {badge && <View style={[styles.badgeDot, { backgroundColor: theme.danger, borderColor: theme.surface }]} />}
          </View>
        </View>
      </Animated.View>
      <ThemedText type="small" themeColor={isFocused ? 'primaryDark' : 'textMuted'}>
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
  // O chip existe sempre, com foco ou sem ele, para o ícone não saltar ao mudar de separador;
  // o que muda é só a cor de fundo.
  iconChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
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
