import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { SubjectsField } from '@/components/domain/Profile/SubjectsField';
import { ThemedText } from '@/components/ui/ThemedText';

export interface StepLearningGoalsProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

// Passo em que o estudante escolhe as disciplinas em que quer ser acompanhado (papel de tutorando).
export function StepLearningGoals({ selected, onChange }: StepLearningGoalsProps) {
  const i18n = useI18n();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {i18n.profileSetup.learningGoalsTitle}
      </ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
        {i18n.profileSetup.learningGoalsSubtitle}
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
