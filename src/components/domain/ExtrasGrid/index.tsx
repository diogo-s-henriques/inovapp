import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { ExtraCard } from '@/components/ui/ExtraCard';

export interface ExtrasGridProps extends ViewProps {
  sessionsCount?: number;
  onPressSessions?: () => void;
  onPressSubjects?: () => void;
}

/** Grelha de atalhos rápidos do ecrã inicial, para as sessões agendadas e os materiais partilhados. */
export function ExtrasGrid({ sessionsCount = 0, onPressSessions, onPressSubjects, style, ...rest }: ExtrasGridProps) {
  const i18n = useI18n();

  return (
    <View style={[styles.row, style]} {...rest}>
      <ExtraCard
        icon="calendar-outline"
        title={i18n.home.sessionsTitle}
        subtitle={i18n.home.sessionsCount(sessionsCount)}
        iconColor="primary"
        iconBackground="primarySoft"
        onPress={onPressSessions}
      />
      <ExtraCard
        icon="document-text-outline"
        title={i18n.home.materialsTitle}
        subtitle={i18n.home.materialsExploreAll}
        iconColor="success"
        iconBackground="successSoft"
        onPress={onPressSubjects}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
