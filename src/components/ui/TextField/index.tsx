import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/** Campo de texto com variante visual (underline/filled) e alternância de visibilidade para palavras-passe. */
export type TextFieldVariant = 'underline' | 'filled';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  secureTextEntry?: boolean;
  variant?: TextFieldVariant;
}

export function TextField({
  label,
  secureTextEntry,
  variant = 'underline',
  multiline,
  maxLength,
  value,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);
  const isFilled = variant === 'filled';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <ThemedText type="small" themeColor="textMuted" style={styles.label}>
          {label}
        </ThemedText>
        {maxLength !== undefined && (
          <ThemedText type="small" themeColor="textMuted">
            {value?.length ?? 0}/{maxLength}
          </ThemedText>
        )}
      </View>
      <View
        style={[
          isFilled ? styles.filledRow : styles.underlineRow,
          isFilled
            ? { backgroundColor: theme.surfaceAlt, borderColor: focused ? theme.primary : 'transparent' }
            : { borderBottomColor: focused ? theme.primary : theme.border },
          multiline && styles.multilineRow,
        ]}>
        <TextInput
          secureTextEntry={secureTextEntry ? hidden : false}
          placeholderTextColor={theme.textMuted}
          multiline={multiline}
          maxLength={maxLength}
          value={value}
          style={[styles.input, { color: theme.textPrimary }, multiline && styles.multilineInput]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar palavra-passe' : 'Esconder palavra-passe'}
            hitSlop={8}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    textTransform: 'uppercase',
  },
  underlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: 1.5,
    paddingBottom: Spacing.one,
  },
  filledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  multilineRow: {
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.one,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
