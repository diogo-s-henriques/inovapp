import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { COURSES_BY_TYPE } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { SearchInput } from '@/components/ui/SearchInput';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';
import type { CourseSelection, CourseType } from '@/types/profile';

export interface CoursePickerSheetProps {
  selected?: CourseSelection;
  onChange: (course: CourseSelection) => void;
  snapPoints: (string | number)[];
}

// Remove acentuação e ignora maiúsculas/minúsculas para a pesquisa encontrar cursos
// independentemente de como o utilizador escreve (ex. "gestao" encontra "Gestão").
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export const CoursePickerSheet = forwardRef<BottomSheetModal, CoursePickerSheetProps>(function CoursePickerSheet(
  { selected, onChange, snapPoints },
  ref,
) {
  const theme = useTheme();
  const i18n = useI18n();
  const localRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState('');
  useImperativeHandle(ref, () => localRef.current as BottomSheetModal, []);

  const groups = useMemo(() => {
    const needle = normalize(query.trim());
    return (Object.entries(COURSES_BY_TYPE) as [CourseType, string[]][])
      .map(([type, names]) => ({
        type,
        names: needle ? names.filter((name) => normalize(name).includes(needle)) : names,
      }))
      .filter((group) => group.names.length > 0);
  }, [query]);

  const pick = (type: CourseType, name: string) => {
    onChange({ type, name });
    setQuery('');
    localRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={localRef}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: theme.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      backdropComponent={(props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
      )}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{i18n.profileFields.coursePickerTitle}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.profileFields.coursePickerSubtitle}
        </ThemedText>
        <SearchInput
          placeholder={i18n.profileFields.coursePickerSearchPlaceholder}
          value={query}
          onChangeText={setQuery}
          containerStyle={styles.search}
        />
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {groups.length === 0 && (
          <ThemedText type="small" themeColor="textMuted">
            {i18n.profileFields.coursePickerEmpty}
          </ThemedText>
        )}
        {groups.map((group) => (
          <View key={group.type} style={styles.group}>
            <ThemedText type="bodyBold">{group.type}</ThemedText>
            <View style={styles.chipsRow}>
              {group.names.map((name) => (
                <TagProfile
                  key={name}
                  title={name}
                  selected={selected?.name === name}
                  onToggle={(isNowSelected) => {
                    if (isNowSelected) pick(group.type, name);
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  search: {
    marginTop: Spacing.one,
  },
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
});
