import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { getInitials } from '@/lib/initials';
import { PhotoPicker } from '@/components/ui/PhotoPicker';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';

export interface StepProfessorProfileProps {
  photoUri?: string;
  onPickPhoto: () => void;
  fullName: string;
  onChangeFullName: (value: string) => void;
  about: string;
  onChangeAbout: (value: string) => void;
}

// Passo de criação de perfil do fluxo de professor: sem curso/ano, ao contrário do
// equivalente para estudantes (StepCreateProfile).
export function StepProfessorProfile({
  photoUri,
  onPickPhoto,
  fullName,
  onChangeFullName,
  about,
  onChangeAbout,
}: StepProfessorProfileProps) {
  const i18n = useI18n();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {i18n.profileSetup.createProfileTitle}
      </ThemedText>
      <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
        {i18n.profileSetup.createProfileSubtitleProfessor}
      </ThemedText>

      <PhotoPicker uri={photoUri} initials={getInitials(fullName)} onPress={onPickPhoto} style={styles.photo} />

      <View style={styles.form}>
        <TextField
          label={i18n.profileSetup.fullNameLabel}
          variant="filled"
          placeholder={i18n.profileSetup.fullNamePlaceholder}
          value={fullName}
          onChangeText={onChangeFullName}
        />
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
});
