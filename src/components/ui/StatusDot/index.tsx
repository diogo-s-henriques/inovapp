import { StyleSheet, View, type ViewProps } from 'react-native';

import type { ColorToken } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { PresenceStatus } from '@/types/chat';

/** Indicador circular de presença/estado do utilizador (online, em reunião, etc.). */
const STATUS_COLOR: Record<PresenceStatus, ColorToken> = {
  online: 'success',
  meeting: 'danger',
  unavailable: 'textMuted',
  away: 'warning',
};

export interface StatusDotProps extends ViewProps {
  status: PresenceStatus;
  size?: number;
}

export function StatusDot({ status, size = 12, style, ...rest }: StatusDotProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const color = STATUS_COLOR[status];
  const label = i18n.presence[status];

  return (
    <View
      accessibilityLabel={label}
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme[color],
          borderColor: theme.surface,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 2,
  },
});
