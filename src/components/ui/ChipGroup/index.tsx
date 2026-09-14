import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { TagProfile } from '@/components/ui/TagProfile';

export interface ChipGroupProps extends ViewProps {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
}

/** Grupo de chips selecionáveis; por omissão permite seleção múltipla (multiple=false comporta-se como rádio). */
export function ChipGroup({ options, selected, onChange, multiple = true, style, ...rest }: ChipGroupProps) {
  const toggle = (option: string) => {
    const isSelected = selected.includes(option);
    if (multiple) {
      onChange(isSelected ? selected.filter((value) => value !== option) : [...selected, option]);
      return;
    }
    onChange(isSelected ? [] : [option]);
  };

  return (
    <View style={[styles.row, style]} {...rest}>
      {options.map((option) => (
        <TagProfile key={option} title={option} selected={selected.includes(option)} onToggle={() => toggle(option)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
