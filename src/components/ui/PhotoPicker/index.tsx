import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface PhotoPickerProps extends Omit<PressableProps, 'style' | 'onPress'> {
  uri?: string;
  initials?: string;
  onPress: () => void;
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Seletor de fotografia de perfil com badge de câmara sobreposto. */
export function PhotoPicker({
  uri,
  initials,
  onPress,
  label,
  size = 96,
  style,
  ...rest
}: PhotoPickerProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const resolvedLabel = label ?? i18n.common.addPhoto;
  const badgeSize = Math.round(size * 0.32);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      style={[styles.container, style]}
      {...rest}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.primarySoft,
            borderColor: theme.borderAccent,
            borderStyle: uri ? 'solid' : 'dashed',
          },
        ]}>
        {/* Prioridade de conteúdo: fotografia > iniciais > ícone genérico */}
        {uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : initials ? (
          <Text style={[styles.initials, { fontSize: Math.round(size * 0.4), color: theme.primaryDark }]}>
            {initials}
          </Text>
        ) : (
          <Ionicons name="person-outline" size={Math.round(size * 0.42)} color={theme.textPrimary} />
        )}
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: theme.primary,
              borderColor: theme.surface,
            },
          ]}>
          <Ionicons name="camera-outline" size={Math.round(badgeSize * 0.55)} color={theme.onPrimary} />
        </View>
      </View>
      <ThemedText type="smallBold" themeColor="primary">
        {resolvedLabel}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
