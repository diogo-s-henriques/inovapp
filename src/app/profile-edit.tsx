import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { YEAR_OPTIONS } from '@/constants/profile';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth/store';
import { completeProfileSetup } from '@/auth/actions';
import { canSaveProfile } from '@/lib/profile-form';
import { useI18n } from '@/hooks/use-i18n';
import { getInitials } from '@/lib/initials';
import { goBack } from '@/lib/navigation';
import { pickPreparedProfilePhoto } from '@/lib/storage';
import { AvailabilityFields } from '@/components/domain/Profile/AvailabilityFields';
import { CourseField } from '@/components/domain/Profile/CourseField';
import { SubjectsField } from '@/components/domain/Profile/SubjectsField';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { SectionCard } from '@/components/ui/SectionCard';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import type { CourseSelection } from '@/types/profile';

function sameCourse(a?: CourseSelection, b?: CourseSelection): boolean {
  return a?.name === b?.name && a?.type === b?.type;
}

// Edição do perfil já existente; o botão de guardar só ativa se algo tiver mesmo mudado.
export default function ProfileEditScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isProfessor = profile?.role === 'professor';

  const [photoUri, setPhotoUri] = useState(profile?.photoUri);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [course, setCourse] = useState<CourseSelection | undefined>(profile?.course);
  const [year, setYear] = useState<string | undefined>(profile?.year);
  const [about, setAbout] = useState(profile?.about ?? '');
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>(profile?.teachingSubjects ?? []);
  const [learningSubjects, setLearningSubjects] = useState<string[]>(profile?.learningSubjects ?? []);
  const [periods, setPeriods] = useState<string[]>(profile?.availabilityPeriods ?? []);
  const [modality, setModality] = useState<string[]>(profile?.availabilityModality ?? []);
  const [saving, setSaving] = useState(false);

  if (!profile || !user) return null;

  const sameSet = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((value, index) => value === sortedB[index]);
  };

  const hasChanges =
    photoUri !== profile.photoUri ||
    fullName !== (profile.fullName ?? '') ||
    !sameCourse(course, profile.course) ||
    year !== profile.year ||
    about !== (profile.about ?? '') ||
    !sameSet(teachingSubjects, profile.teachingSubjects ?? []) ||
    !sameSet(learningSubjects, profile.learningSubjects ?? []) ||
    !sameSet(periods, profile.availabilityPeriods ?? []) ||
    !sameSet(modality, profile.availabilityModality ?? []);

  // O que tem de estar preenchido para guardar está em src/lib/profile-form.ts, junto das mesmas
  // regras do assistente de criação (nome sempre, ano para estudantes, curso nunca).
  const saveDisabled = !canSaveProfile({ saving, isProfessor, fullName, year, hasChanges });

  // A fotografia vem daqui já redimensionada e comprimida (ver src/lib/storage.ts): é isso que faz
  // a pré-visualização aparecer de imediato e o "Guardar" não ter trabalho nenhum de imagem pela
  // frente.
  const pickPhoto = async () => {
    const prepared = await pickPreparedProfilePhoto();
    if (prepared) setPhotoUri(prepared);
  };

  // Guardar não pergunta nada: o botão só está ativo quando algo mudou (`saveDisabled`), o que já
  // é o "tens a certeza?" - e uma caixa a repetir a pergunta que o botão acabou de fazer é um
  // toque a mais entre quem mudou o nome e o nome mudado. A confirmação fica para o que não se
  // desfaz (apagar a conta) ou para o que acontece fora do ecrã (bloquear alguém, terminar sessão).
  const handleSave = async () => {
    if (fullName.trim().length === 0) return;

    setSaving(true);
    try {
      // Nada para preparar aqui: uma fotografia acabada de escolher já vem em data URI (é o que
      // `pickPreparedProfilePhoto` devolve) e a que estava guardada também. Guardar é só escrever.
      await completeProfileSetup(user.uid, {
        photoUri,
        fullName,
        course: isProfessor ? undefined : course,
        year: isProfessor ? undefined : year,
        about,
        // As disciplinas que se ensinam são de um professor, e só dele: um aluno que tenha ficado
        // com elas de antes (de quando ensinar era uma escolha) vê-as apagadas ao guardar - o
        // perfil dele é o de quem procura apoio, e estas disciplinas não têm onde aparecer.
        teachingSubjects: isProfessor ? teachingSubjects : [],
        learningSubjects: isProfessor ? [] : learningSubjects,
        availabilityPeriods: periods,
        availabilityModality: modality,
      });
      goBack(router, '/perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack(router, '/perfil')} accessibilityRole="button" accessibilityLabel={i18n.profileEdit.cancel} hitSlop={8}>
          <ThemedText type="bodyBold" themeColor="primary">
            {i18n.profileEdit.cancel}
          </ThemedText>
        </Pressable>
        <ThemedText type="bodyBold">{i18n.profileEdit.title}</ThemedText>
        <Pressable
          onPress={handleSave}
          disabled={saveDisabled}
          accessibilityRole="button"
          accessibilityLabel={i18n.profileEdit.save}
          hitSlop={8}>
          <ThemedText type="bodyBold" themeColor={saveDisabled ? 'textMuted' : 'primary'}>
            {saving ? i18n.profileEdit.saving : i18n.profileEdit.save}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <PhotoPicker
          uri={photoUri}
          initials={getInitials(fullName)}
          onPress={pickPhoto}
          label={i18n.profileEdit.changePhoto}
          style={styles.photo}
        />

        <SectionCard style={styles.formCard}>
          <TextField label={i18n.profileEdit.fullNameLabel} variant="underline" value={fullName} onChangeText={setFullName} />
          {!isProfessor && (
            <>
              <CourseField selected={course} onChange={setCourse} />
              <View style={styles.yearField}>
                <ThemedText type="small" themeColor="textMuted">
                  {i18n.profileEdit.yearLabel}
                </ThemedText>
                <ChipGroup
                  options={YEAR_OPTIONS}
                  selected={year ? [year] : []}
                  onChange={(next) => next[0] && setYear(next[0])}
                  multiple={false}
                />
              </View>
            </>
          )}
          <TextField
            label={i18n.profileEdit.aboutLabel}
            variant="underline"
            multiline
            maxLength={150}
            value={about}
            onChangeText={setAbout}
          />
        </SectionCard>

        {/* As disciplinas são de um lado só: um professor mostra o que ensina (é o que o põe na
            descoberta) e um aluno mostra o que quer aprender. */}
        {isProfessor ? (
          <SectionCard label={i18n.profileEdit.teachesLabel}>
            <SubjectsField selected={teachingSubjects} onChange={setTeachingSubjects} />
          </SectionCard>
        ) : (
          <SectionCard label={i18n.profileEdit.learningLabel}>
            <SubjectsField selected={learningSubjects} onChange={setLearningSubjects} />
          </SectionCard>
        )}

        {/* A disponibilidade fica com os dois papéis: é a do tutor que aparece no perfil e que quem
            procura vê, mas quem pede uma sessão também conta - as horas e a modalidade sugeridas no
            pedido olham para os dois perfis (ver src/app/session-request.tsx). */}
        <SectionCard label={i18n.profileEdit.availabilityLabel}>
          <AvailabilityFields
            periods={periods}
            onChangePeriods={setPeriods}
            modality={modality}
            onChangeModality={setModality}
          />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  photo: {
    alignSelf: 'center',
  },
  formCard: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  yearField: {
    gap: Spacing.two,
  },
});
