import { forwardRef, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';
import type { FilterGroup } from '@/types/student';

export interface FilterSheetProps {
  groups: FilterGroup[];
  courses: string[];
  selectedTags: string[];
  selectedCourse?: string;
  onChangeSelectedTags: (tags: string[]) => void;
  onChangeSelectedCourse: (course: string | undefined) => void;
  onApply: () => void;
  onClear: () => void;
}

/** Painel inferior (bottom sheet) com os filtros de pesquisa de mentores: etiquetas e curso. */
export const FilterSheet = forwardRef<BottomSheetModal, FilterSheetProps>(function FilterSheet(
  { groups, courses, selectedTags, selectedCourse, onChangeSelectedTags, onChangeSelectedCourse, onApply, onClear },
  ref,
) {
  const theme = useTheme();
  const i18n = useI18n();
  const [courseOpen, setCourseOpen] = useState(false);
  const snapPoints = useMemo(() => ['75%'], []);
  // Contagem de filtros ativos, mostrada no botão de aplicar.
  const appliedCount = selectedTags.length + (selectedCourse ? 1 : 0);

  const toggleTag = (tag: string) => {
    onChangeSelectedTags(selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]);
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}>
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{i18n.filterSheet.title}</ThemedText>

        {groups.map((group) => (
          <View key={group.id} style={styles.group}>
            <ThemedText type="smallBold" themeColor="textMuted">
              {group.title}
            </ThemedText>
            <View style={styles.chipsRow}>
              {group.options.map((option) => (
                <TagProfile
                  key={option}
                  title={option}
                  selected={selectedTags.includes(option)}
                  onToggle={() => toggleTag(option)}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.group}>
          <ThemedText type="smallBold" themeColor="textMuted">
            {i18n.filterSheet.coursePlaceholder}
          </ThemedText>
          <Pressable
            onPress={() => setCourseOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={i18n.filterSheet.coursePlaceholder}
            style={[styles.courseSelect, { borderColor: theme.border }]}>
            <ThemedText>{selectedCourse ?? i18n.filterSheet.allCourses}</ThemedText>
          </Pressable>
          {courseOpen && (
            <View style={[styles.courseOptions, { borderColor: theme.border }]}>
              <Pressable
                style={styles.courseOption}
                onPress={() => {
                  onChangeSelectedCourse(undefined);
                  setCourseOpen(false);
                }}>
                <ThemedText themeColor={!selectedCourse ? 'primary' : 'textPrimary'}>
                  {i18n.filterSheet.allCourses}
                </ThemedText>
              </Pressable>
              {courses.map((course) => (
                <Pressable
                  key={course}
                  style={styles.courseOption}
                  onPress={() => {
                    onChangeSelectedCourse(course);
                    setCourseOpen(false);
                  }}>
                  <ThemedText themeColor={selectedCourse === course ? 'primary' : 'textPrimary'}>
                    {course}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Button label={i18n.filterSheet.clear} variant="link" onPress={onClear} />
          <Button label={i18n.filterSheet.apply(appliedCount)} variant="primary" onPress={onApply} />
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  courseSelect: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  courseOptions: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    overflow: 'hidden',
  },
  courseOption: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
});
