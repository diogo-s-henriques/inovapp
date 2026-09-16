import { useMemo, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';
import { CoursePickerSheet } from '@/components/domain/Profile/CoursePickerSheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { CourseSelection } from '@/types/profile';

export interface CourseFieldProps {
  label?: string;
  selected?: CourseSelection;
  onChange: (course: CourseSelection) => void;
  style?: StyleProp<ViewStyle>;
}

// Seletor de curso usado apenas no fluxo de estudante — professores não têm curso/ano
// associado ao perfil, pelo que este campo não é usado no fluxo de professor.
export function CourseField({ label, selected, onChange, style }: CourseFieldProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['75%'], []);

  return (
    <View style={[styles.container, style]}>
      <ThemedText type="small" themeColor="textMuted">
        {(label ?? i18n.profileFields.courseLabel).toUpperCase()}
      </ThemedText>

      <View style={styles.row}>
        {selected && <TagProfile title={selected.name} interactive={false} />}
        <Pressable
          onPress={() => sheetRef.current?.present()}
          accessibilityRole="button"
          accessibilityLabel={selected ? i18n.profileFields.changeCourse : i18n.profileFields.chooseCourse}
          style={[styles.addButton, { borderColor: theme.border }]}>
          <Ionicons name={selected ? 'sync-outline' : 'add-outline'} size={IconSize.ui} color={theme.textPrimary} />
          <ThemedText type="smallBold" themeColor="textPrimary">
            {selected ? i18n.profileFields.change : i18n.profileFields.choose}
          </ThemedText>
        </Pressable>
      </View>

      <CoursePickerSheet ref={sheetRef} snapPoints={snapPoints} selected={selected} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
