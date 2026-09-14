import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Pill } from '@/components/ui/Pill';
import { ThemedText } from '@/components/ui/ThemedText';

export interface MatchCardProps extends ViewProps {
  firstName: string;
  roleLabel: string;
  course: string;
  year: string;
  subjects: string[];
  availability: string;
  description: string;
  image?: string;
  onPressProfile?: () => void;
}

/** Cartão de sugestão de mentor/tutorando, com foto e etiquetas de disponibilidade. A avaliação
 * por estrelas é interna (ver ratings) e não é para ser mostrada publicamente. */
export function MatchCard({
  firstName,
  roleLabel,
  course,
  year,
  subjects,
  availability,
  description,
  image,
  onPressProfile,
  style,
  ...rest
}: MatchCardProps) {
  const theme = useTheme();
  const i18n = useI18n();

  return (
    <View style={[styles.wrapper, style]} {...rest}>
      <View style={[styles.photo, { backgroundColor: theme.surfaceAlt }]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <ThemedText type="small" themeColor="textMuted">
              {i18n.matches.photoPlaceholder}
            </ThemedText>
          </View>
        )}

        <View style={styles.topRow}>
          <Pill size="sm" style={{ backgroundColor: theme.primaryDark }}>
            <ThemedText type="small" themeColor="onPrimary" style={styles.roleLabel}>
              {roleLabel.toUpperCase()}
            </ThemedText>
          </Pill>
        </View>

        {/* Gradiente sobre a foto garante contraste para o texto branco em qualquer imagem. */}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} locations={[0, 0.85]} style={styles.gradient}>
          <ThemedText type="subtitle" themeColor="onPrimary" style={styles.name}>
            {firstName}
          </ThemedText>
          <Text style={styles.details}>
            {course} · {year}
          </Text>
          <View style={styles.tagsRow}>
            {subjects.map((subject) => (
              <Pill key={subject} size="xs" style={styles.pillTranslucent}>
                <Text style={styles.pillLabel}>{subject}</Text>
              </Pill>
            ))}
            <Pill size="xs" style={styles.pillTranslucent}>
              <Ionicons name="time-outline" size={12} color="#FFFFFF" />
              <Text style={styles.pillLabel}>{availability}</Text>
            </Pill>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.footer}>
        <ThemedText type="body" themeColor="textMuted">
          {description}
        </ThemedText>
        <Pressable onPress={onPressProfile} accessibilityRole="button" accessibilityLabel={i18n.matches.viewFullProfile}>
          <ThemedText type="smallBold" themeColor="primary">
            {i18n.matches.viewFullProfile}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.three,
  },
  photo: {
    aspectRatio: 0.68,
    borderRadius: Spacing.five,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleLabel: {
    letterSpacing: 0.5,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.three,
  },
  name: {
    fontSize: 22,
  },
  details: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  pillTranslucent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    gap: Spacing.one,
  },
});
