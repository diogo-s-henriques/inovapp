import { Pressable, StyleSheet, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getInitials } from '@/lib/initials';
import { HighlightCard } from '@/components/ui/HighlightCard';
import { ThemedText } from '@/components/ui/ThemedText';

export interface NextSessionCardProps extends ViewProps {
  tutorName: string;
  subject: string;
  schedule: string;
  onPressJoin: () => void;
}

/** Destaque da próxima sessão agendada no ecrã inicial, com atalho direto para entrar nela. */
export function NextSessionCard({ tutorName, subject, schedule, onPressJoin, style, ...rest }: NextSessionCardProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const initials = getInitials(tutorName);

  return (
    <HighlightCard
      colors={[theme.primaryDark, theme.primaryDark]}
      label={i18n.home.nextSession}
      avatarInitials={initials}
      name={tutorName}
      subtitle={`${subject} · ${schedule}`}
      trailing={
        <Pressable
          onPress={onPressJoin}
          accessibilityRole="button"
          accessibilityLabel={i18n.home.join}
          style={[styles.joinButton, { backgroundColor: theme.surface }]}>
          <ThemedText type="smallBold" themeColor="primary">
            {i18n.home.join}
          </ThemedText>
        </Pressable>
      }
      style={style}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  joinButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.six,
  },
});
