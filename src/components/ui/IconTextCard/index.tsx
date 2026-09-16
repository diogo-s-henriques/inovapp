import type { ComponentProps, ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { IconBoxSize, IconSize, Spacing } from '@/constants/theme';
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
  /**
   * `column` põe o ícone por cima do texto em vez de ao lado.
   *
   * É a forma que se aguenta numa célula estreita: com o ícone ao lado, sobram ~70 px para o
   * texto numa grelha de duas colunas, e um subtítulo como "0 agendadas" quebra em duas linhas e
   * o cartão passa a ler-se em três. Em coluna, o texto fica com a largura toda.
   */
  layout?: 'row' | 'column';
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
  iconBoxSize = IconBoxSize,
  borderWidth = 1,
  fullWidth,
  layout = 'row',
  trailing,
  onPress,
  ...rest
}: IconTextCardProps) {
  const isColumn = layout === 'column';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}, ${subtitle}`}
      style={[
        styles.card,
        isColumn && styles.cardColumn,
        fullWidth && styles.fullWidth,
        { backgroundColor, borderColor, borderWidth },
      ]}
      {...rest}>
      <View style={[styles.iconBox, { width: iconBoxSize, height: iconBoxSize, backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={IconSize.ui} color={iconColor} />
      </View>
      <View style={[styles.textCol, isColumn && styles.textColColumn]}>
        {/* Em coluna, cada linha fica presa a uma: o que o cartão promete é "rótulo: valor", e é
            isso que deixa de se ler quando o subtítulo quebra a meio. */}
        <ThemedText type="bodyBold" numberOfLines={isColumn ? 1 : undefined}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={isColumn ? 1 : undefined}>
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
  cardColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  textColColumn: {
    // `flex: 1` (o valor em linha) deixa o texto a crescer em altura num pai que não tem altura
    // própria; em coluna, quem manda no tamanho é o conteúdo. O `flexShrink` fica para uma linha
    // comprida encolher em vez de sair do cartão.
    flex: 0,
    flexShrink: 1,
    alignSelf: 'stretch',
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
