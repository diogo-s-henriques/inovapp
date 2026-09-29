import { forwardRef, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { normalizeForSearch } from '@/lib/text';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
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
  const [query, setQuery] = useState('');
  const snapPoints = useMemo(() => ['75%'], []);
  // Contagem de filtros ativos, mostrada no botão de aplicar.
  const appliedCount = selectedTags.length + (selectedCourse ? 1 : 0);

  /**
   * As disciplinas de cada grupo que a pesquisa deixa passar.
   *
   * Uma disciplina **escolhida** fica sempre visível, mesmo que não corresponda à pesquisa: se
   * desaparecesse enquanto se procura outra, ficava um filtro ativo que já não se conseguia tirar
   * sem limpar tudo.
   */
  const visibleGroups = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    return groups.map((group) => ({
      ...group,
      options: needle
        ? group.options.filter(
            (option) => selectedTags.includes(option) || normalizeForSearch(option).includes(needle),
          )
        : group.options,
    }));
  }, [groups, query, selectedTags]);

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

        <SearchInput
          placeholder={i18n.filterSheet.searchSubjects}
          value={query}
          onChangeText={setQuery}
        />

        {visibleGroups.length > 0 && visibleGroups.every((group) => group.options.length === 0) && (
          <ThemedText type="small" themeColor="textMuted">
            {i18n.filterSheet.noSubjectsFound}
          </ThemedText>
        )}

        {visibleGroups.map((group) => (
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
