import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * Cabeçalho de secção com contagem e/ou ação opcionais (ex.: \"Ver todos\").
 *
 * O título já não leva o traço vertical à frente. Era um risco azul de 3 px antes de cada título —
 * e, lido de perto, parecia um separador ("Novidades |") que não separava nada: era decoração a
 * competir com o texto numa secção que só tem duas ou três palavras.
 *
 * O título é **ameixa escura**, e não preto: numa página onde o corpo do texto é preto, a cor é o
 * que separa "isto é o nome de uma secção" de "isto é o que a secção diz" sem precisar de mais um
 * tamanho de letra nem de mais um traço. É a tinta do acento, a mesma dos números do perfil: passa
 * 11:1 sobre o branco e 10:1 sobre o cinzento dos ecrãs.
 */
export interface SectionHeaderProps extends ViewProps {
  title: string;
  /**
   * Quantas coisas estão na secção (ex.: quantas esperam resposta).
   *
   * Zero, ou ausente, não desenha nada: uma secção sem nada dentro a mostrar \"0\" está a pedir
   * atenção para o facto de não haver nada, que é o contrário do que se quer.
   */
  badge?: number;
  actionLabel?: string;
  onPressAction?: () => void;
}

export function SectionHeader({ title, badge, actionLabel, onPressAction, style, ...rest }: SectionHeaderProps) {
  const theme = useTheme();
  const showBadge = badge !== undefined && badge > 0;

  return (
    <View style={[styles.row, style]} {...rest}>
      <ThemedText type="subtitle" themeColor="primaryDark" style={styles.title}>
        {title}
      </ThemedText>

      {(showBadge || actionLabel) && (
        <View style={styles.trailing}>
          {showBadge && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" themeColor="onPrimary">
                {badge}
              </ThemedText>
            </View>
          )}
          {actionLabel && (
            <Pressable onPress={onPressAction} accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="primary">
                {actionLabel}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
