import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText } from '@/components/ui/ThemedText';

export interface HomeHeaderProps extends ViewProps {
  name: string;
  initials?: string;
  photoUri?: string;
  unreadNotifications?: number;
  onPressNotifications?: () => void;
}

export function HomeHeader({
  name,
  initials,
  photoUri,
  unreadNotifications = 0,
  onPressNotifications,
  style,
  ...rest
}: HomeHeaderProps) {
  const theme = useTheme();
  const i18n = useI18n();

  return (
    <View style={[styles.row, style]} {...rest}>
      <ProfilePicCard
        image={photoUri}
        // Sem iniciais explícitas, usa a primeira letra do nome como alternativa.
        initials={initials || name.charAt(0).toUpperCase()}
        accessibilityLabel={name}
        size={48}
        fontSize={18}
        backgroundColor={theme.primaryDark}
        textColor={theme.onPrimary}
      />

      <View style={styles.greeting}>
        <ThemedText type="body" themeColor="textMuted">
          {i18n.home.greeting}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.name}>
          {name}
        </ThemedText>
      </View>

      <Pressable
        onPress={onPressNotifications}
        accessibilityRole="button"
        accessibilityLabel={i18n.home.notifications}
        hitSlop={8}
        // Branco com contorno: sobre o fundo azulado do ecrã, um círculo do mesmo tom diluía-se.
        style={[styles.bellButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="notifications-outline" size={22} color={theme.textPrimary} />
        {/* Ponto de aviso só aparece quando há notificações por ler. */}
        {unreadNotifications > 0 && <View style={[styles.badge, { backgroundColor: theme.danger }]} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    flex: 1,
  },
  name: {
    fontSize: 20,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
