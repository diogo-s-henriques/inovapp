import type { ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText, type ThemedTextType } from '@/components/ui/ThemedText';

export type HighlightCardSize = 'compact' | 'large';

interface SizeConfig {
  padding: number;
  radius: number;
  avatarSize: number;
  avatarFontSize: number;
  nameType: ThemedTextType;
}

const SIZE_CONFIG: Record<HighlightCardSize, SizeConfig> = {
  compact: { padding: Spacing.three, radius: Spacing.three, avatarSize: 40, avatarFontSize: 14, nameType: 'bodyBold' },
  large: { padding: Spacing.four, radius: Spacing.five, avatarSize: 56, avatarFontSize: 20, nameType: 'subtitle' },
};

export interface HighlightCardProps extends ViewProps {
  colors: [string, string];
  size?: HighlightCardSize;
  label?: string;
  avatarInitials: string;
  avatarImage?: string;
  name: string;
  subtitle: string;
  meta?: ReactNode;
  trailing?: ReactNode;
}

/** Cartão de destaque com fundo em gradiente; o tamanho (compact/large) define paddings e avatar via SIZE_CONFIG. */
export function HighlightCard({
  colors,
  size = 'compact',
  label,
  avatarInitials,
  avatarImage,
  name,
  subtitle,
  meta,
  trailing,
  style,
  ...rest
}: HighlightCardProps) {
  const config = SIZE_CONFIG[size];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { padding: config.padding, borderRadius: config.radius }, style]}
      {...rest}>
      {label && (
        <ThemedText type="small" themeColor="onPrimary" style={styles.label}>
          {label}
        </ThemedText>
      )}
      <View style={styles.row}>
        <View style={styles.info}>
          <ProfilePicCard
            initials={avatarInitials}
            image={avatarImage}
            accessibilityLabel={name}
            size={config.avatarSize}
            fontSize={config.avatarFontSize}
            backgroundColor="rgba(255, 255, 255, 0.2)"
            textColor="#FFFFFF"
          />
          <View style={styles.textCol}>
            <ThemedText type={config.nameType} themeColor="onPrimary">
              {name}
            </ThemedText>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {meta}
          </View>
        </View>
        {trailing}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  label: {
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  textCol: {
    flex: 1,
    gap: Spacing.half,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },
});
