import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { formatCourseAndYear } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth/store';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SectionCard } from '@/components/ui/SectionCard';
import { ThemedText } from '@/components/ui/ThemedText';
import { AvailabilityChips } from '@/components/domain/Profile/AvailabilityChips';
import { TagList } from '@/components/domain/Profile/TagList';
import { ProfileHeaderCard } from '@/components/domain/ProfileHeaderCard';
import { signOutUser } from '@/auth/actions';

// Perfil do próprio utilizador, com atalho para edição e para terminar sessão.
export default function ProfileScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  if (!profile) return null;

  const isProfessor = profile.role === 'professor';
  // Professores têm etiqueta fixa; os restantes usam o modo de participação escolhido no perfil.
  const roleLabel = isProfessor
    ? i18n.myProfile.professorLabel
    : profile.participationMode
      ? i18n.participationModes[profile.participationMode].role
      : i18n.myProfile.memberLabel;
  const availability = [...profile.availabilityPeriods, ...profile.availabilityModality];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>
            {i18n.myProfile.title}
          </ThemedText>
        </View>

        <ProfileHeaderCard
          name={profile.fullName}
          courseAndYear={isProfessor ? i18n.myProfile.professorCourse : formatCourseAndYear(profile.course, profile.year)}
          roleLabel={roleLabel}
          photoUri={profile.photoUri}
        />

        <SectionCard>
          <View style={styles.statRow}>
            <ThemedText type="body">{i18n.myProfile.sessionsGiven}</ThemedText>
            <ThemedText type="bodyBold" themeColor="primaryDark">
              0
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.statRow}>
            <ThemedText type="body">{i18n.myProfile.sessionsReceived}</ThemedText>
            <ThemedText type="bodyBold" themeColor="primaryDark">
              0
            </ThemedText>
          </View>
        </SectionCard>

        <SectionCard label={i18n.myProfile.subjectsLabel}>
          <View style={styles.subjectGroup}>
            <ThemedText type="bodyBold">{i18n.myProfile.teaches}</ThemedText>
            <TagList items={profile.teachingSubjects} />
          </View>
          {!isProfessor && (
            <View style={styles.subjectGroup}>
              <ThemedText type="bodyBold">{i18n.myProfile.learning}</ThemedText>
              <TagList items={profile.learningSubjects} />
            </View>
          )}
        </SectionCard>

        <SectionCard label={i18n.myProfile.availabilityLabel}>
          <AvailabilityChips items={availability} />
        </SectionCard>

        <SectionCard label={i18n.myProfile.aboutLabel}>
          <ThemedText type="body">{profile.about || i18n.myProfile.aboutEmpty}</ThemedText>
        </SectionCard>

        <Button
          label={i18n.myProfile.editProfile}
          variant="secondary"
          style={styles.editButton}
          onPress={() => router.push('/profile-edit')}
        />

        <Button
          label={i18n.myProfile.signOut}
          variant="ghost"
          style={styles.editButton}
          onPress={() => setConfirmingSignOut(true)}
        />
      </ScrollView>

      <ConfirmModal
        visible={confirmingSignOut}
        onRequestClose={() => setConfirmingSignOut(false)}
        title={i18n.myProfile.signOutConfirmTitle}
        description={i18n.myProfile.signOutConfirmDescription}
        confirmLabel={i18n.myProfile.signOutConfirm}
        cancelLabel={i18n.common.cancel}
        onConfirm={() => {
          setConfirmingSignOut(false);
          signOutUser();
        }}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.five,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    textTransform: 'none',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
  },
  subjectGroup: {
    gap: Spacing.two,
  },
  editButton: {
    alignSelf: 'stretch',
  },
});
