import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/auth/store';
import { getAuthErrorMessage, refreshEmailVerified, sendVerificationEmail, signOutUser } from '@/auth/actions';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';

/**
 * O ecrã que fica entre o registo e o perfil.
 *
 * Existe porque o link de confirmação do Firebase **abre no browser e a app não é avisada**: sem
 * isto, quem se registou ficava à espera de saber o que fazer, ou entrava e o servidor recusava as
 * escritas sem dizer porquê (as regras exigem `email_verified`, ver firestore.rules).
 *
 * Não há navegação nenhuma aqui: quando o email fica confirmado, o `authStage` do layout da raiz
 * troca de ecrã sozinho - este ecrã não tem de saber para onde ir a seguir.
 */
export default function VerifyEmailScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const user = useAuthStore((state) => state.user);
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * `silent` é para a verificação automática: quando a app volta a ficar à frente - o que acontece
   * sempre que a pessoa sai do browser do email e regressa - não faz sentido dizer "ainda não",
   * porque ela não pediu nada. A resposta a um toque é que merece uma mensagem.
   */
  const check = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setChecking(true);
      setError(null);
      setNotYet(false);
    }

    try {
      const verified = await refreshEmailVerified();
      if (!verified && !silent) setNotYet(true);
    } catch (err) {
      if (!silent) setError(getAuthErrorMessage(err));
    } finally {
      if (!silent) setChecking(false);
    }
  }, []);

  // Voltar do email e a app não dizer nada era o pior dos dois casos: a pessoa confirma e fica com
  // um botão à espera de ser carregado, sem saber se o link funcionou.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check({ silent: true });
    });

    return () => subscription.remove();
  }, [check]);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    setError(null);
    setNotYet(false);

    try {
      await sendVerificationEmail();
      setResent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Logo />
        <LanguageSwitcher />
      </View>

      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {i18n.emailVerification.title}
        </ThemedText>
        <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
          {i18n.emailVerification.description(user?.email ?? '')}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {i18n.emailVerification.hint}
        </ThemedText>

        {notYet && (
          <ThemedText type="body" themeColor="warning" style={styles.message}>
            {i18n.emailVerification.notYet}
          </ThemedText>
        )}

        {resent && (
          <ThemedText type="body" themeColor="success" style={styles.message}>
            {i18n.emailVerification.resent}
          </ThemedText>
        )}

        {error && (
          <ThemedText type="body" themeColor="danger" style={styles.message}>
            {error}
          </ThemedText>
        )}

        <View style={styles.actions}>
          <Button
            label={checking ? i18n.emailVerification.checking : i18n.emailVerification.check}
            variant="primary"
            onPress={() => check()}
            disabled={checking}
          />
          <Button
            label={resending ? i18n.emailVerification.resending : i18n.emailVerification.resend}
            variant="secondary"
            onPress={handleResend}
            disabled={resending}
          />
        </View>

        <View style={styles.footerRow}>
          <Button label={i18n.emailVerification.signOut} variant="link" onPress={() => signOutUser()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.five,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    textTransform: 'none',
  },
  subtitle: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  message: {
    marginTop: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
    marginTop: Spacing.six,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
});
