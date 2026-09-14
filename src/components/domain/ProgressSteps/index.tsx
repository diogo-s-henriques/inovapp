import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ProgressStepsProps extends ViewProps {
  steps: number;
  currentStep: number;
}

/** Indicador de progresso em segmentos, usado em fluxos com vários passos (ex.: configuração de perfil). */
export function ProgressSteps({ steps, currentStep, style, ...rest }: ProgressStepsProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, style]} {...rest}>
      {Array.from({ length: steps }).map((_, index) => (
        <View
          key={index}
          style={[styles.segment, { backgroundColor: index < currentStep ? theme.primary : theme.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
});
