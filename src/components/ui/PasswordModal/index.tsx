import { useState } from 'react';
import { Modal, StyleSheet, View, type ModalProps } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';

/**
 * Modal que pede a palavra-passe para confirmar uma ação que não se desfaz.
 *
 * Existe como peça própria (e não como um campo a mais dentro do `ConfirmModal`) porque responde a
 * uma pergunta diferente: o `ConfirmModal` pergunta *se* a pessoa quer, e este pergunta *quem* é —
 * o Firebase recusa apagar a conta a uma sessão antiga, e é a palavra-passe que a torna recente
 * outra vez. São dois passos de propósito: quem chega aqui já disse que sim uma vez.
 *
 * A palavra-passe vive aqui dentro, e não em quem mostra o modal: é uma coisa que se escreve e se
 * gasta num segundo, e quem a guarda no ecrã das Definições ficava com ela em memória depois de a
 * ação acabar. O `error` e o `workingLabel` vêm de fora porque só quem chamou sabe o que correu mal
 * e o que está a acontecer enquanto isso.
 */
export interface PasswordModalProps extends Pick<ModalProps, 'visible' | 'onRequestClose'> {
  title: string;
  description: string;
  passwordLabel: string;
  confirmLabel: string;
  /** O que o botão diz enquanto a ação corre ("A apagar..."). */
  workingLabel: string;
  cancelLabel: string;
  /** Mensagem da tentativa anterior (palavra-passe errada, por exemplo). */
  error?: string | null;
  submitting?: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export function PasswordModal({
  visible,
  onRequestClose,
  title,
  description,
  passwordLabel,
  confirmLabel,
  workingLabel,
  cancelLabel,
  error = null,
  submitting = false,
  onConfirm,
  onCancel,
}: PasswordModalProps) {
  const theme = useTheme();
  const [password, setPassword] = useState('');

  /**
   * Fechar sem confirmar passa sempre por aqui.
   *
   * A palavra-passe é escrita, usada e esquecida — e "esquecida" tem de querer dizer alguma coisa: o
   * campo é limpo ao fechar, para o que ficou escrito não continuar em memória numa coisa que já
   * acabou (a confirmação errada, a palavra-passe ao lado, a pessoa que pega no telemóvel a seguir).
   * Quem confirmou e viu o erro **não** perde o que escreveu: está a corrigir uma letra, e apagá-la
   * seria obrigar a escrever tudo outra vez.
   */
  const close = () => {
    setPassword('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="subtitle" themeColor="danger">
              !
            </ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          <ThemedText type="body" themeColor="textMuted" style={styles.description}>
            {description}
          </ThemedText>

          <View style={styles.field}>
            <TextField
              label={passwordLabel}
              // O rótulo visível já está por cima do campo, mas um leitor de ecrã não o lê: sem
              // isto, o campo é anunciado como "campo de texto" e nada mais.
              accessibilityLabel={passwordLabel}
              variant="filled"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              // O teclado do telemóvel traz um "feito" que faz o mesmo que o botão — pedir a mesma
              // coisa por dois caminhos e só um deles funcionar é o tipo de coisa que se descobre
              // por acidente.
              onSubmitEditing={() => {
                if (password.length > 0 && !submitting) onConfirm(password);
              }}
            />
          </View>

          {error !== null && (
            <ThemedText type="small" themeColor="danger" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              variant="secondary"
              tone="neutral"
              disabled={submitting}
              style={styles.action}
              onPress={close}
            />
            <Button
              label={submitting ? workingLabel : confirmLabel}
              variant="dangerStrong"
              disabled={submitting || password.length === 0}
              style={styles.action}
              onPress={() => onConfirm(password)}
            />
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
  field: {
    alignSelf: 'stretch',
    marginTop: Spacing.four,
  },
  error: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  action: {
    flex: 1,
  },
});
