import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ProfilePicCard } from '@/components/ui/ProfilePicCard';
import { ThemedText } from '@/components/ui/ThemedText';

export interface TutorCardProps extends Omit<PressableProps, 'style'> {
  firstName: string;
  lastName: string;
  course: string;
  year: string;
  image?: string;
  /**
   * Rótulo do botão dentro do cartão — a ação que se segue a conhecer a pessoa.
   *
   * Sem ele o cartão é só a pessoa, e isso é uma diferença de domínio, não de estilo: quem já é
   * teu contacto pode receber um pedido de sessão a partir daqui, mas uma sugestão de alguém com
   * quem nunca falaste não pode — primeiro há a ligação, e essa decide-se nos Matches.
   */
  actionLabel?: string;
  onPressAction?: () => void;
}

/**
 * Cartão de uma pessoa nas listagens de conexões — o mentor em "Tutores para ti" e o tutorando
 * em "Os teus tutorandos". A avaliação por estrelas é interna (ver ratings) e não é para ser
 * mostrada publicamente.
 *
 * A fotografia é maior do que era (48 → 56) porque passou a ser a miniatura que identifica a
 * linha; o cartão inteiro continua a abrir o perfil, e o botão, quando existe, é uma segunda ação
 * dentro dele — o toque no botão não chega ao cartão, por ser o mais interior a responder.
 */
export function TutorCard({
  firstName,
  lastName,
  course,
  year,
  image,
  actionLabel,
  onPressAction,
  ...rest
}: TutorCardProps) {
  const theme = useTheme();
  const name = `${firstName} ${lastName}`.trim();
  const courseAndYear = [course, year].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${course}`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      {...rest}>
      <ProfilePicCard firstName={firstName} lastName={lastName} image={image} size={56} />

      <View style={styles.info}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {name}
        </ThemedText>
        {courseAndYear ? (
          <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
            {courseAndYear}
          </ThemedText>
        ) : null}

        {actionLabel && (
          <Pressable
            onPress={onPressAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={6}
            style={({ pressed }) => [styles.action, { backgroundColor: theme.primarySoft }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="primaryDark">
              {actionLabel}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    // 'flex-start' (não 'center'): com o botão por baixo do nome, o cartão deixa de ser uma linha
    // só, e centrar a fotografia fá-la-ia dançar conforme a altura do texto.
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
