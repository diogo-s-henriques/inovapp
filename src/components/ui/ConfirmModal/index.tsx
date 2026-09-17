import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, StyleSheet, View, type ModalProps } from 'react-native';

import { IconSize, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/ui/ThemedText';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

/**
 * O peso da decisão que o modal está a pedir: `danger` pinta o ícone e o botão de confirmar a
 * vermelho, para o que não se desfaz (apagar a conta) não parecer a mesma coisa que terminar sessão.
 */
export type ConfirmModalTone = 'default' | 'danger';

export interface ConfirmModalProps extends Pick<ModalProps, 'visible' | 'onRequestClose'> {
  title: string;
  /**
   * O que se perde (ou se ganha) ao confirmar. **Opcional**, e a caixa não fica com um espaço
   * vazio quando não o tem: uma pergunta que já se explica sozinha não precisa de uma linha por
   * baixo a repeti-la - foi o que aconteceu ao "Terminar sessão?", que dizia "Vais precisar de
   * entrar outra vez com o teu email institucional." a quem já sabe disso.
   */
  description?: string;
  /**
   * O ícone do topo - **o que a caixa está a pedir**, e não um símbolo genérico.
   *
   * Era um ponto de interrogação fixo para as quatro confirmações da app, e o mesmo "?" tanto
   * anunciava "Terminar sessão?" como "Apagar conta?": a única coisa que o desenhava era a
   * pergunta, e a pergunta já está escrita por baixo dele. Quem chama passa o ícone da ação
   * (`log-out-outline`, `trash-outline`, `ban-outline`), e é ele que diz de que se trata antes de
   * alguém ler uma palavra.
   */
  icon: IoniconsName;
  confirmLabel: string;
  cancelLabel: string;
  tone?: ConfirmModalTone;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal genérico de confirmação, com ação de cancelar e de confirmar.
 *
 * A forma: um cartão branco sobre o escurecido do ecrã, com o ícone da ação num círculo suave, a
 * pergunta, o que ela custa (quando tem o que dizer) e as duas saídas lado a lado - **cancelar à
 * esquerda, confirmar à direita**, na ordem em que se lê e na ordem a que se chega com o polegar.
 * A cor do círculo e do botão de confirmar é do `tone`, não do ecrã: as quatro confirmações da app
 * são o mesmo gesto, e é a cor que diz quais delas não se desfazem.
 *
 * O `description` é opcional e o `icon` é obrigatório, e as duas coisas no mesmo sentido: uma caixa
 * de confirmação deve dizer **o que vai acontecer** e não gastar linhas a repetir a pergunta. Um
 * ícone obrigatório é o que impede o regresso do "?" - quem escreve a próxima confirmação tem de
 * dizer, ali mesmo, o que é que ela pede.
 */
export function ConfirmModal({
  visible,
  onRequestClose,
  title,
  description,
  icon,
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
      {/* O `accessibilityViewIsModal` mantém o leitor de ecrã dentro da caixa enquanto ela está
          aberta: sem isto, deslizar para o lado continuava a percorrer o ecrã que está por trás -
          o perfil, o formulário - e uma decisão a meio podia ouvir-se pelas costas. */}
      <View style={styles.backdrop}>
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: danger ? theme.dangerSoft : theme.primarySoft }]}>
            <Ionicons name={icon} size={IconSize.state} color={danger ? theme.danger : theme.primary} />
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {description ? (
            <ThemedText type="body" themeColor="textMuted" style={styles.description}>
              {description}
            </ThemedText>
          ) : null}

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
