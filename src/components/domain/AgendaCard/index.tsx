import { useState } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CalendarMonth } from '@/components/domain/CalendarMonth';

export interface AgendaCardProps extends ViewProps {
  /** Dias que têm sessão, no formato 'YYYY-MM-DD' (o mesmo das chaves de data). */
  markedDates: Set<string>;
  /** O dia que aparece escolhido — no ecrã inicial, hoje. */
  selectedDate?: string;
  /** O toque num dia. No ecrã inicial leva à agenda desse dia; aqui não se decide nada. */
  onPressDay: (date: string) => void;
}

/**
 * O calendário da agenda no ecrã inicial: o mês com um ponto nos dias que têm sessão.
 *
 * **Só mostra o mês.** Escolher um dia não muda nada dentro do cartão — quem trata disso é o ecrã
 * (ver `(tabs)/index.tsx`, que empilha a agenda no dia tocado). Foi a decisão que ficou: o cartão
 * diz *quando* há sessões, e a agenda diz *o que* há nelas. Trazer a lista do dia para aqui era
 * repetir no mesmo ecrã a próxima sessão, que já está logo acima.
 *
 * **O mês é dele.** Vive em estado próprio, e não no ecrã inicial: navegar para Outubro para ver
 * o que vem aí é uma pergunta que se faz ao calendário, e não ao ecrã — e o ecrã não tinha mais
 * nada que fazer com esse estado.
 *
 * O dia escolhido (`selectedDate`) é hoje, e não a data de uma sessão: é um calendário de parede,
 * e o que ele marca por omissão é onde estamos. O ponto dos dias com sessão é o acento da app,
 * como o dia escolhido no ecrã das Sessões.
 *
 * **É o cartão mais caro do ecrã inicial**, e por isso o que leva menos folga: 16 px de margem, e
 * não os 20 dos outros. A entrada do ecrã inicial no README tem as contas que dizem por que é que
 * a Home cabe (ou não) sem deslizar.
 */
export function AgendaCard({ markedDates, selectedDate, onPressDay, style, ...rest }: AgendaCardProps) {
  const theme = useTheme();
  const [month, setMonth] = useState(() => new Date());

  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
      {...rest}>
      <CalendarMonth
        month={month}
        onChangeMonth={setMonth}
        markedDates={markedDates}
        selectedDate={selectedDate}
        onSelectDate={onPressDay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});
