import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { PARTICIPATION_MODES, canTeach, isEligibleToTeach } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { AvailabilityFields } from '@/components/domain/Profile/AvailabilityFields';
import { SubjectsField } from '@/components/domain/Profile/SubjectsField';
import { SelectableCard } from '@/components/ui/SelectableCard';
import { ThemedText } from '@/components/ui/ThemedText';
import type { ParticipationMode } from '@/types/profile';

export interface StepParticipationProps {
  mode?: ParticipationMode;
  onChangeMode: (mode: ParticipationMode) => void;
  year?: string;
  teachingSubjects: string[];
  onChangeTeachingSubjects: (next: string[]) => void;
  periods: string[];
  onChangePeriods: (next: string[]) => void;
  modality: string[];
  onChangeModality: (next: string[]) => void;
}

// Passo em que o estudante escolhe se quer ser mentor, tutorando, ou ambos.
export function StepParticipation({
  mode,
  onChangeMode,
  year,
  teachingSubjects,
  onChangeTeachingSubjects,
  periods,
  onChangePeriods,
  modality,
  onChangeModality,
}: StepParticipationProps) {
  const i18n = useI18n();
  // Só é possível ser mentor a partir do 2º ano (ver isEligibleToTeach).
  const eligibleToTeach = isEligibleToTeach(year);

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {i18n.profileSetup.participationTitle}
      </ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
        {i18n.profileSetup.participationSubtitle}
      </ThemedText>

      <View style={styles.cards}>
        {PARTICIPATION_MODES.map((option) => {
          const requiresEligibility = option.mode === 'teach' || option.mode === 'both';
          const disabled = requiresEligibility && !eligibleToTeach;
          return (
            <View key={option.mode} style={disabled && styles.cardDisabled}>
              <SelectableCard
                icon={option.icon}
                title={i18n.participationModes[option.mode].setupTitle}
                subtitle={i18n.participationModes[option.mode].setupSubtitle}
                selected={mode === option.mode}
                onPress={() => onChangeMode(option.mode)}
                disabled={disabled}
              />
            </View>
          );
        })}
      </View>

      {!eligibleToTeach && (
        <ThemedText type="small" themeColor="textMuted" style={styles.eligibilityHint}>
          {i18n.profileSetup.eligibilityHint}
        </ThemedText>
      )}

      {canTeach(mode) && (
        <View style={styles.section}>
          <ThemedText type="bodyBold">{i18n.profileSetup.teachingSubjectsTitle}</ThemedText>
          <SubjectsField
            selected={teachingSubjects}
            onChange={onChangeTeachingSubjects}
            hint={i18n.profileSetup.teachingSubjectsHint}
          />
        </View>
      )}

      <View style={styles.section}>
        <ThemedText type="bodyBold">{i18n.profileSetup.availabilityTitle}</ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.sectionHint}>
          {i18n.profileSetup.availabilityHint}
        </ThemedText>
        <AvailabilityFields
          periods={periods}
          onChangePeriods={onChangePeriods}
          modality={modality}
          onChangeModality={onChangeModality}
        />
      </View>
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
    marginBottom: Spacing.two,
  },
  cards: {
    gap: Spacing.two,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  eligibilityHint: {
    marginTop: -Spacing.one,
  },
  section: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  sectionHint: {
    marginTop: -Spacing.one,
  },
});
