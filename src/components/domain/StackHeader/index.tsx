import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { BackButton } from '@/components/ui/BackButton';
import { ThemedText } from '@/components/ui/ThemedText';

export interface StackHeaderProps extends ViewProps {
  /** O nome do ecrã. É escrito em maiúsculas pelo tipo de texto `title`, como nos separadores. */
  title: string;
  /** Rótulo acessível do botão de voltar (o botão é um ícone, sem texto). */
  backLabel: string;
  onBack: () => void;
  /** Ação no canto direito, alinhada com o título. Nada por omissão. */
  rightAction?: ReactNode;
}

/**
 * O cabeçalho dos ecrãs empilhados — os que abrem por cima dos separadores (Notificações, Sessões,
 * Materiais, Definições, pedidos de conexão, pedido de sessão).
 *
 * Seis ecrãs tinham a mesma linha copiada, com uma diferença aqui e outra ali: cinco com um
 * chevron nu, um com um círculo com contorno, um `gap` de 12 e outro de 16, um título com
 * `flex: 1` e outro sem. Nada disso era intenção — era terem sido escritos em alturas diferentes.
 * Aqui há um só, e o que cada ecrã diz é o título e para onde volta.
 *
 * **Porque é que não é o `ScreenHero`**: o bloco em gradiente dos separadores vive dentro da
 * lista e rola com ela, com a identidade e o sino por cima; este fica **preso ao topo** e é só a
 * seta e o nome do ecrã. São duas peças diferentes porque fazem coisas diferentes — a tentação de
 * as juntar foi o que criou o `identity` opcional que o `ScreenHero` já teve e perdeu.
 *
 * O `SafeAreaView` de quem usa isto trata da barra de estado (é ele que sabe a altura dela): este
 * componente começa abaixo disso.
 */
export function StackHeader({ title, backLabel, onBack, rightAction, style, ...rest }: StackHeaderProps) {
  return (
    <View style={[styles.header, style]} {...rest}>
      <BackButton label={backLabel} onPress={onBack} />
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {rightAction}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  // `flex: 1` para o título empurrar uma eventual ação do canto para a direita em vez de ficar
  // colado a ela; sem ação nenhuma, o título fica igual (ocupa o que sobra).
  title: {
    flex: 1,
  },
});
