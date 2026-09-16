/**
 * Testes do ecrã `verify-email`.
 *
 * É o ecrã que fica entre o registo e o resto da app, e o que se fixa aqui é sobretudo a
 * **diferença entre "confirmei" e "ainda não"**: o link abre no browser, a app só sabe do que
 * aconteceu quando pergunta. Sem a resposta certa, quem já confirmou fica preso num ecrã que não
 * diz nada, e quem não confirmou é deixado entrar para depois o servidor recusar as escritas.
 *
 * As ações do `src/auth/actions.ts` estão substituídas: falar com o Firebase Auth num teste de
 * render não traria nada (é o `tests/data/` que o exercita a sério, contra o emulador).
 */
import { fireEvent, render } from '@testing-library/react-native';

import { getAuthErrorMessage, refreshEmailVerified, sendVerificationEmail, signOutUser } from '@/auth/actions';
import { useAuthStore } from '@/auth/store';
import VerifyEmailScreen from '@/app/verify-email';
import { en } from '@/i18n/en';
import { pt } from '@/i18n/pt';
import { useLocaleStore } from '@/i18n/store';

jest.mock('@/auth/actions', () => ({
  refreshEmailVerified: jest.fn(),
  sendVerificationEmail: jest.fn(),
  signOutUser: jest.fn(),
  getAuthErrorMessage: jest.fn(() => 'mensagem de erro'),
}));

const EMAIL = 'aluno.a@alunos.iseclisboa.pt';

beforeEach(() => {
  jest.clearAllMocks();
  useLocaleStore.getState().setLocale('pt');
  useAuthStore.setState({
    initializing: false,
    profileCompleted: null,
    user: { uid: 'u1', email: EMAIL, emailVerified: false },
  });
});

describe('<VerifyEmailScreen />', () => {
  it('diz para que email foi o link', async () => {
    const { getByText } = await render(<VerifyEmailScreen />);

    expect(getByText(pt.emailVerification.title)).toBeTruthy();
    expect(getByText(pt.emailVerification.description(EMAIL))).toBeTruthy();
  });

  it('quem já confirmou não leva com um "ainda não"', async () => {
    (refreshEmailVerified as jest.Mock).mockResolvedValue(true);
    const { getByLabelText, queryByText } = await render(<VerifyEmailScreen />);

    await fireEvent.press(getByLabelText(pt.emailVerification.check));

    expect(refreshEmailVerified).toHaveBeenCalledTimes(1);
    expect(queryByText(pt.emailVerification.notYet)).toBeNull();
  });

  it('quem ainda não confirmou é avisado, em vez de ficar à espera', async () => {
    (refreshEmailVerified as jest.Mock).mockResolvedValue(false);
    const { getByLabelText, queryByText } = await render(<VerifyEmailScreen />);

    await fireEvent.press(getByLabelText(pt.emailVerification.check));

    expect(queryByText(pt.emailVerification.notYet)).toBeTruthy();
  });

  it('uma falha a verificar aparece como erro, e não como "ainda não confirmado"', async () => {
    // São coisas diferentes e a diferença importa: "não confirmaste" manda a pessoa ao email,
    // "não consegui verificar" (rede em baixo, por exemplo) não manda a lado nenhum.
    (refreshEmailVerified as jest.Mock).mockRejectedValue(new Error('sem rede'));
    const { getByLabelText, getByText, queryByText } = await render(<VerifyEmailScreen />);

    await fireEvent.press(getByLabelText(pt.emailVerification.check));

    expect(getByText('mensagem de erro')).toBeTruthy();
    expect(queryByText(pt.emailVerification.notYet)).toBeNull();
    expect(getAuthErrorMessage).toHaveBeenCalled();
  });

  it('volta a pedir o email e diz que o fez', async () => {
    (sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
    const { getByLabelText, getByText } = await render(<VerifyEmailScreen />);

    await fireEvent.press(getByLabelText(pt.emailVerification.resend));

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(getByText(pt.emailVerification.resent)).toBeTruthy();
  });

  it('um reenvio recusado (demasiados pedidos) mostra o erro e não a confirmação', async () => {
    (sendVerificationEmail as jest.Mock).mockRejectedValue(new Error('too many requests'));
    const { getByLabelText, getByText, queryByText } = await render(<VerifyEmailScreen />);

    await fireEvent.press(getByLabelText(pt.emailVerification.resend));

    expect(getByText('mensagem de erro')).toBeTruthy();
    expect(queryByText(pt.emailVerification.resent)).toBeNull();
  });

  it('deixa sair para outra conta (é a única saída de quem se enganou no email)', async () => {
    const { getByLabelText } = await render(<VerifyEmailScreen />);

    await fireEvent.press(getByLabelText(pt.emailVerification.signOut));

    expect(signOutUser).toHaveBeenCalledTimes(1);
  });

  it('acompanha o idioma escolhido', async () => {
    useLocaleStore.getState().setLocale('en');
    const { getByText } = await render(<VerifyEmailScreen />);

    expect(getByText(en.emailVerification.title)).toBeTruthy();
  });
});
