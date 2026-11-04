import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { IconSize, Spacing } from '@/constants/theme';
import { useLocaleStore } from '@/i18n/store';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';

export interface TimePickerFieldProps {
  label: string;
  value?: string;
  placeholder: string;
  title: string;
  cancelLabel: string;
  doneLabel: string;
  onChange: (time: string) => void;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Valor inicial do picker: a hora já escolhida ou o próximo quarto de hora. */
function initialDate(value?: string): Date {
  const date = new Date();
  const match = value?.match(/^(\d{2}):(\d{2})$/);
  if (match) {
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }

  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil(next.getMinutes() / 5) * 5);
  return next;
}

/**
 * Hora com o picker nativo do sistema (relógio no Android, roda no iOS).
 *
 * Os chips de hora de hora a hora foram substituídos: não davam minutos, escondiam as horas fora
 * de 8-21 e punham a escolha a competir com a lista de disciplinas. O picker abre no sítio onde a
 * pessoa espera e devolve sempre 'HH:mm', que é o formato guardado nas sessões.
 */
export function TimePickerField({
  label,
  value,
  placeholder,
  title,
  cancelLabel,
  doneLabel,
  onChange,
}: TimePickerFieldProps) {
  const theme = useTheme();
  const locale = useLocaleStore((state) => state.locale);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => initialDate(value));

  const handleOpen = () => {
    const next = initialDate(value);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: next,
        mode: 'time',
        is24Hour: true,
        minuteInterval: 5,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(formatTime(selected));
        },
      });
      return;
    }

    setDraft(next);
    setOpen(true);
  };

  const handleConfirm = () => {
    onChange(formatTime(draft));
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="bodyBold">{label}</ThemedText>

      <Pressable
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ?? placeholder }}
        style={[styles.field, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Ionicons name="time-outline" size={IconSize.ui} color={theme.primary} />
        <ThemedText type="body" themeColor={value ? 'textPrimary' : 'textMuted'} style={styles.value}>
          {value ?? placeholder}
        </ThemedText>
        <Ionicons name="chevron-down-outline" size={IconSize.ui} color={theme.textMuted} />
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          />
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            <ThemedText type="bodyBold" style={styles.dialogTitle}>
              {title}
            </ThemedText>
            <DateTimePicker
              value={draft}
              mode="time"
              display="spinner"
              is24Hour
              minuteInterval={5}
              locale={locale === 'en' ? 'en-US' : 'pt-PT'}
              themeVariant="light"
              onChange={(_event, selected) => {
                if (selected) setDraft(selected);
              }}
            />
            <View style={styles.actions}>
              <Button
                label={cancelLabel}
                variant="secondary"
                tone="neutral"
                onPress={() => setOpen(false)}
                style={styles.action}
              />
              <Button
                label={doneLabel}
                variant="primary"
                tone="neutral"
                onPress={handleConfirm}
                style={styles.action}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  value: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  dialogTitle: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
