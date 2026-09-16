import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Campo de texto de pesquisa com ícone de lupa incorporado. */
export interface SearchInputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  containerStyle?: StyleProp<ViewStyle>;
}

export function SearchInput({ containerStyle, ...props }: SearchInputProps) {
  const theme = useTheme();

  return (
    // Branco com contorno, e não só um preenchimento claro: este campo vive em cima do fundo
    // cinzento dos ecrãs, onde um fundo do mesmo tom desaparecia.
    <View style={[styles.wrapper, { backgroundColor: theme.surface, borderColor: theme.border }, containerStyle]}>
      <Ionicons name="search-outline" size={IconSize.ui} color={theme.textPrimary} />
      <TextInput placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary }]} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.three,
  },
});
