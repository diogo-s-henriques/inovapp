import type { ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View, type PressableProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { IconTextCard } from '@/components/ui/IconTextCard';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface SelectableCardProps extends Omit<PressableProps, 'style' | 'onPress'> {
  icon: IoniconsName;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}

/** Cartão selecionável (estilo rádio), construído sobre o IconTextCard. */
export function SelectableCard({ icon, title, subtitle, selected, onPress, ...rest }: SelectableCardProps) {
  const theme = useTheme();

  return (
    <IconTextCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      iconColor={selected ? theme.primary : theme.textMuted}
      iconBackground={selected ? theme.surface : theme.surfaceAlt}
      backgroundColor={selected ? theme.primarySoft : theme.surface}
      borderColor={selected ? theme.primary : theme.border}
      borderWidth={1.5}
      iconBoxSize={44}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      trailing={
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? theme.primary : theme.border,
              backgroundColor: selected ? theme.primary : 'transparent',
            },
          ]}>
          {/* 14 e não `IconSize.ui` (22): é o sinal do rádio de 22 px, e o tamanho vem do
              controlo que o contém (ver Checkbox, com o mesmo raciocínio). */}
          {selected && <Ionicons name="checkmark" size={14} color={theme.onPrimary} />}
        </View>
      }
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
