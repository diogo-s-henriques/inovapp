import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface CheckboxProps extends Omit<PressableProps, 'style' | 'onPress'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

/** Checkbox simples com rótulo opcional. */
export function Checkbox({ checked, onChange, label, ...rest }: CheckboxProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      style={styles.row}
      {...rest}>
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: theme.primary, borderColor: theme.primary }
            : { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        {/* 14 e não `IconSize.ui` (22): este visto vive **dentro** da caixa de 18 px, e a 22 não
            cabia — o tamanho aqui é ditado pelo controlo, não pelos símbolos da página. */}
        {checked && <Ionicons name="checkmark" size={14} color={theme.onPrimary} />}
      </View>
      {label && <ThemedText type="small">{label}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
