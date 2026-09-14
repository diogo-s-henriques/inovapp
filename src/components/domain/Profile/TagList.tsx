import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { TagProfile } from '@/components/ui/TagProfile';

export interface TagListProps {
  items: string[];
  style?: StyleProp<ViewStyle>;
}

// Lista de tags só de leitura (ex. disciplinas), sem interação de seleção ou remoção.
export function TagList({ items, style }: TagListProps) {
  return (
    <View style={[styles.row, style]}>
      {items.map((item) => (
        <TagProfile key={item} title={item} interactive={false} />
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
