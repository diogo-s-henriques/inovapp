import { useMemo, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { SUBJECT_OPTIONS } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';
import { SubjectPickerSheet } from '@/components/domain/Profile/SubjectPickerSheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

export interface SubjectsFieldProps {
  selected: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  showCount?: boolean;
  /** 'grid' mostra todas as opções lado a lado (passos de configuração); 'picker' mostra só as
   * disciplinas selecionadas mais um botão "adicionar" que abre um menu deslizante. */
  variant?: 'grid' | 'picker';
  style?: StyleProp<ViewStyle>;
}

export function SubjectsField({ selected, onChange, hint, showCount, variant = 'grid', style }: SubjectsFieldProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const removeSubject = (subject: string) => onChange(selected.filter((value) => value !== subject));

  if (variant === 'picker') {
    return (
      <View style={[styles.container, style]}>
        {hint && (
          <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
            {hint}
          </ThemedText>
        )}

        <View style={styles.row}>
          {selected.map((subject) => (
            <TagProfile key={subject} title={subject} onRemove={() => removeSubject(subject)} />
          ))}
          <Pressable
            onPress={() => sheetRef.current?.present()}
            accessibilityRole="button"
            accessibilityLabel={i18n.profileFields.addSubject}
            style={[styles.addButton, { borderColor: theme.border }]}>
            <Ionicons name="add-outline" size={IconSize.ui} color={theme.textPrimary} />
            <ThemedText type="smallBold" themeColor="textPrimary">
              {i18n.profileFields.add}
            </ThemedText>
          </Pressable>
        </View>

        {showCount && (
          <ThemedText type="smallBold" themeColor="textMuted" style={styles.count}>
            {i18n.profileFields.subjectsSelectedCount(selected.length)}
          </ThemedText>
        )}

        <SubjectPickerSheet ref={sheetRef} snapPoints={snapPoints} selected={selected} onChange={onChange} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {hint && (
        <ThemedText type="small" themeColor="textMuted" style={styles.hint}>
          {hint}
        </ThemedText>
      )}

      <ChipGroup options={SUBJECT_OPTIONS} selected={selected} onChange={onChange} />

      {showCount && (
        <ThemedText type="smallBold" themeColor="textMuted" style={styles.count}>
          {i18n.profileFields.subjectsSelectedCount(selected.length)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  hint: {
    marginTop: -Spacing.one,
  },
  count: {
    marginTop: Spacing.one,
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
