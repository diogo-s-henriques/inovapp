import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

import { Spacing } from '@/constants/theme';
import { SUBJECT_AREAS } from '@/constants/profile';
import { normalizeForSearch } from '@/lib/text';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';

export interface SubjectPickerSheetProps {
  selected: string[];
  onChange: (next: string[]) => void;
  snapPoints: (string | number)[];
}

/**
 * Menu deslizante para adicionar disciplinas à variante 'picker' de SubjectsField.
 *
 * São ~80 disciplinas em 12 áreas: sem pesquisa, isto era uma parede de etiquetas para percorrer a
 * olho. A pesquisa (sem acentos, ver src/lib/text.ts) é o caminho normal, e os cabeçalhos de área
 * ficam para quem prefere navegar - por isso uma pesquisa que não encontra nada desaparece com as
 * áreas dela, em vez de deixar doze secções vazias.
 *
 * O desenho é o do seletor de curso (`CoursePickerSheet`): o mesmo cabeçalho fixo com a pesquisa, a
 * lista a rolar por baixo e as escolhas marcadas na própria lista.
 */
export const SubjectPickerSheet = forwardRef<BottomSheetModal, SubjectPickerSheetProps>(function SubjectPickerSheet(
  { selected, onChange, snapPoints },
  ref,
) {
  const theme = useTheme();
  const i18n = useI18n();
  const localRef = useRef<BottomSheetModal>(null);
  const [query, setQuery] = useState('');
  useImperativeHandle(ref, () => localRef.current as BottomSheetModal, []);

  const toggle = (subject: string) => {
    onChange(selected.includes(subject) ? selected.filter((value) => value !== subject) : [...selected, subject]);
  };

  // As áreas com pelo menos uma disciplina que corresponda à pesquisa. Sem pesquisa, são todas.
  const groups = useMemo(() => {
    const needle = normalizeForSearch(query.trim());
    return SUBJECT_AREAS.map((area) => ({
      id: area.id,
      label: area.label,
      subjects: needle ? area.subjects.filter((subject) => normalizeForSearch(subject).includes(needle)) : area.subjects,
    })).filter((area) => area.subjects.length > 0);
  }, [query]);

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
        <ThemedText type="subtitle">{i18n.profileFields.subjectPickerTitle}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.profileFields.subjectPickerSubtitle}
        </ThemedText>
        <SearchInput
          placeholder={i18n.profileFields.subjectPickerSearchPlaceholder}
          value={query}
          onChangeText={setQuery}
          containerStyle={styles.search}
        />
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {groups.length === 0 && (
          <ThemedText type="small" themeColor="textMuted">
            {i18n.profileFields.subjectPickerEmpty}
          </ThemedText>
        )}
        {groups.map((group) => (
          <View key={group.id} style={styles.group}>
            <ThemedText type="bodyBold">{group.label}</ThemedText>
            <View style={styles.chipsRow}>
              {group.subjects.map((subject) => (
                <TagProfile
                  key={subject}
                  title={subject}
                  selected={selected.includes(subject)}
                  onToggle={() => toggle(subject)}
                />
              ))}
            </View>
          </View>
        ))}

        <Button label={i18n.profileFields.done} onPress={() => localRef.current?.dismiss()} />
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
