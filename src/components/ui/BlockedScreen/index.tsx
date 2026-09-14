import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/** Estado genérico de "funcionalidade bloqueada": ícone em círculo, título, descrição. Reutilizável em qualquer ecrã que precise de negar acesso com uma explicação. */
export interface BlockedScreenProps {
  icon?: IoniconsName;
  title: string;
  description: string;
}

export function BlockedScreen({ icon = 'lock-closed-outline', title, description }: BlockedScreenProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name={icon} size={28} color={theme.textMuted} />
      </View>

      <ThemedText type="bodyBold" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textMuted" style={styles.description}>
        {description}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.six,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  description: {
    textAlign: 'center',
  },
});
