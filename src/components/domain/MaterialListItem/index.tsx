import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface MaterialListItemProps extends ViewProps {
  title: string;
  subtitle: string;
  onPressOpen: () => void;
}

/** Linha de material partilhado (anexo de chat) — sempre um link, sem upload real. */
export function MaterialListItem({ title, subtitle, onPressOpen, style, ...rest }: MaterialListItemProps) {
  const theme = useTheme();
  const i18n = useI18n();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]} {...rest}>
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
      </View>

      <View style={styles.info}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>

      <Pressable onPress={onPressOpen} accessibilityRole="button" accessibilityLabel={i18n.materials.open(title)} hitSlop={8}>
        <Ionicons name="download-outline" size={20} color={theme.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
});
