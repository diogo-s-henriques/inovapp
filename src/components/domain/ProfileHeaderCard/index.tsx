import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getInitials } from '@/lib/initials';
import { HighlightCard } from '@/components/ui/HighlightCard';
import { Pill } from '@/components/ui/Pill';
import { ThemedText } from '@/components/ui/ThemedText';

export interface ProfileHeaderCardProps extends ViewProps {
  name: string;
  courseAndYear: string;
  roleLabel: string;
  photoUri?: string;
}

// Cartão de destaque no topo do ecrã de perfil, com avatar, nome e curso/ano. A avaliação por
// estrelas é interna (ver ratings) e não é para ser mostrada publicamente.
export function ProfileHeaderCard({ name, courseAndYear, roleLabel, photoUri, style, ...rest }: ProfileHeaderCardProps) {
  const theme = useTheme();

  return (
    <HighlightCard
      colors={[theme.primaryDark, theme.primaryDark]}
      size="large"
      avatarInitials={getInitials(name)}
      avatarImage={photoUri}
      name={name}
      subtitle={courseAndYear}
      meta={
        <View style={styles.metaRow}>
          <Pill size="sm" style={{ backgroundColor: theme.surface }}>
            <ThemedText type="smallBold" themeColor="textPrimary">
              {roleLabel}
            </ThemedText>
          </Pill>
        </View>
      }
      style={style}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
