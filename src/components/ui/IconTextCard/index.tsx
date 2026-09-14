import type { ComponentProps, ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface IconTextCardProps extends Omit<PressableProps, 'style' | 'onPress'> {
  icon: IoniconsName;
  title: string;
  subtitle: string;
  iconColor: string;
  iconBackground: string;
  borderColor: string;
  backgroundColor: string;
  iconBoxSize?: number;
  borderWidth?: number;
  fullWidth?: boolean;
  trailing?: ReactNode;
  onPress?: () => void;
}

/** Cartão genérico com ícone, título e subtítulo; serve de base a cartões como o ExtraCard. */
export function IconTextCard({
  icon,
  title,
  subtitle,
  iconColor,
  iconBackground,
  borderColor,
  backgroundColor,
  iconBoxSize = 40,
  borderWidth = 1,
  fullWidth,
  trailing,
  onPress,
  ...rest
}: IconTextCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${subtitle}`}
      style={[styles.card, fullWidth && styles.fullWidth, { backgroundColor, borderColor, borderWidth }]}
      {...rest}>
      <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize, backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.textCol}>
        <ThemedText type="bodyBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {subtitle}
        </ThemedText>
      </View>
      {trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  fullWidth: {
    flex: 1,
  },
  iconBox: {
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
});
