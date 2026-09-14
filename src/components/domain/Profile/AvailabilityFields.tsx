import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { MODALITY_OPTIONS, PERIOD_OPTIONS } from '@/constants/profile';
import { useI18n } from '@/hooks/use-i18n';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ThemedText } from '@/components/ui/ThemedText';

export interface AvailabilityFieldsProps {
  periods: string[];
  onChangePeriods: (next: string[]) => void;
  modality: string[];
  onChangeModality: (next: string[]) => void;
  style?: StyleProp<ViewStyle>;
}

// Campos de disponibilidade (período preferido e modalidade) usados tanto no fluxo de
// estudante como no de professor durante a configuração de perfil.
export function AvailabilityFields({ periods, onChangePeriods, modality, onChangeModality, style }: AvailabilityFieldsProps) {
  const i18n = useI18n();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.group}>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.profileFields.periodsLabel}
        </ThemedText>
        {/* multiple={false}: só é permitida uma escolha de cada vez, apesar do nome do grupo. */}
        <ChipGroup options={PERIOD_OPTIONS} selected={periods} onChange={onChangePeriods} multiple={false} />
      </View>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.profileFields.modalityLabel}
        </ThemedText>
        <ChipGroup options={MODALITY_OPTIONS} selected={modality} onChange={onChangeModality} multiple={false} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  group: {
    gap: Spacing.two,
  },
});
