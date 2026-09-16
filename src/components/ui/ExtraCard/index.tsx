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
  /** Ver `IconTextCard`: `column` põe o ícone por cima, para células estreitas. */
  layout?: 'row' | 'column';
  onPress?: () => void;
}

/** Variante do IconTextCard com as cores por omissão dos atalhos: ícone de contorno em ameixa
 * sobre um quadrado de ameixa suave.
 *
 * Chegou a ser o contrário - quadrado preto cheio com o ícone a branco, para distinguir um botão de
 * um cartão que só mostra informação. Não ficou: o que a app quer dizer com "isto toca-se" não é
 * uma mancha preta no meio de um cartão claro, e o ícone é para se ver, não para ser o fundo de
 * si mesmo.
 *
 * Depois foi um quadrado **cinzento** com o ícone a preto, para o desenho não competir com o texto.
 * A caixa passou a ameixa suave - o acento da app - pela mesma razão que o separador ativo da
 * barra de baixo: um atalho é uma coisa que se toca, e a cor diz isso antes de o dedo chegar lá. */
export function ExtraCard({
  icon,
  title,
  subtitle,
  iconColor = 'primary',
  iconBackground = 'primarySoft',
  layout,
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
      layout={layout}
      onPress={onPress}
      {...rest}
    />
  );
}
