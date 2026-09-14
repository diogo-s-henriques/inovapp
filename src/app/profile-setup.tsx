import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/domain/ProgressSteps';
import { StepComplete } from '@/components/domain/ProfileSetup/StepComplete';
import { StepCreateProfile } from '@/components/domain/ProfileSetup/StepCreateProfile';
import { StepLearningGoals } from '@/components/domain/ProfileSetup/StepLearningGoals';
import { StepParticipation } from '@/components/domain/ProfileSetup/StepParticipation';
import { StepProfessorAvailability } from '@/components/domain/ProfileSetup/StepProfessorAvailability';
import { StepProfessorProfile } from '@/components/domain/ProfileSetup/StepProfessorProfile';
import { StepProfessorSubjects } from '@/components/domain/ProfileSetup/StepProfessorSubjects';
import type { CourseSelection, ParticipationMode } from '@/types/profile';
import { useAuthStore } from '@/auth/store';
import { completeProfileSetup } from '@/auth/actions';
import { pickProfilePhoto, preparePhotoForUpload } from '@/lib/storage';

// Assistente de configuração inicial do perfil, com passos diferentes para professores.
export default function ProfileSetupScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isProfessor = user?.role === 'professor';
  const totalSteps = 3;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [fullName, setFullName] = useState('');
  const [course, setCourse] = useState<CourseSelection>();
  const [year, setYear] = useState<string>();
  const [about, setAbout] = useState('');
  const [learningSubjects, setLearningSubjects] = useState<string[]>([]);
  const [participationMode, setParticipationMode] = useState<ParticipationMode>();
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [modality, setModality] = useState<string[]>([]);

  // Passar de totalSteps mostra o passo final de "concluído" em vez de outro formulário.
  const isComplete = step > totalSteps;

  const goNext = () => setStep((value) => value + 1);

  const pickPhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) setPhotoUri(uri);
  };

  const goFinish = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const preparedPhoto = photoUri ? await preparePhotoForUpload(photoUri) : undefined;

      await completeProfileSetup(user.uid, {
        photoUri: preparedPhoto,
        fullName,
        about,
        course: isProfessor ? undefined : course,
        year: isProfessor ? undefined : year,
        learningSubjects: isProfessor ? [] : learningSubjects,
        participationMode: isProfessor ? 'teach' : participationMode,
        teachingSubjects,
        availabilityPeriods: periods,
        availabilityModality: modality,
      });
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  // Nome é obrigatório no passo 1; modo de participação é obrigatório no passo 3 (só para estudantes).
  const canContinue =
    !saving &&
    (isProfessor
      ? step !== 1 || fullName.trim().length > 0
      : (step !== 1 || fullName.trim().length > 0) && (step !== 3 || !!participationMode));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <ProgressSteps steps={totalSteps} currentStep={Math.min(step, totalSteps)} style={styles.progress} />

      {isComplete ? (
        <StepComplete />
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isProfessor ? (
            <>
              {step === 1 && (
                <StepProfessorProfile
                  photoUri={photoUri}
                  onPickPhoto={pickPhoto}
                  fullName={fullName}
                  onChangeFullName={setFullName}
                  about={about}
                  onChangeAbout={setAbout}
                />
              )}
              {step === 2 && <StepProfessorSubjects selected={teachingSubjects} onChange={setTeachingSubjects} />}
              {step === 3 && (
                <StepProfessorAvailability
                  periods={periods}
                  onChangePeriods={setPeriods}
                  modality={modality}
                  onChangeModality={setModality}
                />
              )}
            </>
          ) : (
            <>
              {step === 1 && (
                <StepCreateProfile
                  photoUri={photoUri}
                  onPickPhoto={pickPhoto}
                  fullName={fullName}
                  onChangeFullName={setFullName}
                  course={course}
                  onChangeCourse={setCourse}
                  year={year}
                  onChangeYear={setYear}
                  about={about}
                  onChangeAbout={setAbout}
                />
              )}
              {step === 2 && <StepLearningGoals selected={learningSubjects} onChange={setLearningSubjects} />}
              {step === 3 && (
                <StepParticipation
                  mode={participationMode}
                  onChangeMode={setParticipationMode}
                  year={year}
                  teachingSubjects={teachingSubjects}
                  onChangeTeachingSubjects={setTeachingSubjects}
                  periods={periods}
                  onChangePeriods={setPeriods}
                  modality={modality}
                  onChangeModality={setModality}
                />
              )}
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button
          label={isComplete ? (saving ? i18n.profileSetup.finishing : i18n.profileSetup.finish) : i18n.common.continue}
          variant="primary"
          onPress={isComplete ? goFinish : goNext}
          disabled={!canContinue}
        />
        {step === 2 && <Button label={i18n.profileSetup.skipForNow} variant="link" onPress={goNext} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    paddingHorizontal: Spacing.five,
    marginTop: Spacing.three,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
  },
  footer: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.one,
  },
});
