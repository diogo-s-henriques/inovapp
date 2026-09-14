import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, View, type ModalProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

/** Modal genérico de confirmação de sucesso, com ícone, texto e botão de continuar. */
export interface SuccessModalProps extends Pick<ModalProps, 'visible' | 'onRequestClose'> {
  title: string;
  description: string;
  buttonLabel: string;
  onContinue: () => void;
}

export function SuccessModal({ visible, onRequestClose, title, description, buttonLabel, onContinue }: SuccessModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.successSoft }]}>
            <Ionicons name="checkmark" size={28} color={theme.success} />
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.description}>
            {description}
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            onPress={onContinue}
            style={({ pressed }) => [styles.button, { backgroundColor: theme.primaryDark }, pressed && styles.buttonPressed]}>
            <ThemedText type="smallBold" themeColor="onPrimary" style={styles.buttonLabel}>
              {buttonLabel}
            </ThemedText>
          </Pressable>
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
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.six,
    marginTop: Spacing.four,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonLabel: {
    fontSize: 15,
  },
});
