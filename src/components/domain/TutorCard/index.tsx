import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PersonalCardInfo } from '@/components/ui/PersonalCardInfo';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';

export interface TutorCardProps extends Omit<PressableProps, 'style'> {
  firstName: string;
  lastName: string;
  course: string;
  year: string;
  image?: string;
}

/** Cartão de mentor nas listagens de pesquisa. A avaliação por estrelas é interna (ver ratings)
 * e não é para ser mostrada publicamente. */
export function TutorCard({ firstName, lastName, course, year, image, ...rest }: TutorCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${firstName} ${lastName}, ${course}`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      {...rest}>
      <ProfilePicCard firstName={firstName} lastName={lastName} image={image} size="md" />
      <View style={styles.info}>
        <PersonalCardInfo name={`${firstName} ${lastName}`} course={course} year={year} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  info: {
    flex: 1,
  },
});
