import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing, type ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface ActivityListItemProps extends ViewProps {
  icon: IoniconsName;
  iconColor: ColorToken;
  iconBackground: ColorToken;
  title: string;
  description: string;
  timeAgo: string;
}

/** Linha do histórico "Recentes" nas notificações — só de leitura, sem ação. */
export function ActivityListItem({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  timeAgo,
  style,
  ...rest
}: ActivityListItemProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }, style]} {...rest}>
      <View style={[styles.iconCircle, { backgroundColor: theme[iconBackground] }]}>
        <Ionicons name={icon} size={18} color={theme[iconColor]} />
      </View>

      <View style={styles.content}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={2}>
          {description}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textMuted">
        {timeAgo}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
});
