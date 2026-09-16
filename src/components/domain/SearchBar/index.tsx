import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { SearchInput } from '@/components/ui/SearchInput';
import { ThemedText } from '@/components/ui/ThemedText';
import { TagProfile } from '@/components/ui/TagProfile';

export interface SearchBarProps extends ViewProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onPressFilters: () => void;
  activeFilterCount?: number;
  activeFilters?: string[];
  onRemoveFilter?: (filter: string) => void;
  resultsLabel?: string;
}

/** Barra de pesquisa com botão de filtros (com contador) e chips dos filtros ativos. */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onPressFilters,
  activeFilterCount = 0,
  activeFilters = [],
  onRemoveFilter,
  resultsLabel,
  style,
  ...rest
}: SearchBarProps) {
  const theme = useTheme();
  const i18n = useI18n();

  return (
    <View style={style} {...rest}>
      <View style={styles.row}>
        <SearchInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          containerStyle={styles.inputWrapper}
        />
        <Pressable
          onPress={onPressFilters}
          accessibilityLabel={i18n.search.filtersButton}
          accessibilityRole="button"
          style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="options-outline" size={IconSize.ui} color={theme.textPrimary} />
          {activeFilterCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" style={styles.badgeText} themeColor="onPrimary">
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>

      {activeFilters.length > 0 && (
        <View style={styles.chipsRow}>
          {activeFilters.map((filter) => (
            <TagProfile key={filter} title={filter} onRemove={() => onRemoveFilter?.(filter)} />
          ))}
        </View>
      )}

      {resultsLabel !== undefined && (
        <ThemedText type="smallBold" themeColor="textMuted" style={styles.resultsLabel}>
          {resultsLabel}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  inputWrapper: {
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  resultsLabel: {
    marginTop: Spacing.three,
    letterSpacing: 0.5,
  },
});
