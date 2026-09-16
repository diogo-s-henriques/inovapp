import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View, type ModalProps } from 'react-native';

import { IconSize, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * O peso da decisão que o modal está a pedir: `danger` pinta o ícone e o botão de confirmar a
 * vermelho, para o que não se desfaz (apagar a conta) não parecer a mesma coisa que terminar sessão.
 */
export type ConfirmModalTone = 'default' | 'danger';

export interface ConfirmModalProps extends Pick<ModalProps, 'visible' | 'onRequestClose'> {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmModalTone;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal genérico de confirmação, com ação de cancelar e de confirmar. */
export function ConfirmModal({
  visible,
  onRequestClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const theme = useTheme();
  const danger = tone === 'danger';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: danger ? theme.dangerSoft : theme.primarySoft }]}>
            <Ionicons
              name={danger ? 'warning-outline' : 'help-outline'}
              size={IconSize.state}
              color={danger ? theme.danger : theme.textPrimary}
            />
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.description}>
            {description}
          </ThemedText>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText type="smallBold" themeColor="textPrimary" style={styles.buttonLabel}>
                {cancelLabel}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: danger ? theme.danger : theme.primaryDark },
                pressed && styles.buttonPressed,
              ]}>
              <ThemedText type="smallBold" themeColor="onPrimary" style={styles.buttonLabel}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    borderRadius: Spacing.five,
    padding: Spacing.six,
    gap: Spacing.two,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.six,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontSize: 15,
  },
});
