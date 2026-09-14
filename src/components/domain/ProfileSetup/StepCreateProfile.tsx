import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { YEAR_OPTIONS } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { getInitials } from '@/lib/initials';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { CourseField } from '@/components/domain/Profile/CourseField';
import type { CourseSelection } from '@/types/profile';

export interface StepCreateProfileProps {
  photoUri?: string;
  onPickPhoto: () => void;
  fullName: string;
  onChangeFullName: (value: string) => void;
  course?: CourseSelection;
  onChangeCourse: (value: CourseSelection) => void;
  year?: string;
  onChangeYear: (value: string) => void;
  about: string;
  onChangeAbout: (value: string) => void;
}

// Passo de criação de perfil do fluxo de estudante: inclui curso e ano, ao contrário do
// equivalente para professores (StepProfessorProfile), que não tem esses campos.
export function StepCreateProfile({
  photoUri,
  onPickPhoto,
  fullName,
  onChangeFullName,
  course,
  onChangeCourse,
  year,
  onChangeYear,
  about,
  onChangeAbout,
}: StepCreateProfileProps) {
  const i18n = useI18n();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {i18n.profileSetup.createProfileTitle}
      </ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
        {i18n.profileSetup.createProfileSubtitleStudent}
      </ThemedText>

      <PhotoPicker
        uri={photoUri}
        initials={getInitials(fullName)}
        onPress={onPickPhoto}
        style={styles.photo}
      />

      <View style={styles.form}>
        <TextField
          label={i18n.profileSetup.fullNameLabel}
          variant="filled"
          placeholder={i18n.profileSetup.fullNamePlaceholder}
          value={fullName}
          onChangeText={onChangeFullName}
        />
        <CourseField selected={course} onChange={onChangeCourse} />
        <View style={styles.yearField}>
          <ThemedText type="small" themeColor="textMuted">
            {i18n.profileSetup.yearLabel}
          </ThemedText>
          <ChipGroup options={YEAR_OPTIONS} selected={year ? [year] : []} onChange={(next) => next[0] && onChangeYear(next[0])} multiple={false} />
        </View>
        <TextField
          label={i18n.profileSetup.aboutLabel}
          variant="filled"
          multiline
          maxLength={150}
          placeholder={i18n.profileSetup.aboutPlaceholder}
          value={about}
          onChangeText={onChangeAbout}
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
  photo: {
    alignSelf: 'center',
    marginVertical: Spacing.four,
  },
  form: {
    gap: Spacing.five,
  },
  yearField: {
    gap: Spacing.two,
  },
});
