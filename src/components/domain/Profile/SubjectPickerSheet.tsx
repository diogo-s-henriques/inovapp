import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { SUBJECT_OPTIONS } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';

export interface SubjectPickerSheetProps {
  selected: string[];
  onChange: (next: string[]) => void;
  snapPoints: (string | number)[];
}

// Menu deslizante para adicionar disciplinas à variante 'picker' de SubjectsField.
export const SubjectPickerSheet = forwardRef<BottomSheetModal, SubjectPickerSheetProps>(function SubjectPickerSheet(
  { selected, onChange, snapPoints },
  ref,
) {
  const theme = useTheme();
  const i18n = useI18n();
  const localRef = useRef<BottomSheetModal>(null);
  useImperativeHandle(ref, () => localRef.current as BottomSheetModal, []);

  const toggle = (subject: string) => {
    onChange(selected.includes(subject) ? selected.filter((value) => value !== subject) : [...selected, subject]);
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
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{i18n.profileFields.subjectPickerTitle}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.profileFields.subjectPickerSubtitle}
        </ThemedText>

        <View style={styles.chipsRow}>
          {SUBJECT_OPTIONS.map((option) => (
            <TagProfile
              key={option}
              title={option}
              selected={selected.includes(option)}
              onToggle={() => toggle(option)}
            />
          ))}
        </View>

        <Button label={i18n.profileFields.done} onPress={() => localRef.current?.dismiss()} />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
