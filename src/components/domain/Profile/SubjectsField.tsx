import { useMemo, useRef } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { TagProfile } from '@/components/ui/TagProfile';
import { ThemedText } from '@/components/ui/ThemedText';
import { SubjectPickerSheet } from '@/components/domain/Profile/SubjectPickerSheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

export interface SubjectsFieldProps {
  selected: string[];
  onChange: (next: string[]) => void;
  hint?: string;
  showCount?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Campo de disciplinas: as escolhidas como etiquetas removíveis e um "Adicionar" que abre o
 * seletor (com pesquisa, agrupado por área).
 *
 * Havia aqui uma segunda variante que mostrava as ~80 disciplinas todas em etiquetas à vista, e era
 * essa que os passos de configuração usavam. Com 12 opções isso era um ecrã; com 80 era uma parede
 * de etiquetas em três ecrãs de scroll, sem forma de procurar. Ficou um só caminho - o mesmo da
 * edição do perfil - para que criar o perfil e corrigi-lo depois se façam da mesma maneira.
 *
 * O que se perdeu: ver todas as opções de uma vez. O que se ganhou: pesquisar (sem acentos, ver
 * src/lib/text.ts) e escolher de uma área sem percorrer as outras onze.
 */
export function SubjectsField({ selected, onChange, hint, showCount, style }: SubjectsFieldProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const removeSubject = (subject: string) => onChange(selected.filter((value) => value !== subject));

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
