import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocaleStore, type Locale } from '@/i18n/store';
import { ThemedText } from '@/components/ui/ThemedText';

const LOCALES: Locale[] = ['pt', 'en'];

/** Alterna o idioma da app entre português e inglês. A escolha fica guardada no dispositivo
 * (AsyncStorage, via persist) e é retomada no arranque seguinte. */
export function LanguageSwitcher(props: ViewProps) {
  const theme = useTheme();
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);

  return (
    <View style={[styles.row, { borderColor: theme.border }, props.style]} {...props}>
      {LOCALES.map((value, index) => (
        <View key={value} style={styles.optionRow}>
          {index > 0 && (
            <ThemedText type="smallBold" themeColor="textMuted">
              |
            </ThemedText>
          )}
          <Pressable
            onPress={() => setLocale(value)}
            accessibilityRole="button"
            accessibilityLabel={value.toUpperCase()}
            accessibilityState={{ selected: locale === value }}
            hitSlop={6}>
            <ThemedText type="smallBold" themeColor={locale === value ? 'textPrimary' : 'textMuted'}>
              {value.toUpperCase()}
            </ThemedText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.six,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
