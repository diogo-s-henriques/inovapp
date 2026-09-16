import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/ui/ThemedText';
import { IconBoxSize, IconSize, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import type { AttentionItem, AttentionKind } from '@/lib/home';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/**
 * Ícone de cada tipo de pendência, de contorno, como todos os da app.
 *
 * Passou por quatro versões: o ícone colorido sobre quadrado suave; o preto sobre quadrado suave
 * por categoria (com o amarelo a marcar o pedido de sessão, o único com data marcada); o quadrado
 * preto cheio com o ícone a branco; e este - que é o mesmo de antes da cor por categoria. A cor
 * por tipo perdeu-se, e o que distingue as três linhas é o texto que cada uma mostra.
 *
 * A cor **do símbolo** também mudou: era preto e passou a ser o acento da app, dentro da caixa
 * suave que os outros ícones do ecrã usam. Um adorno por tipo de pendência já tinha sido tentado e
 * recusado; a cor que ficou não distingue tipos nenhuns - é a mesma nas três linhas, e vem só de a
 * caixa de ícone ter passado a ser o acento da app em todo o lado.
 */
const ATTENTION_ICON: Record<AttentionKind, IoniconsName> = {
  connections: 'person-add-outline',
  sessions: 'calendar-outline',
  messages: 'chatbubble-ellipses-outline',
};

export interface AttentionCardProps extends ViewProps {
  items: AttentionItem[];
  onPressItem: (kind: AttentionKind) => void;
}

/**
 * As linhas do que está à espera de uma resposta, com um atalho para o ecrã onde essa decisão se
 * toma (os pedidos de conexão no ecrã dos pedidos, o resto nas Notificações).
 *
 * Não tem rótulo próprio: o título e a contagem vivem no `SectionHeader` acima, que é onde se lê
 * o que a secção é - e onde a contagem tem espaço para ser um número a sério em vez de uma
 * etiqueta dentro de um cartão.
 *
 * Não decide nem responde a nada aqui de propósito - a mesma decisão não pode existir em dois
 * sítios, senão fica uma lista a mostrar algo que já foi resolvido no outro ecrã.
 *
 * Não desenha nada quando não há pendências.
 *
 * **Apertada de propósito:** 12 px de margem no cartão e 4 px por cima e por baixo de cada linha,
 * num cartão que passa a ser o primeiro da Home e o mais alto de todos quando há três tipos de
 * pendência ao mesmo tempo. Três linhas custam aqui 176 px em vez de 216, e a altura que sobra vai
 * para o calendário abaixo. O alvo do toque continua acima dos 44 px, porque quem manda na altura
 * da linha é a caixa do ícone (`IconBoxSize`, 40) e não a folga.
 */
export function AttentionCard({ items, onPressItem, style, ...rest }: AttentionCardProps) {
  const theme = useTheme();
  const i18n = useI18n();

  if (items.length === 0) return null;

  const labelFor = (item: AttentionItem): string => {
    if (item.kind === 'connections') return i18n.home.attentionConnections(item.count);
    if (item.kind === 'sessions') return i18n.home.attentionSessions(item.count);
    return i18n.home.attentionMessages(item.count);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]} {...rest}>
      {items.map((item) => {
        const label = labelFor(item);

        return (
          <Pressable
            key={item.kind}
            onPress={() => onPressItem(item.kind)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name={ATTENTION_ICON[item.kind]} size={IconSize.ui} color={theme.primary} />
            </View>
            <ThemedText type="bodyBold" style={styles.rowLabel}>
              {label}
            </ThemedText>
            <Ionicons name="chevron-forward" size={IconSize.ui} color={theme.textPrimary} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.half,
    padding: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.half,
  },
  // A mesma caixa dos atalhos e dos cartões com ícone (`IconBoxSize`): a caixa menor (34) que
  // esteve aqui durante uma volta deixava o ícone dos pedidos de conexão a parecer mais pequeno do
  // que o das Sessões, Materiais, Mensagens e Pesquisar - no mesmo ecrã, a duas secções de
  // distância.
  iconBox: {
    width: IconBoxSize,
    height: IconBoxSize,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
