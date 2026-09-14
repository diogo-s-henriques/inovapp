import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { SuggestionChip } from '@/components/ui/SuggestionChip';

export interface AvailabilityChipsProps {
  items: string[];
  style?: StyleProp<ViewStyle>;
}

// Mostra a disponibilidade (períodos/modalidade) já escolhida, em modo só de leitura.
export function AvailabilityChips({ items, style }: AvailabilityChipsProps) {
  return (
    <View style={[styles.row, style]}>
      {items.map((item) => (
        <SuggestionChip key={item} label={item} />
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
