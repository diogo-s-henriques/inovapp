import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Campo de texto de pesquisa com ícone de lupa incorporado. */
export interface SearchInputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  containerStyle?: StyleProp<ViewStyle>;
}

export function SearchInput({ containerStyle, ...props }: SearchInputProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surfaceAlt }, containerStyle]}>
      <Ionicons name="search-outline" size={18} color={theme.textMuted} />
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
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.three,
  },
});
