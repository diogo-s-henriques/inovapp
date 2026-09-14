import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { SubjectsField } from '@/components/domain/Profile/SubjectsField';
import { ThemedText } from '@/components/ui/ThemedText';

export interface StepProfessorSubjectsProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

// Passo em que o professor escolhe as disciplinas que pode lecionar; ao contrário do
// estudante, o professor não precisa de cumprir a regra de elegibilidade para ensinar.
export function StepProfessorSubjects({ selected, onChange }: StepProfessorSubjectsProps) {
  const i18n = useI18n();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {i18n.profileSetup.professorSubjectsTitle}
      </ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
        {i18n.profileSetup.professorSubjectsSubtitle}
      </ThemedText>

      <SubjectsField selected={selected} onChange={onChange} showCount />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  title: {
    textTransform: 'none',
  },
  subtitle: {
    marginBottom: Spacing.three,
  },
});
