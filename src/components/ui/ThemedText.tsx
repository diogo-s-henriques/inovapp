import { StyleSheet, Text, type TextProps } from 'react-native';

import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Texto base da app com tipografia e cor de tema pré-definidas por variante. */
export type ThemedTextType = 'title' | 'subtitle' | 'body' | 'bodyBold' | 'small' | 'smallBold';

export interface ThemedTextProps extends TextProps {
  type?: ThemedTextType;
  themeColor?: ColorToken;
}

export function ThemedText({ type = 'body', themeColor = 'textPrimary', style, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[styles[type], { color: theme[themeColor] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
  },
  bodyBold: {
    fontSize: 15,
    fontWeight: '600',
  },
  small: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  smallBold: {
    fontSize: 13,
    fontWeight: '700',
  },
});
