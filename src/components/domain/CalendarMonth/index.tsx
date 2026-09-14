import { useMemo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { toDateKey } from '@/lib/time';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

export interface CalendarMonthProps extends ViewProps {
  month: Date;
  onChangeMonth: (next: Date) => void;
  markedDates?: Set<string>;
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  /** 'YYYY-MM-DD' — dias antes desta data ficam desativados. */
  minDate?: string;
}

export function CalendarMonth({
  month,
  onChangeMonth,
  markedDates,
  selectedDate,
  onSelectDate,
  minDate,
  style,
  ...rest
}: CalendarMonthProps) {
  const theme = useTheme();
  const i18n = useI18n();

  // Constrói a grelha do mês: células vazias (null) antes do dia 1 e a preencher a última
  // semana, para que cada linha tenha sempre 7 colunas.
  const weeks = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const leadingBlanks = firstDay.getDay();

    const cells: (Date | null)[] = [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const result: (Date | null)[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      result.push(cells.slice(index, index + 7));
    }
    return result;
  }, [month]);

  const goToPreviousMonth = () => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goToNextMonth = () => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  return (
    <View style={style} {...rest}>
      <View style={styles.header}>
        <ThemedText type="bodyBold">
          {i18n.calendar.months[month.getMonth()]} {month.getFullYear()}
        </ThemedText>
        <View style={styles.nav}>
          <Pressable onPress={goToPreviousMonth} accessibilityRole="button" accessibilityLabel={i18n.calendar.previousMonth} hitSlop={8}>
            <Ionicons name="chevron-back" size={18} color={theme.textPrimary} />
          </Pressable>
          <Pressable onPress={goToNextMonth} accessibilityRole="button" accessibilityLabel={i18n.calendar.nextMonth} hitSlop={8}>
            <Ionicons name="chevron-forward" size={18} color={theme.textPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {i18n.calendar.weekdays.map((label, index) => (
          <ThemedText key={`weekday-${index}`} type="small" themeColor="textMuted" style={styles.cell}>
            {label}
          </ThemedText>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((date, dayIndex) => {
            if (!date) return <View key={dayIndex} style={styles.cell} />;

            const dateKey = toDateKey(date);
            const isSelected = selectedDate === dateKey;
            const isMarked = markedDates?.has(dateKey) ?? false;
            // Comparação de strings funciona porque o formato 'YYYY-MM-DD' ordena
            // alfabeticamente da mesma forma que cronologicamente.
            const isDisabled = !!minDate && dateKey < minDate;

            return (
              <Pressable
                key={dayIndex}
                onPress={() => !isDisabled && onSelectDate(dateKey)}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel={dateKey}
                style={styles.cell}>
                <View style={[styles.dayCircle, isSelected && { backgroundColor: theme.primaryDark }]}>
                  <ThemedText type="body" themeColor={isSelected ? 'onPrimary' : isDisabled ? 'textMuted' : 'textPrimary'}>
                    {date.getDate()}
                  </ThemedText>
                </View>
                <View style={[styles.dot, { backgroundColor: isMarked ? theme.primary : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  nav: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
