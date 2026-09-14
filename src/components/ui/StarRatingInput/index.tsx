import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';

/** Input interativo de avaliação por estrelas — para exibição só leitura ver StarRating. */
export interface StarRatingInputProps extends ViewProps {
  value: number;
  onChange: (value: number) => void;
  maxRating?: number;
  size?: number;
}

export function StarRatingInput({ value, onChange, maxRating = 5, size = 32, style, ...rest }: StarRatingInputProps) {
  const theme = useTheme();
  const i18n = useI18n();

  return (
    <View style={[styles.row, style]} {...rest}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;
        return (
          <Pressable
            key={starValue}
            onPress={() => onChange(starValue)}
            accessibilityRole="button"
            accessibilityLabel={i18n.common.starRating(starValue)}
            hitSlop={4}>
            <Ionicons name={filled ? 'star' : 'star-outline'} size={size} color={theme.rating} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
