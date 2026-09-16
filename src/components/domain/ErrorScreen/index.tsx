import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { IconSize, Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';

export interface ErrorScreenProps {
  /** O erro apanhado. A mensagem só aparece em desenvolvimento (ver abaixo). */
  error?: unknown;
  onRetry: () => void;
}

/** A mensagem técnica do erro, quando existe (um `throw 'x'` também chega aqui). */
function errorDetail(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof Error) return error.message || error.name;
  return String(error);
}

/**
 * O ecrã que substitui o que rebentou.
 *
 * Existe porque uma app sem isto **fecha**: uma exceção a desenhar um ecrã, em produção, termina o
 * processo e a pessoa não fica com nada nas mãos - nem um aviso. Com o limite (ver
 * `src/app/_layout.tsx`), o ecrã que falhou dá lugar a isto e a pessoa pode tentar outra vez.
 *
 * **A mensagem do erro só aparece em desenvolvimento.** Em produção não serve de nada a quem está a
 * usar a app (é uma stack trace para ninguém) e pode conter dados internos; o sítio dela é o serviço
 * de erros.
 */
export function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const theme = useTheme();
  const i18n = useI18n();
  const detail = __DEV__ ? errorDetail(error) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.iconBox, { backgroundColor: theme.dangerSoft }]}>
          <Ionicons name="alert-circle-outline" size={IconSize.state} color={theme.danger} />
        </View>

        <ThemedText type="subtitle" style={styles.title}>
          {i18n.common.errorTitle}
        </ThemedText>
        <ThemedText themeColor="textMuted" style={styles.body}>
          {i18n.common.errorBody}
        </ThemedText>

        <Button label={i18n.common.tryAgain} variant="primary" onPress={onRetry} style={styles.button} />

        {detail ? (
          <ThemedText type="small" themeColor="textMuted" style={styles.detail}>
            {detail}
          </ThemedText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingBottom: 120,
    gap: Spacing.two,
  },
  iconBox: {
    width: Spacing.six * 2,
    height: Spacing.six * 2,
    borderRadius: Spacing.six * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.three,
  },
  // O detalhe técnico fica no fim e em cinzento: em desenvolvimento é o que se lê primeiro; para
  // quem só quer voltar atrás, não estorva.
  detail: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
});
