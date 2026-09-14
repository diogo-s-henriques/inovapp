import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { Link } from 'expo-router';
import { signUp, getAuthErrorMessage } from '@/auth/actions';
import { PASSWORD_REQUIREMENTS_REGEX } from '@/constants/auth';

export default function CreateAccountScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logo = require('../../assets/logo_dark.png');

  const handleSubmit = async () => {
    setError(null);

    // Validação local antes de chamar o Firebase Auth, para não gastar um pedido em vão.
    if (!PASSWORD_REQUIREMENTS_REGEX.test(password)) {
      setError(i18n.auth.passwordRequirements);
      return;
    }

    if (password !== confirmPassword) {
      setError(i18n.auth.passwordsDontMatch);
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email, password);
      setAccountCreated(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <LanguageSwitcher />
      </View>

      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          {i18n.auth.createAccountTitle}
        </ThemedText>
        <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
          {i18n.auth.createAccountSubtitle}
        </ThemedText>

        <View style={styles.form}>
          <TextField
            label={i18n.auth.emailLabel}
            placeholder={i18n.auth.emailPlaceholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View>
            <TextField label={i18n.auth.passwordLabel} value={password} onChangeText={setPassword} secureTextEntry />
            <ThemedText type="small" themeColor="textMuted" style={styles.passwordHint}>
              {i18n.auth.passwordRequirements}
            </ThemedText>
          </View>
          <TextField
            label={i18n.auth.confirmPasswordLabel}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.row}>
          <Checkbox checked={remember} onChange={setRemember} label={i18n.auth.rememberLabel} />
          <Link href="/forgot-password" asChild>
            <Button label={i18n.auth.forgotPassword} variant="link" />
          </Link>
        </View>

        {error && (
          <ThemedText type="body" themeColor="danger" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <View style={styles.submit}>
          <Button
            label={submitting ? i18n.auth.creatingAccount : i18n.auth.createAccount}
            variant="primary"
            onPress={handleSubmit}
            disabled={submitting || !email || !password || !confirmPassword}
          />
        </View>

        <View style={styles.footerRow}>
          <ThemedText type="body" themeColor="textMuted">
            {i18n.auth.alreadyHaveAccount}
          </ThemedText>
          <Link href="/login" asChild>
            <Button label={i18n.auth.signIn} variant="link" />
          </Link>
        </View>
      </View>

      <SuccessModal
        visible={accountCreated}
        title={i18n.accountCreated.title}
        description={i18n.accountCreated.description}
        buttonLabel={i18n.accountCreated.continueButton}
        onContinue={() => setAccountCreated(false)}
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
  logo: {
    height: 24,
    width: 120,
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
  form: {
    gap: Spacing.five,
  },
  passwordHint: {
    marginTop: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
  },
  error: {
    marginTop: Spacing.three,
  },
  submit: {
    marginTop: Spacing.six,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
});
