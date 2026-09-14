import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';
import type { PressableProps } from 'react-native';

import { type ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IconTextCard } from '@/components/ui/IconTextCard';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

export interface ExtraCardProps extends Omit<PressableProps, 'style' | 'onPress'> {
  icon: IoniconsName;
  title: string;
  subtitle: string;
  iconColor?: ColorToken;
  iconBackground?: ColorToken;
  onPress?: () => void;
}

/** Variante do IconTextCard com cores por omissão (primary), pronta a usar em atalhos/extras. */
export function ExtraCard({
  icon,
  title,
  subtitle,
  iconColor = 'primary',
  iconBackground = 'primarySoft',
  onPress,
  ...rest
}: ExtraCardProps) {
  const theme = useTheme();

  return (
    <IconTextCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      iconColor={theme[iconColor]}
      iconBackground={theme[iconBackground]}
      backgroundColor={theme.surface}
      borderColor={theme.border}
      fullWidth
      onPress={onPress}
      {...rest}
    />
  );
}
