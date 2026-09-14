import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { PartnersMarquee } from '@/components/domain/PartnersMarquee';
import { Link } from 'expo-router';
import { signIn, getAuthErrorMessage } from '@/auth/actions';

// Ecrã de entrada; só aceita emails institucionais (ver getAccountRole em constants/auth.ts).
export default function LoginScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Versão reduzida do logótipo (331x72), do tamanho a que é desenhado aqui (120x24 pt a 3x):
  // o ficheiro de origem tem 1898x413 px, o que obrigava a descodificar 3 MB de bitmap para
  // mostrar uma miniatura — era isso que fazia o logótipo aparecer com atraso.
  const logo = require('../../assets/images/logo_dark.png');

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password, remember);
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
          {i18n.auth.welcomeTitle}
        </ThemedText>
        <ThemedText type="body" themeColor="textMuted" style={styles.subtitle}>
          {i18n.auth.welcomeSubtitle}
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
          <TextField label={i18n.auth.passwordLabel} value={password} onChangeText={setPassword} secureTextEntry />
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
            label={submitting ? i18n.auth.signingIn : i18n.auth.signIn}
            variant="primary"
            onPress={handleSubmit}
            disabled={submitting || !email || !password}
          />
        </View>

        <View style={styles.footerRow}>
          <ThemedText type="body" themeColor="textMuted">
            {i18n.auth.noAccount}
          </ThemedText>
          <Link href="/create-account" asChild>
            <Button label={i18n.auth.createAccount} variant="link" />
          </Link>
        </View>
      </View>

      <PartnersMarquee />
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
