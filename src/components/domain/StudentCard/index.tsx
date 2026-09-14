import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ButtonAddPerson } from '@/components/ui/ButtonAddPerson';
import { PersonalCardInfo } from '@/components/ui/PersonalCardInfo';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { TagProfile } from '@/components/ui/TagProfile';

export interface StudentCardProps extends ViewProps {
  firstName: string;
  lastName: string;
  course: string;
  year: string;
  tags: string[];
  image?: string;
  maxVisibleTags?: number;
  added?: boolean;
  defaultAdded?: boolean;
  onToggleAdded?: (added: boolean) => void;
}

/** Cartão de estudante nas listagens de pesquisa/conexões, com tags de interesse e botão de adicionar. */
export function StudentCard({
  firstName,
  lastName,
  course,
  year,
  tags,
  image,
  maxVisibleTags = 2,
  added,
  defaultAdded = false,
  onToggleAdded,
  style,
  ...rest
}: StudentCardProps) {
  const theme = useTheme();
  // mostra só as primeiras N tags e resume o resto num chip "+X"
  const visibleTags = tags.slice(0, maxVisibleTags);
  const overflowCount = tags.length - visibleTags.length;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]} {...rest}>
      <ProfilePicCard firstName={firstName} lastName={lastName} image={image} size="md" />
      <View style={styles.info}>
        <PersonalCardInfo name={`${firstName} ${lastName}`} course={course} year={year} />
        <View style={styles.tags}>
          {visibleTags.map((tag, index) => (
            <TagProfile key={`${tag}-${index}`} title={tag} interactive={false} style={styles.tag} />
          ))}
          {overflowCount > 0 && <TagProfile title={`+${overflowCount}`} interactive={false} style={styles.overflowTag} />}
        </View>
      </View>
      <ButtonAddPerson added={added} defaultAdded={defaultAdded} onToggle={onToggleAdded} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    // 'flex-start' (não 'center'): mantém o avatar e o botão alinhados ao topo do cartão.
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: Spacing.two,
  },
  tags: {
    flexDirection: 'row',
    // Nunca envolve para uma 2ª linha — sem isto, tags compridas/muitas esticavam o cartão em
    // altura. Em vez de quebrar linha, as tags encolhem (ver styles.tag) e o texto trunca com "…".
    flexWrap: 'nowrap',
    overflow: 'hidden',
    gap: Spacing.one,
  },
  tag: {
    flexShrink: 1,
  },
  overflowTag: {
    // O chip "+N" nunca encolhe nem é cortado — as tags reais (styles.tag) é que cedem espaço.
    flexShrink: 0,
  },
});
