import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { IconSize, Spacing, type ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityKind } from '@/types/activity';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/**
 * Ícone e cor de cada tipo de entrada do histórico.
 *
 * Vive aqui, junto da linha que os desenha, porque a lista é a mesma em dois ecrãs (Notificações e,
 * em resumo, a Home) e um ícone diferente para o mesmo acontecimento era uma inconsistência à
 * espera de acontecer.
 *
 * Verde nas duas entradas que **aconteceram** (uma conexão ou uma sessão aceites) e ameixa nas duas
 * que apenas **se aproximam** (a sessão de amanhã, o material recebido): o verde é um estado - o
 * visto continua a dizer "correu bem" mesmo a preto - e o acento é a cor de tudo o que é neutro na
 * app. Foi por isso que o material deixou o cinzento: era a única caixa das quatro sem nada a dizer.
 */
export const ACTIVITY_ITEM_ICON: Record<
  ActivityKind,
  { icon: IoniconsName; color: ColorToken; background: ColorToken }
> = {
  'connection-accepted': { icon: 'checkmark-circle-outline', color: 'textPrimary', background: 'successSoft' },
  'session-accepted': { icon: 'checkmark-circle-outline', color: 'textPrimary', background: 'successSoft' },
  'session-tomorrow': { icon: 'calendar-outline', color: 'primary', background: 'primarySoft' },
  'material-received': { icon: 'document-text-outline', color: 'primary', background: 'primarySoft' },
};

export interface ActivityListItemProps extends ViewProps {
  icon: IoniconsName;
  iconColor: ColorToken;
  iconBackground: ColorToken;
  title: string;
  description: string;
  timeAgo: string;
}

/** Linha do histórico "Recentes" nas notificações - só de leitura, sem ação. */
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
        <Ionicons name={icon} size={IconSize.ui} color={theme[iconColor]} />
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
