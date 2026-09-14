import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';

/** Contentor visual em forma de pílula, usado como base para etiquetas/badges. */
export type PillSize = 'xs' | 'sm' | 'md';

export interface PillProps extends ViewProps {
  size?: PillSize;
}

export function Pill({ size = 'md', style, ...rest }: PillProps) {
  return <View style={[styles.pill, styles[size], style]} {...rest} />;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: Spacing.six,
  },
  xs: {
    gap: Spacing.half,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  sm: {
    gap: Spacing.half,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  md: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
});
