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
import { StepProfessorAvailability } from '@/components/domain/ProfileSetup/StepProfessorAvailability';
import { StepProfessorProfile } from '@/components/domain/ProfileSetup/StepProfessorProfile';
import { StepProfessorSubjects } from '@/components/domain/ProfileSetup/StepProfessorSubjects';
import type { CourseSelection } from '@/types/profile';
import { useAuthStore } from '@/auth/store';
import { completeProfileSetup } from '@/auth/actions';
import { canContinueSetup, setupSteps } from '@/lib/profile-form';
import { pickPreparedProfilePhoto } from '@/lib/storage';

/**
 * Assistente de configuração inicial do perfil.
 *
 * Os passos são diferentes para os dois papéis, e a diferença vem toda da mesma regra (ver
 * `getAccountRole` em src/constants/auth.ts): um **docente** tem três passos - perfil, disciplinas
 * que ensina e disponibilidade -, porque é ele que aparece na descoberta; um **aluno** tem dois -
 * perfil e objetivos de aprendizagem -, porque é ele que procura, e não há mais nada para lhe
 * perguntar. O passo em que se escolhia "quero aprender / quero ensinar" saiu: com o papel preso ao
 * email, não havia escolha nenhuma para fazer.
 */
export default function ProfileSetupScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isProfessor = user?.role === 'professor';
  // Quantos passos tem este fluxo é uma decisão do papel, e vive em src/lib/profile-form.ts com as
  // outras regras do assistente: um aluno tem dois (perfil e objetivos), um docente tem três.
  const totalSteps = setupSteps(isProfessor);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [fullName, setFullName] = useState('');
  const [course, setCourse] = useState<CourseSelection>();
  const [year, setYear] = useState<string>();
  const [about, setAbout] = useState('');
  const [learningSubjects, setLearningSubjects] = useState<string[]>([]);
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [modality, setModality] = useState<string[]>([]);

  // Passar de totalSteps mostra o passo final de "concluído" em vez de outro formulário.
  const isComplete = step > totalSteps;

  const goNext = () => setStep((value) => value + 1);

  // Já preparada na escolha (ver src/lib/storage.ts) - no passo final só se escreve.
  const pickPhoto = async () => {
    const prepared = await pickPreparedProfilePhoto();
    if (prepared) setPhotoUri(prepared);
  };

  const goFinish = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await completeProfileSetup(user.uid, {
        photoUri,
        fullName,
        about,
        course: isProfessor ? undefined : course,
        year: isProfessor ? undefined : year,
        learningSubjects: isProfessor ? [] : learningSubjects,
        teachingSubjects,
        availabilityPeriods: periods,
        availabilityModality: modality,
      });
      router.replace('/');
    } finally {
      setSaving(false);
    }
  };

  // As regras de "posso avançar?" vivem em src/lib/profile-form.ts (nome no passo 1, e mais nada).
  // Aqui só se junta o "e não está a guardar".
  const canContinue = canContinueSetup({ isProfessor, step, fullName, year });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Button
          label={isComplete ? (saving ? i18n.profileSetup.finishing : i18n.profileSetup.finish) : i18n.common.continue}
          variant="primary"
          onPress={isComplete ? goFinish : goNext}
          disabled={!canContinue || saving}
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
