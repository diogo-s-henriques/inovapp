import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getAuthErrorMessage, requestPasswordReset } from '@/auth/actions';
import { goBack } from '@/lib/navigation';
import { Button } from '@/components/ui/Button';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';

// Reposição de palavra-passe: o Firebase Auth envia o link de redefinição para o email indicado.
// A confirmação é sempre a mesma, exista ou não conta, para não permitir descobrir emails.
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
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
          {i18n.auth.forgotPasswordTitle}
        </ThemedText>
        <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
          {i18n.auth.forgotPasswordSubtitle}
        </ThemedText>

        <TextField
          label={i18n.auth.emailLabel}
          placeholder={i18n.auth.emailPlaceholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {error && (
          <ThemedText type="body" themeColor="danger" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <View style={styles.submit}>
          <Button
            label={submitting ? i18n.auth.sendingResetLink : i18n.auth.sendResetLink}
            variant="primary"
            onPress={handleSubmit}
            disabled={submitting || !email}
          />
        </View>

        <View style={styles.footerRow}>
          <Link href="/login" asChild>
            <Button label={i18n.auth.backToSignIn} variant="link" />
          </Link>
        </View>
      </View>

      <SuccessModal
        visible={sent}
        title={i18n.auth.resetLinkSentTitle}
        description={i18n.auth.resetLinkSentDescription(email.trim())}
        buttonLabel={i18n.common.continue}
        onContinue={() => goBack(router, '/login')}
      />
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
    marginBottom: Spacing.six,
  },
  error: {
    marginTop: Spacing.three,
  },
  submit: {
    marginTop: Spacing.five,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
});
