import { Image, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

/** Avatar circular, só apresentação (sem interação) — mostra imagem ou iniciais. */
export type ProfilePicCardSize = 'sm' | 'md' | 'lg';

const DIMENSION_BY_SIZE: Record<ProfilePicCardSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

const FONT_SIZE_BY_SIZE: Record<ProfilePicCardSize, number> = {
  sm: 12,
  md: 16,
  lg: 20,
};

export interface ProfilePicCardProps extends ViewProps {
  firstName?: string;
  lastName?: string;
  initials?: string;
  image?: string;
  size?: ProfilePicCardSize | number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
}

export function ProfilePicCard({
  firstName = '',
  lastName = '',
  initials,
  image,
  size = 'md',
  fontSize,
  backgroundColor,
  textColor,
  style,
  ...rest
}: ProfilePicCardProps) {
  const theme = useTheme();
  // size aceita um preset ('sm' | 'md' | 'lg') ou um número em pixels
  const dimension = typeof size === 'number' ? size : DIMENSION_BY_SIZE[size];
  const resolvedFontSize = fontSize ?? (typeof size === 'number' ? Math.round(size * 0.35) : FONT_SIZE_BY_SIZE[size]);
  // Se não vierem iniciais explícitas, calcula-as a partir do nome
  const resolvedInitials = initials ?? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const label = [firstName, lastName].filter(Boolean).join(' ') || resolvedInitials;

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: backgroundColor ?? theme.primarySoft,
        },
        style,
      ]}
      {...rest}>
      {image ? (
        <Image source={{ uri: image }} style={styles.image} />
      ) : (
        <Text style={[styles.initials, { color: textColor ?? theme.primary, fontSize: resolvedFontSize }]}>
          {resolvedInitials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
  },
});
