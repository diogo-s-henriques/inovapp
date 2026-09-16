import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/**
 * Estado genérico de "funcionalidade bloqueada": ícone em círculo, título e, quando houver algo a
 * explicar, uma descrição. Reutilizável em qualquer ecrã que precise de negar acesso.
 *
 * A descrição é opcional desde que o Match deixou de explicar porque não tem nada para mostrar:
 * quem só ensina tem os pedidos por decidir no topo do ecrã, e um parágrafo a justificar a
 * ausência de uma lista que ninguém pediu era texto a mais.
 */
export interface BlockedScreenProps {
  icon?: IoniconsName;
  title: string;
  description?: string;
}

export function BlockedScreen({ icon = 'lock-closed-outline', title, description }: BlockedScreenProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name={icon} size={IconSize.state} color={theme.textPrimary} />
      </View>

      <ThemedText type="bodyBold" style={styles.title}>
        {title}
      </ThemedText>
      {description && (
        <ThemedText type="small" themeColor="textMuted" style={styles.description}>
          {description}
        </ThemedText>
      )}
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
