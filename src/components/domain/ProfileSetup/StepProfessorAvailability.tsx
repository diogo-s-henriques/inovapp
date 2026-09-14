import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { AvailabilityFields } from '@/components/domain/Profile/AvailabilityFields';
import { ThemedText } from '@/components/ui/ThemedText';

export interface StepProfessorAvailabilityProps {
  periods: string[];
  onChangePeriods: (next: string[]) => void;
  modality: string[];
  onChangeModality: (next: string[]) => void;
}

// Passo de disponibilidade do fluxo de professor, mais direto do que o do estudante por
// não depender de eligibilidade para ensinar (professores podem sempre dar aulas).
export function StepProfessorAvailability({
  periods,
  onChangePeriods,
  modality,
  onChangeModality,
}: StepProfessorAvailabilityProps) {
  const i18n = useI18n();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {i18n.profileSetup.availabilityTitle}
      </ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
        {i18n.profileSetup.professorAvailabilitySubtitle}
      </ThemedText>

      <AvailabilityFields
        periods={periods}
        onChangePeriods={onChangePeriods}
        modality={modality}
        onChangeModality={onChangeModality}
      />
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
