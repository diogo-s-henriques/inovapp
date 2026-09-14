import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { PARTICIPATION_MODES, YEAR_OPTIONS, canTeach, isEligibleToTeach } from '@/constants/profile';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth/store';
import { completeProfileSetup } from '@/auth/actions';
import { useI18n } from '@/hooks/use-i18n';
import { getInitials } from '@/lib/initials';
import { goBack } from '@/lib/navigation';
import { pickProfilePhoto, preparePhotoForUpload } from '@/lib/storage';
import { AvailabilityFields } from '@/components/domain/Profile/AvailabilityFields';
import { CourseField } from '@/components/domain/Profile/CourseField';
import { SubjectsField } from '@/components/domain/Profile/SubjectsField';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { SectionCard } from '@/components/ui/SectionCard';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import type { CourseSelection, ParticipationMode } from '@/types/profile';

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
  const [participationMode, setParticipationMode] = useState(profile?.participationMode);
  const [teachingSubjects, setTeachingSubjects] = useState<string[]>(profile?.teachingSubjects ?? []);
  const [learningSubjects, setLearningSubjects] = useState<string[]>(profile?.learningSubjects ?? []);
  const [periods, setPeriods] = useState<string[]>(profile?.availabilityPeriods ?? []);
  const [modality, setModality] = useState<string[]>(profile?.availabilityModality ?? []);
  const [saving, setSaving] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  if (!profile || !user) return null;

  const eligibleToTeach = isEligibleToTeach(year);
  const availableModes = PARTICIPATION_MODES.filter((option) => eligibleToTeach || option.mode === 'learn');

  const handleChangeYear = (nextYear: string) => {
    setYear(nextYear);
    // Se o novo ano deixa de ser elegível para ensinar, força o modo para "aprender".
    if (!isEligibleToTeach(nextYear) && participationMode !== 'learn') {
      setParticipationMode('learn' as ParticipationMode);
    }
  };

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
    participationMode !== profile.participationMode ||
    !sameSet(teachingSubjects, profile.teachingSubjects ?? []) ||
    !sameSet(learningSubjects, profile.learningSubjects ?? []) ||
    !sameSet(periods, profile.availabilityPeriods ?? []) ||
    !sameSet(modality, profile.availabilityModality ?? []);

  const saveDisabled = saving || fullName.trim().length === 0 || !hasChanges;

  const pickPhoto = async () => {
    const uri = await pickProfilePhoto();
    if (uri) setPhotoUri(uri);
  };

  const handleSave = async () => {
    if (fullName.trim().length === 0) return;

    setConfirmVisible(false);
    setSaving(true);
    try {
      // Só prepara/converte a foto se for uma nova escolhida agora (as já guardadas vêm em data URI).
      const isNewLocalPhoto = !!photoUri && !photoUri.startsWith('data:');
      const preparedPhoto = isNewLocalPhoto ? await preparePhotoForUpload(photoUri!) : photoUri;

      await completeProfileSetup(user.uid, {
        photoUri: preparedPhoto,
        fullName,
        course: isProfessor ? undefined : course,
        year: isProfessor ? undefined : year,
        about,
        participationMode,
        teachingSubjects,
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
          onPress={() => setConfirmVisible(true)}
          disabled={saveDisabled}
          accessibilityRole="button"
          accessibilityLabel={i18n.profileEdit.save}
          hitSlop={8}>
          <ThemedText type="bodyBold" themeColor={saveDisabled ? 'textMuted' : 'primary'}>
            {saving ? i18n.profileEdit.saving : i18n.profileEdit.save}
          </ThemedText>
        </Pressable>
      </View>

      <ConfirmModal
        visible={confirmVisible}
        onRequestClose={() => setConfirmVisible(false)}
        title={i18n.profileEdit.confirmTitle}
        description={i18n.profileEdit.confirmDescription}
        cancelLabel={i18n.profileEdit.cancel}
        confirmLabel={i18n.profileEdit.save}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={handleSave}
      />

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
                  onChange={(next) => next[0] && handleChangeYear(next[0])}
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

        {!isProfessor && (
          <View style={styles.section}>
            <ThemedText type="small" themeColor="textMuted">
              {i18n.profileEdit.participationLabel}
            </ThemedText>
            <ChipGroup
              options={availableModes.map((option) => i18n.participationModes[option.mode].chip)}
              selected={[participationMode ? i18n.participationModes[participationMode].chip : '']}
              onChange={(next) => {
                const picked = availableModes.find((option) => i18n.participationModes[option.mode].chip === next[0]);
                if (picked) setParticipationMode(picked.mode);
              }}
              multiple={false}
            />
            {!eligibleToTeach && (
              <ThemedText type="small" themeColor="textMuted" style={styles.eligibilityHint}>
                {i18n.profileEdit.eligibilityHint}
              </ThemedText>
            )}
          </View>
        )}

        {canTeach(participationMode) && (
          <SectionCard label={i18n.profileEdit.teachesLabel}>
            <SubjectsField selected={teachingSubjects} onChange={setTeachingSubjects} variant="picker" />
          </SectionCard>
        )}

        {!isProfessor && (
          <SectionCard label={i18n.profileEdit.learningLabel}>
            <SubjectsField selected={learningSubjects} onChange={setLearningSubjects} variant="picker" />
          </SectionCard>
        )}

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
  eligibilityHint: {
    marginTop: -Spacing.one,
  },
});
