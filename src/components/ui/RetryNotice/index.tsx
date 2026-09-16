import { StyleSheet, View, type ViewProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';

export interface RetryNoticeProps extends ViewProps {
  /** O que falhou, na língua do ecrã (ex.: "Não foi possível verificar os teus pedidos de conexão."). */
  message: string;
  onRetry: () => void;
}

/**
 * O aviso de uma leitura que falhou, com uma segunda tentativa.
 *
 * Existe porque uma leitura falhada **não se vê**: uma lista que não carregou é desenhada
 * exatamente como uma lista vazia, e a app fica a afirmar que não há nada quando não sabe. Era o
 * caso das subscrições ao Firestore, que tinham um canal para os dados e nenhum para o erro.
 *
 * O vermelho é o mesmo dos outros avisos (`danger`) e o botão é um link: isto não é uma ação do
 * ecrã, é a saída de um beco — por isso não tem o peso de um botão cheio, e vive ao lado do texto
 * que explica o que aconteceu.
 */
export function RetryNotice({ message, onRetry, style, ...rest }: RetryNoticeProps) {
  const i18n = useI18n();

  return (
    <View style={[styles.row, style]} {...rest}>
      <ThemedText type="small" themeColor="danger" style={styles.message}>
        {message}
      </ThemedText>
      <Button label={i18n.common.tryAgain} variant="link" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  message: {
    flex: 1,
  },
});
