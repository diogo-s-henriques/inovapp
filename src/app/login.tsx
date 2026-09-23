import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/hooks/use-i18n';
import { useTheme } from '@/hooks/use-theme';
import { getRememberedEmail } from '@/lib/remembered-email';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { keyboardDismissProps } from '@/components/ui/KeyboardDismiss';
import { TextField } from '@/components/ui/TextField';
import { ThemedText } from '@/components/ui/ThemedText';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { PartnersMarquee } from '@/components/domain/PartnersMarquee';
import { PoweredBy } from '@/components/domain/PoweredBy';
import { Link } from 'expo-router';
import { signIn, getAuthErrorMessage } from '@/auth/actions';
import { useAuthStore } from '@/auth/store';

/**
 * Altura da faixa de parceiros neste ecrã.
 *
 * É passada daqui (e não deixada no valor por omissão do componente) porque é uma decisão de
 * **desenho deste ecrã** - como o `height` do crédito logo acima -, e quem lê o ecrã vê os dois
 * tamanhos lado a lado. A largura sai das proporções da imagem; a velocidade não muda com isto.
 */
const PARTNERS_STRIP_HEIGHT = 72;

/**
 * Altura do logótipo da INOVEDU no crédito - **a mesma do logótipo da INOVAPP** no cabeçalho
 * (`Logo`, 24 pt).
 *
 * Não é um valor escolhido a esmo: é o que faz os dois lerem-se como marcas do mesmo nível, em vez
 * de a assinatura do parceiro aparecer como um rodapé secundário. Se a altura do `Logo` mudar, é
 * este número que tem de acompanhá-la.
 */
const POWERED_BY_HEIGHT = 24;

// Ecrã de entrada. O registo é aberto a qualquer email (ver getAccountRole em constants/auth.ts):
// o que o domínio ainda decide é o **papel**, não a entrada.
export default function LoginScreen() {
  const theme = useTheme();
  const i18n = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * A entrada já foi aceite e a app está à espera da resposta sobre o perfil.
   *
   * O `signIn` do Firebase resolve antes disso - o que falta é a leitura do documento do perfil -
   * e é aqui que este ecrã fica nesse intervalo (ver `signing-in` em src/lib/auth-gate.ts). Sem
   * isto, o botão voltava a dizer "Entrar" e a parecer pronto para outro toque enquanto a app
   * ainda estava a decidir para onde ir.
   */
  const user = useAuthStore((state) => state.user);
  const profileCompleted = useAuthStore((state) => state.profileCompleted);
  const signingIn = !!user && profileCompleted === null;
  const busy = submitting || signingIn;

  // Preenche o email da última entrada feita com "Lembrar-me". Só o email: a sessão em si é apagada
  // pelo "Sair", de propósito - ver src/lib/remembered-email.ts.
  useEffect(() => {
    let cancelled = false;
    getRememberedEmail().then((saved) => {
      if (cancelled || !saved) return;
      setEmail(saved);
      // Se havia um email guardado, foi porque o checkbox estava marcado quando se entrou.
      setRemember(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async () => {
    // O teclado fecha aqui, e não quando o ecrã muda. Quem acabou de carregar em "Entrar" já não
    // tem nada para escrever, e deixá-lo a fechar-se no instante em que a Home começa a aparecer
    // punha a janela a redimensionar por baixo de uma transição - um tremor no ecrã que não tem
    // nada a ver com a transição em si. Aqui tem a espera do "A entrar" para acabar em paz.
    Keyboard.dismiss();
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
    // Tocar fora de um campo fecha o teclado. Fica aqui, e não na raiz da app, porque um ecrã sem
    // lista não tem gesto nenhum a que o toque faça falta (ver components/ui/KeyboardDismiss).
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      {...keyboardDismissProps}>
      <View style={styles.header}>
        <Logo />
        <LanguageSwitcher />
      </View>

      <View style={styles.content}>
        {/* As três folgas do bloco são proporcionais (3:2:1) - ver os estilos. */}
        <View style={styles.slackAboveForm} />

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
            label={busy ? i18n.auth.signingIn : i18n.auth.signIn}
            variant="primary"
            onPress={handleSubmit}
            disabled={busy || !email || !password}
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

        {/* O crédito da INOVEDU vive dentro do bloco do formulário e desce até **2/3 do vão** que
            vai do "Criar conta" à faixa - medido a descer desde o "Criar conta", que é o que o
            afasta da linha de cima sem o colar à faixa. Quem o põe lá são as folgas de `flexGrow`
            (ver os estilos), e não uma margem. A folga acima dele é a **mesma** que está entre o
            logótipo e o "Bem-vindo". */}
        <View style={styles.slackAboveCredit} />
        <PoweredBy height={POWERED_BY_HEIGHT} />
        <View style={styles.slackBelowCredit} />
      </View>

      <PartnersMarquee height={PARTNERS_STRIP_HEIGHT} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // A margem lateral saiu daqui para o cabeçalho e o formulário: a faixa dos parceiros é filha
  // deste ecrã e tem de ir de ponta a ponta - com o `padding` no contentor, ficava com uma moldura
  // da cor do fundo dos dois lados.
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
  },
  // Sem `justifyContent`: quem distribui o espaço são as três folgas abaixo, todas com `flexGrow`
  // (o `justifyContent` só olha para o que sobra, e aqui não sobra nada).
  content: {
    flex: 1,
    paddingHorizontal: Spacing.five,
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
  // As três linhas de baixo - "Lembrar-me / Esqueceu", o botão, e o "Criar conta" - levam a
  // **mesma** folga em cima, e a mesma dos campos do formulário (`form.gap`): 24. Antes eram 20,
  // 32 e 16, três números escolhidos um a um, e o resultado lia-se como três blocos soltos em vez
  // de uma pilha. A folga igual é o que faz a leitura descer em passo certo.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.five,
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
    gap: Spacing.one,
    marginTop: Spacing.five,
  },
  // As três folgas do bloco, todas em `flexGrow` e nenhuma em píxeis: em píxeis, a proporção durava
  // um ecrã e desfazia-se no seguinte ("2/3 de 40" só é 2/3 naquele ecrã).
  //
  // 3 + 3 + 1 = 7 partes da sobra, e cada uma tem um dono:
  //   - `slackAboveForm` (3) e `slackAboveCredit` (3) são **iguais**, e é isso que faz o vão entre
  //     o logótipo e o "Bem-vindo" medir o mesmo que o vão entre o "Criar conta" e o crédito da
  //     INOVEDU. Como as duas folgas vivem no mesmo contentor, partes iguais dão píxeis iguais em
  //     qualquer ecrã - com píxeis fixos, o que é igual num ecrã não é no seguinte;
  //   - `slackBelowCredit` (1) fecha o par de baixo a 3:1, e é isso que assenta o crédito a cerca
  //     de **2/3 do vão** que desce do "Criar conta" até à faixa.
  slackAboveForm: {
    flexGrow: 3,
  },
  slackAboveCredit: {
    flexGrow: 3,
  },
  slackBelowCredit: {
    flexGrow: 1,
  },
});
